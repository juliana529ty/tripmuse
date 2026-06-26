"use client";

import { type MouseEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";

type TripRecord = {
  id: string;
  user_id: string;
  destination?: string | null;
  days?: string | number | null;
  budget?: string | number | null;
  favorite?: boolean | null;
  public?: boolean | null;
  created_at?: string | null;
};

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUser(user);

      const { data, error } = await supabase
        .from("trip_records")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.log("Load dashboard trips failed:", error);
      }

      setTrips(data || []);
      setLoading(false);
    };

    load();
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  };

  const stopButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  const toggleFavorite = async (
    event: MouseEvent<HTMLButtonElement>,
    trip: TripRecord
  ) => {
    stopButtonClick(event);

    if (!user?.id) return;

    const nextFavorite = !trip.favorite;

    setTrips((currentTrips) =>
      currentTrips.map((item) =>
        item.id === trip.id ? { ...item, favorite: nextFavorite } : item
      )
    );

    const { error } = await supabase
      .from("trip_records")
      .update({ favorite: nextFavorite })
      .eq("id", trip.id)
      .eq("user_id", user.id);

    if (error) {
      console.log("Favorite update failed:", error);
      setTrips((currentTrips) =>
        currentTrips.map((item) =>
          item.id === trip.id ? { ...item, favorite: trip.favorite } : item
        )
      );
      showToast("Favorite update failed. Please try again.");
      return;
    }

    showToast(nextFavorite ? "Trip added to favorites." : "Trip removed from favorites.");
  };

  const shareTrip = async (
    event: MouseEvent<HTMLButtonElement>,
    trip: TripRecord
  ) => {
    stopButtonClick(event);

    if (!user?.id) return;

    if (!trip.public) {
      const { error } = await supabase
        .from("trip_records")
        .update({ public: true })
        .eq("id", trip.id)
        .eq("user_id", user.id);

      if (error) {
        console.log("Share update failed:", error);
        showToast("Unable to create a share link. Please try again.");
        return;
      }

      setTrips((currentTrips) =>
        currentTrips.map((item) =>
          item.id === trip.id ? { ...item, public: true } : item
        )
      );
    }

    const shareUrl = `${window.location.origin}/share/${trip.id}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast("Share link copied.");
    } catch {
      window.prompt("Copy this share link:", shareUrl);
      showToast("Share link ready.");
    }
  };

  const deleteTrip = async (
    event: MouseEvent<HTMLButtonElement>,
    trip: TripRecord
  ) => {
    stopButtonClick(event);

    if (!user?.id) return;

    const confirmed = window.confirm(
      "Delete this trip? This action cannot be undone."
    );

    if (!confirmed) return;

    const previousTrips = trips;

    setTrips((currentTrips) =>
      currentTrips.filter((item) => item.id !== trip.id)
    );

    const { error } = await supabase
      .from("trip_records")
      .delete()
      .eq("id", trip.id)
      .eq("user_id", user.id);

    if (error) {
      console.log("Delete trip failed:", error);
      setTrips(previousTrips);
      showToast("Delete failed. Please try again.");
      return;
    }

    showToast("Trip deleted.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="p-10 text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-5">
          <section className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-gray-950">Sign in required</h1>
            <p className="mt-3 text-sm leading-6 text-gray-500">
              Sign in to view, manage, favorite, and share your saved trips.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Back to TripMuse
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-6xl px-5 py-8 md:px-8">
        <section className="rounded-xl bg-gray-950 p-6 text-white">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-gray-300">
            Manage your saved TripMuse itineraries.
          </p>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">All Trips</p>
            <p className="mt-1 text-2xl font-bold">{trips.length}</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Favorites</p>
            <p className="mt-1 text-2xl font-bold">
              {trips.filter((trip) => trip.favorite).length}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Shared</p>
            <p className="mt-1 text-2xl font-bold">
              {trips.filter((trip) => trip.public).length}
            </p>
          </div>
        </section>

        <section className="mt-6 space-y-4">
          {trips.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <h2 className="text-lg font-bold">No trips yet</h2>
              <p className="mt-2 text-sm text-gray-500">
                Create your first AI itinerary from the planner.
              </p>
              <Link
                href="/#planner"
                className="mt-5 inline-flex rounded-xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white"
              >
                Plan a trip
              </Link>
            </div>
          )}

          {trips.map((trip) => (
            <article
              key={trip.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/trip/${trip.id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  router.push(`/trip/${trip.id}`);
                }
              }}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-950"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    {trip.destination || "Untitled trip"}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Created{" "}
                    {trip.created_at
                      ? new Date(trip.created_at).toLocaleDateString("en-US")
                      : "recently"}
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    {trip.days || "Flexible"} days
                    {trip.budget ? ` - ${trip.budget}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-sm">
                  <button
                    type="button"
                    onClick={(event) => shareTrip(event, trip)}
                    className="rounded-xl border border-gray-200 px-3 py-2 font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Share
                  </button>

                  <button
                    type="button"
                    onClick={(event) => toggleFavorite(event, trip)}
                    className="rounded-xl border border-gray-200 px-3 py-2 font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    {trip.favorite ? "Unfavorite" : "Favorite"}
                  </button>

                  <button
                    type="button"
                    onClick={(event) => deleteTrip(event, trip)}
                    className="rounded-xl border border-red-100 px-3 py-2 font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
