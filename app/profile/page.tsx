"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let pageIsActive = true;

    const loadUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!pageIsActive) return;

      if (error) {
        console.log("Profile auth error:", error);
      }

      setUser(user);
      setLoading(false);
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!pageIsActive) return;

      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      pageIsActive = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.log("Sign out error:", error);
      alert("退出登录失败，请稍后重试");
      setSigningOut(false);
      return;
    }

    window.location.href = "/";
  };

  const formatDate = (date?: string) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <Navbar />

        <main className="flex min-h-[70vh] items-center justify-center px-5">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-gray-200 border-t-gray-950" />

            <p className="mt-5 text-sm text-gray-500">
              正在加载你的个人资料……
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
          <section className="w-full max-w-md rounded-[2rem] border border-gray-200 bg-white p-8 text-center shadow-xl shadow-gray-200/50">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-950 text-3xl text-white">
              🔐
            </div>

            <h1 className="mt-6 text-2xl font-bold tracking-tight text-gray-950">
              请先登录
            </h1>

            <p className="mt-3 text-sm leading-7 text-gray-500">
              登录后可以查看个人资料、管理行程和访问你的旅行收藏。
            </p>

            <a
              href="/"
              className="mt-7 inline-flex w-full items-center justify-center rounded-2xl bg-gray-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              返回首页登录
            </a>
          </section>
        </main>

        <Footer />
      </div>
    );
  }

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    "Traveler";

  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture;

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-950">
      <Navbar />

      <main className="px-5 py-10 md:px-8 md:py-14">
        <div className="mx-auto max-w-4xl space-y-8">
          <section className="relative overflow-hidden rounded-[2.25rem] bg-gray-950 p-7 text-white shadow-2xl shadow-gray-300/60 md:p-10">
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-purple-500/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 left-20 h-72 w-72 rounded-full bg-pink-500/20 blur-3xl" />

            <div className="relative flex flex-col gap-7 sm:flex-row sm:items-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${fullName} avatar`}
                  className="h-24 w-24 rounded-[2rem] border border-white/20 object-cover shadow-xl"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white/10 text-4xl backdrop-blur">
                  👤
                </div>
              )}

              <div className="min-w-0">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/50">
                  TripMuse Profile
                </p>

                <h1 className="mt-3 break-words text-3xl font-bold tracking-tight md:text-4xl">
                  {fullName}
                </h1>

                <p className="mt-2 break-words text-sm text-white/60">
                  {user.email}
                </p>
              </div>
            </div>
          </section>

          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
            <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm md:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-500">
                Account
              </p>

              <h2 className="mt-3 text-2xl font-bold tracking-tight">
                Personal information
              </h2>

              <div className="mt-8 space-y-5">
                <div className="rounded-2xl border border-gray-200 bg-[#fafafa] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">
                    Display name
                  </p>

                  <p className="mt-2 break-words font-semibold text-gray-950">
                    {fullName}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-[#fafafa] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">
                    Email
                  </p>

                  <p className="mt-2 break-words font-semibold text-gray-950">
                    {user.email || "—"}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-[#fafafa] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">
                    Member since
                  </p>

                  <p className="mt-2 font-semibold text-gray-950">
                    {formatDate(user.created_at)}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-[#fafafa] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">
                    Sign-in provider
                  </p>

                  <p className="mt-2 font-semibold capitalize text-gray-950">
                    {user.app_metadata?.provider || "Google"}
                  </p>
                </div>
              </div>
            </section>

            <aside className="space-y-5">
              <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                  🗺️
                </div>

                <h2 className="mt-5 text-lg font-bold">
                  Your travel collection
                </h2>

                <p className="mt-3 text-sm leading-7 text-gray-500">
                  查看已保存的行程、收藏和公开分享页面。
                </p>

                <a
                  href="/dashboard"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-gray-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  View my trips
                </a>
              </section>

              <section className="rounded-[2rem] border border-red-100 bg-red-50/60 p-6">
                <p className="text-sm font-semibold text-red-700">
                  Account session
                </p>

                <p className="mt-2 text-sm leading-6 text-red-600/70">
                  退出后，你需要重新使用 Google 登录才能管理个人行程。
                </p>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {signingOut ? "Signing out..." : "Sign out"}
                </button>
              </section>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}