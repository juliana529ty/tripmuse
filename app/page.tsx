"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";
import PlannerForm from "@/components/PlannerForm";
import RecentTrips from "@/components/RecentTrips";
import ResultCard from "@/components/ResultCard";
import SkeletonCard from "@/components/SkeletonCard";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const MAX_FREE = 3;

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [credits, setCredits] = useState(MAX_FREE);
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState("");
  const [budget, setBudget] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [recentTrips, setRecentTrips] = useState<
    { id: string; destination?: string | null; created_at?: string | null }[]
  >([]);
  const [loadingText, setLoadingText] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const loadPlanAndTrips = async () => {
      if (!user?.id) {
        setPlan("free");
        setCredits(MAX_FREE);
        setRecentTrips([]);
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("plan, credits")
        .eq("id", user.id)
        .maybeSingle();

      setPlan(profile?.plan === "pro" ? "pro" : "free");
      setCredits(
        profile?.plan === "pro" ? -1 : profile?.credits ?? MAX_FREE
      );

      const { data: trips } = await supabase
        .from("trip_records")
        .select("id, destination, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);

      setRecentTrips(trips || []);
    };

    loadPlanAndTrips();
  }, [user?.id]);

  const generatePlan = async () => {
    if (!user) {
      alert("Please log in first.");
      return;
    }

    if (!destination.trim() || !days.trim() || !budget.trim()) {
      alert("Please enter a destination, trip length, and budget.");
      return;
    }

    if (plan !== "pro" && credits <= 0) {
      alert("You are out of free trips. Upgrade to Pro to keep planning.");
      return;
    }

    setLoading(true);
    setResult(null);
    setLoadingText("Generating your travel plan...");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          destination,
          days,
          budget,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.upgrade || data.code === "FREE_LIMIT_REACHED") {
          alert("Upgrade to Pro to unlock unlimited generation.");
        }

        throw new Error(data.error || "Generation failed.");
      }

      setResult(data.result);
      setPlan(data.plan ?? "free");
      setCredits(
        data.plan === "pro" ? -1 : data.creditsRemaining ?? credits
      );

      if (data.upgradeHint) {
        setLoadingText(
          "You are running low on free trips. Upgrade to Pro for unlimited planning."
        );
      }

      const { data: savedTrip } = await supabase
        .from("trip_records")
        .insert({
          user_id: user.id,
          destination,
          days,
          budget,
          result: data.result,
        })
        .select("id, destination, created_at")
        .single();

      if (savedTrip) {
        setRecentTrips((currentTrips) => [savedTrip, ...currentTrips].slice(0, 3));
      }
    } catch (error) {
      console.log(error);
      alert("Failed to generate. Please try again later.");
    } finally {
      setLoading(false);
      setLoadingText("");
    }
  };

  const upgradeToPro = async () => {
    const { data } = await supabase.auth.getSession();

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.session?.access_token}`,
      },
    });

    const json = await res.json();

    if (json.url) {
      window.location.href = json.url;
    } else {
      alert("Payment creation failed.");
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-950">
      <Navbar />

      {plan !== "pro" && (
        <div className="border-b border-yellow-200 bg-yellow-50 py-2 text-center text-sm text-yellow-900">
          {credits > 0
            ? `You have ${credits} free trips left.`
            : "Upgrade to Pro for unlimited trips."}
        </div>
      )}

      <div className="flex justify-center p-4">
        {plan !== "pro" && (
          <button
            type="button"
            onClick={upgradeToPro}
            className="rounded-xl bg-gray-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Upgrade to Pro
          </button>
        )}
      </div>

      <main>
        <Hero
          planner={
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
          }
        />

        <section className="py-10">
          <div className="mx-auto max-w-5xl px-5">
            {loading ? (
              <SkeletonCard />
            ) : (
              <ResultCard
                result={result}
                count={plan === "pro" ? 0 : MAX_FREE - credits}
                maxFree={plan === "pro" ? -1 : MAX_FREE}
              />
            )}
          </div>
        </section>

        <section className="py-10">
          <div className="mx-auto max-w-5xl px-5">
            <RecentTrips trips={recentTrips} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
