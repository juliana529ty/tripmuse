"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";
import PlannerForm from "@/components/PlannerForm";
import RecentTrips from "@/components/RecentTrips";
import ResultCard from "@/components/ResultCard";
import SkeletonCard from "@/components/SkeletonCard";
import { supabase } from "@/lib/supabase";

type RecentTrip = {
  destination: string;
  days: string | number;
  budget: string | number;
};

export default function Home() {
  const [user, setUser] = useState<any>(null);

  const [count, setCount] = useState(0);
  const MAX_FREE = 3;

  const [destination, setDestination] = useState("");
  const [days, setDays] = useState("");
  const [budget, setBudget] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);
  const [loadingText, setLoadingText] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const loadTrips = async () => {
      if (!user?.id) {
        setRecentTrips([]);
        return;
      }

      const { data, error } = await supabase
        .from("trip_records")
        .select("destination, days, budget")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.log("Failed to load recent trips:", error);
        return;
      }

      const formattedTrips: RecentTrip[] = (data || []).map((trip) => ({
        destination: String(trip.destination || ""),
        days: trip.days ?? "",
        budget: trip.budget ?? "",
      }));

      setRecentTrips(formattedTrips);
    };

    loadTrips();
  }, [user?.id]);

  const generatePlan = async () => {
    if (!user) {
      alert("请先登录后再生成旅行计划");
      return;
    }

    if (!destination.trim() || !days.trim() || !budget.trim()) {
      alert("请填写目的地、天数和预算");
      return;
    }

    if (count >= MAX_FREE) {
      alert("免费次数已用完");
      return;
    }

    setLoading(true);
    setResult(null);
    setLoadingText("正在为你设计旅行路线...");

    const prompt = `
城市：${destination}
天数：${days}
预算：${budget}
`;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok || !data.result) {
        throw new Error(data.error || "生成失败");
      }

      setResult(data.result);

      const { error } = await supabase.from("trip_records").insert({
        user_id: user.id,
        destination,
        days,
        budget,
        result: data.result,
      });

      if (error) {
        console.log("Failed to save trip:", error);
      } else {
        const newTrip: RecentTrip = {
          destination,
          days,
          budget,
        };

        setRecentTrips((previousTrips) =>
          [newTrip, ...previousTrips].slice(0, 5)
        );
      }

      setCount((currentCount) => currentCount + 1);
    } catch (error) {
      console.log("Generate plan error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "生成旅行计划失败，请稍后再试"
      );
    } finally {
      setLoading(false);
      setLoadingText("");
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-950">
      <Navbar />

      <main>
        <Hero />

        <section
          id="planner"
          className="scroll-mt-24 border-y border-gray-200 bg-white px-5 py-16 md:px-8 md:py-20"
        >
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-500">
                Your next journey
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-950 md:text-4xl">
                Where do you want to go?
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-gray-500 md:text-base">
                Tell TripMuse the basics. Your AI travel companion will turn
                them into a personalized itinerary.
              </p>
            </div>

            <div className="rounded-[2rem] border border-gray-200 bg-[#fafafa] p-3 shadow-xl shadow-gray-200/50 sm:p-6 md:p-8">
              <PlannerForm
                destination={destination}
                days={days}
                budget={budget}
                loading={loading}
                loadingText={loadingText}
                onDestinationChange={setDestination}
                onDaysChange={setDays}
                onBudgetChange={setBudget}
                onGenerate={generatePlan}
              />
            </div>
          </div>
        </section>

        <section className="px-5 py-14 md:px-8 md:py-20">
          <div className="mx-auto max-w-5xl">
            {loading && <SkeletonCard />}

            {!loading && (
              <ResultCard
                result={result}
                count={count}
                maxFree={MAX_FREE}
              />
            )}
          </div>
        </section>

        <section
          id="features"
          className="border-y border-gray-200 bg-white px-5 py-16 md:px-8 md:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-500">
                Built for curious travelers
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-950 md:text-4xl">
                More than another booking website.
              </h2>

              <p className="mt-4 leading-7 text-gray-500">
                TripMuse focuses on inspiration, planning, collecting and
                sharing — helping every journey feel personal before it even
                begins.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              <article className="rounded-3xl border border-gray-200 bg-[#fafafa] p-7 transition hover:-translate-y-1 hover:shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-100 text-2xl">
                  ✨
                </div>

                <h3 className="mt-6 text-lg font-bold text-gray-950">
                  Personal AI planning
                </h3>

                <p className="mt-3 text-sm leading-7 text-gray-500">
                  Generate a route based on your destination, schedule and
                  budget instead of reading dozens of generic guides.
                </p>
              </article>

              <article className="rounded-3xl border border-gray-200 bg-[#fafafa] p-7 transition hover:-translate-y-1 hover:shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-2xl">
                  📚
                </div>

                <h3 className="mt-6 text-lg font-bold text-gray-950">
                  Your travel collection
                </h3>

                <p className="mt-3 text-sm leading-7 text-gray-500">
                  Save ideas, revisit favorite journeys and gradually build a
                  personal library of places you want to experience.
                </p>
              </article>

              <article className="rounded-3xl border border-gray-200 bg-[#fafafa] p-7 transition hover:-translate-y-1 hover:shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
                  🎟️
                </div>

                <h3 className="mt-6 text-lg font-bold text-gray-950">
                  Made to save and share
                </h3>

                <p className="mt-3 text-sm leading-7 text-gray-500">
                  Turn an itinerary into a beautiful share page — with
                  printable ticket-journal designs planned for a future
                  release.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="px-5 py-16 md:px-8 md:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-500">
                  Continue exploring
                </p>

                <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-950">
                  Recent trips
                </h2>
              </div>

              {user && (
                <a
                  href="/dashboard"
                  className="text-sm font-semibold text-gray-600 transition hover:text-gray-950"
                >
                  View all trips →
                </a>
              )}
            </div>

            <RecentTrips
              trips={recentTrips}
              onSelect={(trip: RecentTrip) => {
                setDestination(String(trip.destination));
                setDays(String(trip.days));
                setBudget(String(trip.budget));

                document
                  .getElementById("planner")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  });
              }}
            />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}