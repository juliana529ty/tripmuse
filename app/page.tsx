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

export default function Home() {
  const [user, setUser] = useState<any>(null);

  const MAX_FREE = 3;

  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [credits, setCredits] = useState(MAX_FREE);

  const [destination, setDestination] = useState("");
  const [days, setDays] = useState("");
  const [budget, setBudget] = useState("");

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [recentTrips, setRecentTrips] = useState<any[]>([]);
  const [loadingText, setLoadingText] = useState("");

  // -------------------------
  // AUTH
  // -------------------------
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

  // -------------------------
  // LOAD PLAN
  // -------------------------
  useEffect(() => {
    const loadPlan = async () => {
      if (!user?.id) {
        setPlan("free");
        setCredits(MAX_FREE);
        return;
      }

      const { data } = await supabase
        .from("users")
        .select("plan, credits")
        .eq("id", user.id)
        .maybeSingle();

      setPlan(data?.plan === "pro" ? "pro" : "free");

      setCredits(
        data?.plan === "pro"
          ? -1
          : data?.credits ?? MAX_FREE
      );
    };

    loadPlan();
  }, [user?.id]);

  // -------------------------
  // GENERATE (GROWTH VERSION)
  // -------------------------
  const generatePlan = async () => {
    if (!user) {
      alert("Please log in first.");
      return;
    }

    if (plan !== "pro" && credits <= 0) {
      alert("You're out of free tries. Upgrade to Pro to keep going!");
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
        if (data.upgrade) {
          alert("Upgrade to Pro to unlock unlimited generation.");
        }
        throw new Error(data.error);
      }

      setResult(data.result);

      // 💰 Growth核心：更新状态
      setPlan(data.plan ?? "free");
      setCredits(
        data.plan === "pro"
          ? -1
          : data.creditsRemaining ?? credits
      );

      // ⚡ Growth hint（核心）
      if (data.upgradeHint) {
        setLoadingText("⚡ You're running out of free credits. Upgrade to Pro to unlock unlimited generation.");
      }

      // save trip
      await supabase.from("trip_records").insert({
        user_id: user.id,
        destination,
        days,
        budget,
        result: data.result,
      });
    } catch (error) {
      console.log(error);
      alert("Failed to generate. Please try again later.");
    } finally {
      setLoading(false);
      setLoadingText("");
    }
  };

  // -------------------------
  // STRIPE UPGRADE
  // -------------------------
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
      alert("Payment creation failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-950">
      <Navbar />

      {/* 🔥 Growth Banner */}
      {plan !== "pro" && (
        <div className="bg-yellow-100 text-yellow-800 text-center py-2 text-sm">
          {credits > 0
            ? `⚡ You have ${credits} free trips left`
            : "🚀 Upgrade to Pro for unlimited trips"}
        </div>
      )}

      {/* Upgrade Button */}
      <div className="flex justify-center p-4">
        {plan !== "pro" && (
          <button
            onClick={upgradeToPro}
            className="px-5 py-2 bg-black text-white rounded-xl"
          >
            Upgrade to Pro
          </button>
        )}
      </div>

      <main>
        <Hero />

        <section id="planner" className="bg-white py-16">
          <div className="mx-auto max-w-5xl">
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
        </section>

        <section className="py-10">
          <div className="mx-auto max-w-5xl">
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
          <div className="mx-auto max-w-5xl">
            <RecentTrips trips={recentTrips} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}