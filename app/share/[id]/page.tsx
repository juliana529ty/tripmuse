"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ResultCard from "@/components/ResultCard";
import { supabase } from "@/lib/supabase";

type Trip = {
  id: string;
  destination: string;
  days: string | number;
  budget: string | number;
  result: unknown;
  public: boolean | null;
  created_at: string;
};

function formatCreatedDate(date?: string) {
  if (!date) return "Recently";

  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ShareTripPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let pageIsActive = true;

    const loadTrip = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("trip_records")
        .select("*")
        .eq("id", id)
        .eq("public", true)
        .single();

      if (!pageIsActive) return;

      if (error) {
        console.log("Load shared trip error:", error);
        setTrip(null);
        setLoading(false);
        return;
      }

      setTrip(data);
      setLoading(false);
    };

    loadTrip();

    return () => {
      pageIsActive = false;
    };
  }, [id]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const showToast = (message: string) => {
    setToast(message);

    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    toastTimer.current = setTimeout(() => setToast(""), 1800);
  };

  const copyShareLink = async () => {
    const shareUrl = window.location.href;

    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast("Share link copied.");
    } catch {
      window.prompt("Copy this share link:", shareUrl);
      showToast("Share link ready.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <Navbar />

        <main className="flex min-h-[75vh] items-center justify-center px-5">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-gray-200 border-t-gray-950" />
            <p className="mt-5 text-sm text-gray-500">
              Loading this travel plan...
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <Navbar />

        <main className="mx-auto flex min-h-[75vh] max-w-md items-center px-5">
          <section className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold tracking-tight text-gray-950">
              This trip is unavailable
            </h1>
            <p className="mt-3 text-sm leading-7 text-gray-500">
              The trip may be private, deleted, or the share link may be
              incorrect.
            </p>
            <Link
              href="/"
              className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-gray-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Create my own trip
            </Link>
          </section>
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
          <section className="rounded-xl bg-gray-950 p-7 text-white shadow-xl shadow-gray-300/50 md:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80">
                    Shared with TripMuse
                  </span>
                  <span className="rounded-full bg-green-400/15 px-3 py-1.5 text-xs font-semibold text-green-200">
                    Public trip
                  </span>
                </div>

                <p className="mt-8 text-sm font-medium uppercase tracking-[0.25em] text-white/50">
                  A journey to
                </p>

                <h1 className="mt-3 break-words text-4xl font-black sm:text-5xl md:text-6xl">
                  {trip.destination}
                </h1>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-white/60 md:text-base">
                  A personalized AI itinerary created with TripMuse. Explore
                  the journey day by day.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/10 px-5 py-4">
                  <p className="text-xs text-white/50">Duration</p>
                  <p className="mt-1 text-lg font-bold">{trip.days} days</p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/10 px-5 py-4">
                  <p className="text-xs text-white/50">Budget</p>
                  <p className="mt-1 text-lg font-bold">{trip.budget}</p>
                </div>

                <div className="col-span-2 rounded-xl border border-white/10 bg-white/10 px-5 py-4 sm:col-span-1">
                  <p className="text-xs text-white/50">Created</p>
                  <p className="mt-1 text-sm font-bold">
                    {formatCreatedDate(trip.created_at)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={copyShareLink}
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-gray-950 transition hover:bg-gray-100"
              >
                Copy link
              </button>

              <Link
                href="/#planner"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Create my own trip
              </Link>
            </div>
          </section>

          <ResultCard result={trip.result} />
        </div>
      </main>

      <Footer />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
