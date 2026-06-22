"use client";

import { useEffect, useRef, useState } from "react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";

type Trip = {
  id: string;
  user_id: string;
  destination: string;
  days: string | number;
  budget: string | number;
  result: any;
  favorite: boolean;
  public: boolean;
  created_at: string;
};

type FilterType = "all" | "favorite" | "public";
type UserPlan = "free" | "pro";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [plan, setPlan] = useState<UserPlan>("free");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.log("Auth error:", authError);
        setLoading(false);
        return;
      }

      setUser(user);

      if (!user?.id) {
        setLoading(false);
        return;
      }

      const [tripsResult, profileResult] = await Promise.all([
        supabase
          .from("trip_records")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("users")
          .select("plan")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      if (tripsResult.error) {
        console.log("Failed to load trips:", tripsResult.error);
        showToast("加载行程失败，请刷新重试");
      }

      if (profileResult.error) {
        console.log("Failed to load user plan:", profileResult.error);
      }

      setTrips(tripsResult.data || []);
      setPlan(profileResult.data?.plan === "pro" ? "pro" : "free");
      setLoading(false);
    };

    loadDashboard();
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("checkout");

    if (checkoutStatus === "success") {
      showToast("🎉 支付成功，正在为你开通 TripMuse Pro");
      window.history.replaceState({}, "", "/dashboard");
    }

    if (checkoutStatus === "canceled") {
      showToast("已取消支付");
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  const showToast = (message: string) => {
    setToast(message);

    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    toastTimer.current = setTimeout(() => {
      setToast("");
    }, 1800);
  };

  const handleUpgrade = async () => {
    if (plan === "pro") {
      showToast("你已经是 TripMuse Pro 用户 ✨");
      return;
    }

    setCheckoutLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        showToast("请先登录后再升级 Pro");
        return;
      }

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "无法创建支付页面");
      }

      if (!data.url) {
        throw new Error("Stripe 没有返回支付页面地址");
      }

      window.location.assign(data.url);
    } catch (error) {
      console.log("Checkout failed:", error);
      showToast(
        error instanceof Error
          ? error.message
          : "打开支付页面失败，请稍后重试"
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  const toggleFavorite = async (trip: Trip) => {
    if (!user?.id) return;

    const newValue = !trip.favorite;

    setTrips((previousTrips) =>
      previousTrips.map((item) =>
        item.id === trip.id
          ? {
              ...item,
              favorite: newValue,
            }
          : item
      )
    );

    showToast(newValue ? "❤️ 已加入收藏" : "已取消收藏");

    const { error } = await supabase
      .from("trip_records")
      .update({
        favorite: newValue,
      })
      .eq("id", trip.id)
      .eq("user_id", user.id);

    if (error) {
      console.log("Favorite update failed:", error);

      setTrips((previousTrips) =>
        previousTrips.map((item) =>
          item.id === trip.id
            ? {
                ...item,
                favorite: trip.favorite,
              }
            : item
        )
      );

      showToast("收藏同步失败，请重试");
    }
  };

  const shareTrip = async (trip: Trip) => {
    if (!user?.id) return;

    setSharingId(trip.id);

    try {
      if (!trip.public) {
        const { error } = await supabase
          .from("trip_records")
          .update({
            public: true,
          })
          .eq("id", trip.id)
          .eq("user_id", user.id);

        if (error) {
          throw error;
        }

        setTrips((previousTrips) =>
          previousTrips.map((item) =>
            item.id === trip.id
              ? {
                  ...item,
                  public: true,
                }
              : item
          )
        );
      }

      const shareUrl = `${window.location.origin}/share/${trip.id}`;

      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast("📎 分享链接已复制");
      } catch {
        window.prompt("复制下面的分享链接：", shareUrl);
        showToast("分享链接已生成");
      }
    } catch (error) {
      console.log("Share failed:", error);
      showToast("分享失败，请稍后重试");
    } finally {
      setSharingId(null);
    }
  };

  const deleteTrip = async (trip: Trip) => {
    if (!user?.id) return;

    const confirmed = window.confirm(
      `确定要删除「${trip.destination}」这次旅行吗？`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("trip_records")
      .delete()
      .eq("id", trip.id)
      .eq("user_id", user.id);

    if (error) {
      console.log("Delete failed:", error);
      showToast("删除失败，请重试");
      return;
    }

    setTrips((previousTrips) =>
      previousTrips.filter((item) => item.id !== trip.id)
    );

    showToast("🗑 行程已删除");
  };

  const formatDate = (date: string) => {
    if (!date) return "";

    return new Date(date).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const normalizedSearch = search.trim().toLowerCase();

  const filteredTrips = trips.filter((trip) => {
    const matchesSearch = String(trip.destination || "")
      .toLowerCase()
      .includes(normalizedSearch);

    const matchesFilter =
      filter === "all" ||
      (filter === "favorite" && trip.favorite) ||
      (filter === "public" && trip.public);

    return matchesSearch && matchesFilter;
  });

  const favoriteCount = trips.filter((trip) => trip.favorite).length;
  const publicCount = trips.filter((trip) => trip.public).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <Navbar />

        <main className="flex min-h-[70vh] items-center justify-center px-5">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gray-950" />

            <p className="mt-4 text-sm text-gray-500">
              正在整理你的旅行收藏……
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <Navbar />

        <main className="flex min-h-[70vh] items-center justify-center px-5">
          <div className="w-full max-w-md rounded-[2rem] border border-gray-200 bg-white p-8 text-center shadow-xl shadow-gray-200/50">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-950 text-3xl text-white">
              🧳
            </div>

            <h1 className="mt-6 text-2xl font-bold tracking-tight text-gray-950">
              登录查看你的旅行
            </h1>

            <p className="mt-3 text-sm leading-7 text-gray-500">
              登录后可以保存 AI 行程、收藏旅行，并生成公开分享页面。
            </p>

            <a
              href="/"
              className="mt-7 inline-flex w-full items-center justify-center rounded-2xl bg-gray-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              返回首页登录
            </a>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-950">
      <Navbar />

      <main className="px-5 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-6xl space-y-8">
          <section className="relative overflow-hidden rounded-[2rem] bg-gray-950 px-6 py-8 text-white shadow-xl shadow-gray-300/50 md:px-10 md:py-10">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-500/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-pink-500/20 blur-3xl" />

            <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="User avatar"
                    className="h-16 w-16 rounded-3xl border border-white/20 object-cover shadow-lg"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-2xl backdrop-blur">
                    👋
                  </div>
                )}

                <div>
                  <p className="text-sm text-white/60">Welcome back</p>

                  <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                    {user.user_metadata?.full_name ||
                      user.user_metadata?.name ||
                      "Traveler"}
                  </h1>

                  <p className="mt-1 text-sm text-white/50">{user.email}</p>
                </div>
              </div>

              <a
                href="/#planner"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-gray-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-gray-100"
              >
                ✨ Plan a new trip
              </a>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">All trips</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">
                    {trips.length}
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                  🗺️
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Favorites</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">
                    {favoriteCount}
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-2xl">
                  ❤️
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Shared</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">
                    {publicCount}
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-2xl">
                  🌍
                </div>
              </div>
            </article>
          </section>

          <section>
            <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-500">
                  Your collection
                </p>

                <h2 className="mt-2 text-3xl font-bold tracking-tight">
                  My trips
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  保存旅行灵感，收藏想去的地方，并分享你的专属行程。
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row">
                <div className="relative w-full lg:w-72">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    🔎
                  </span>

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search destinations"
                    className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-4 focus:ring-gray-100"
                  />
                </div>

                <div className="flex rounded-2xl border border-gray-200 bg-white p-1">
                  <button
                    onClick={() => setFilter("all")}
                    className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                      filter === "all"
                        ? "bg-gray-950 text-white"
                        : "text-gray-500 hover:text-gray-950"
                    }`}
                  >
                    All
                  </button>

                  <button
                    onClick={() => setFilter("favorite")}
                    className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                      filter === "favorite"
                        ? "bg-gray-950 text-white"
                        : "text-gray-500 hover:text-gray-950"
                    }`}
                  >
                    Favorites
                  </button>

                  <button
                    onClick={() => setFilter("public")}
                    className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                      filter === "public"
                        ? "bg-gray-950 text-white"
                        : "text-gray-500 hover:text-gray-950"
                    }`}
                  >
                    Shared
                  </button>
                </div>
              </div>
            </div>

            {filteredTrips.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-100 text-3xl">
                  🧳
                </div>

                <h3 className="mt-6 text-xl font-bold">
                  {trips.length === 0
                    ? "Your next adventure starts here"
                    : "没有找到符合条件的行程"}
                </h3>

                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-gray-500">
                  {trips.length === 0
                    ? "创建你的第一份 AI 旅行计划，它会自动保存在这里。"
                    : "可以尝试更换搜索内容，或者选择其他筛选条件。"}
                </p>

                {trips.length === 0 ? (
                  <a
                    href="/#planner"
                    className="mt-7 inline-flex items-center justify-center rounded-2xl bg-gray-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                  >
                    ✨ Plan my first trip
                  </a>
                ) : (
                  <button
                    onClick={() => {
                      setSearch("");
                      setFilter("all");
                    }}
                    className="mt-7 rounded-2xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredTrips.map((trip) => (
                  <article
                    key={trip.id}
                    className="group flex min-h-[300px] flex-col overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/70"
                  >
                    <div className="relative overflow-hidden bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 p-6">
                      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/60 blur-2xl" />

                      <div className="relative flex items-start justify-between gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-2xl shadow-sm backdrop-blur">
                          📍
                        </div>

                        <button
                          onClick={() => toggleFavorite(trip)}
                          aria-label={
                            trip.favorite
                              ? "Remove from favorites"
                              : "Add to favorites"
                          }
                          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-xl shadow-sm backdrop-blur transition hover:scale-105 active:scale-95"
                        >
                          {trip.favorite ? "❤️" : "🤍"}
                        </button>
                      </div>

                      <h3 className="relative mt-7 break-words text-2xl font-bold tracking-tight text-gray-950">
                        {trip.destination}
                      </h3>

                      <div className="relative mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-gray-600 backdrop-blur">
                          🗓 {trip.days} days
                        </span>

                        <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-gray-600 backdrop-blur">
                          💰 ¥{trip.budget}
                        </span>

                        {trip.public && (
                          <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700">
                            🌍 Public
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col p-6">
                      <p className="text-xs text-gray-400">
                        Created {formatDate(trip.created_at)}
                      </p>

                      <p className="mt-4 text-sm leading-7 text-gray-500">
                        Your personalized AI itinerary for{" "}
                        <span className="font-medium text-gray-700">
                          {trip.destination}
                        </span>
                        .
                      </p>

                      <div className="mt-auto flex flex-wrap items-center gap-2 pt-6">
                        <a
                          href={`/trip/${trip.id}`}
                          className="inline-flex flex-1 items-center justify-center rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                        >
                          View trip
                        </a>

                        <button
                          onClick={() => shareTrip(trip)}
                          disabled={sharingId === trip.id}
                          className="inline-flex flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {sharingId === trip.id ? "Sharing..." : "Share"}
                        </button>

                        <button
                          onClick={() => deleteTrip(trip)}
                          aria-label="Delete trip"
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="relative overflow-hidden rounded-[2rem] border border-gray-800 bg-gray-950 p-7 text-white md:p-10">
            <div className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-pink-500/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />

            <div className="relative flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                  {plan === "pro" ? "✓ TripMuse Pro active" : "TripMuse Pro"}
                </span>

                <h2 className="mt-4 text-2xl font-bold tracking-tight md:text-3xl">
                  Turn every trip into something worth keeping.
                </h2>

                <p className="mt-3 text-sm leading-7 text-white/60">
                  无限生成、旅行票据手账、PDF 导出和未来的 AI
                  梦想城市明信片功能。
                </p>
              </div>

              <button
                type="button"
                onClick={handleUpgrade}
                disabled={checkoutLoading || plan === "pro"}
                className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-gray-950 transition hover:-translate-y-0.5 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {plan === "pro"
                  ? "✓ Pro active"
                  : checkoutLoading
                    ? "Opening checkout..."
                    : "Upgrade to Pro · $9.99/month"}
              </button>
            </div>
          </section>
        </div>
      </main>

      <Footer />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-2xl bg-gray-950 px-5 py-3 text-sm font-medium text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}