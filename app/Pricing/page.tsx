"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleUpgrade = async () => {
    if (loading) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!session?.access_token) {
        throw new Error(
          "Please sign in before upgrading to TripMuse Pro."
        );
      }

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to start checkout.");
      }

      if (!data?.url) {
        throw new Error("Stripe checkout URL was not returned.");
      }

      window.location.assign(data.url);
    } catch (error) {
      console.error("Checkout error:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white px-5 py-12 text-gray-950 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-gray-950"
          >
            Back to TripMuse
          </Link>

          <p className="mt-10 text-sm font-semibold uppercase tracking-[0.22em] text-purple-600">
            Simple pricing
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Plan better trips with TripMuse Pro
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-gray-600">
            Start for free, then upgrade when you need unlimited AI travel
            planning.
          </p>
        </header>

        <section className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
          <article className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Free</h2>

              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                Starter
              </span>
            </div>

            <div className="mt-7">
              <span className="text-5xl font-bold">$0</span>
              <span className="ml-2 text-gray-500">forever</span>
            </div>

            <p className="mt-5 leading-7 text-gray-600">
              Try TripMuse and create your first personalized travel plans.
            </p>

            <ul className="mt-8 space-y-4 text-sm text-gray-700">
              {[
                "3 AI-generated trips",
                "Day-by-day itinerary",
                "Budget recommendations",
                "Travel tips and reminders",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="font-bold">OK</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/"
              className="mt-10 inline-flex w-full items-center justify-center rounded-xl border border-gray-300 px-5 py-3.5 text-sm font-semibold transition hover:bg-gray-50"
            >
              Start for free
            </Link>
          </article>

          <article className="rounded-xl bg-gray-950 p-8 text-white shadow-xl shadow-purple-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Pro</h2>

              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                Most popular
              </span>
            </div>

            <div className="mt-7">
              <span className="text-5xl font-bold">$9.99</span>
              <span className="ml-2 text-white/60">/ month</span>
            </div>

            <p className="mt-5 leading-7 text-white/70">
              Create more trips, explore more ideas, and plan without
              generation limits.
            </p>

            <ul className="mt-8 space-y-4 text-sm text-white/85">
              {[
                "Unlimited AI trip generation",
                "Detailed daily travel plans",
                "Personalized travel tips",
                "Budget and transport guidance",
                "Save and revisit your trips",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="font-bold">OK</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={handleUpgrade}
              disabled={loading}
              className="mt-10 inline-flex w-full items-center justify-center rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-gray-950 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Opening secure checkout..." : "Upgrade to Pro"}
            </button>

            {errorMessage && (
              <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-100">
                {errorMessage}
              </div>
            )}

            <p className="mt-5 text-center text-xs text-white/45">
              Secure checkout powered by Stripe.
            </p>
          </article>
        </section>

        <section className="mx-auto mt-12 max-w-3xl rounded-xl border border-gray-200 bg-white p-7 text-center shadow-sm">
          <h2 className="text-xl font-bold">
            Try TripMuse before upgrading
          </h2>

          <p className="mt-3 text-sm leading-7 text-gray-600">
            Your free plan includes three AI travel plans, so you can test the
            experience before choosing Pro.
          </p>
        </section>
      </div>
    </main>
  );
}
