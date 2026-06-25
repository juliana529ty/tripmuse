"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

type Trip = {
  id: string;
  destination: string;
  created_at: string;
  favorite: boolean;
  public: boolean;
};

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const timer = useRef<any>(null);

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

      const { data } = await supabase
        .from("trip_records")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setTrips(data || []);
      setLoading(false);
    };

    load();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 2000);
  };

  const toggleFavorite = async (trip: Trip) => {
    const newVal = !trip.favorite;

    setTrips((prev) =>
      prev.map((t) =>
        t.id === trip.id ? { ...t, favorite: newVal } : t
      )
    );

    await supabase
      .from("trip_records")
      .update({ favorite: newVal })
      .eq("id", trip.id);

    showToast(newVal ? "Added to favorites ❤️" : "Removed");
  };

  const deleteTrip = async (trip: Trip) => {
    await supabase.from("trip_records").delete().eq("id", trip.id);

    setTrips((prev) => prev.filter((t) => t.id !== trip.id));
    showToast("Trip deleted");
  };

  const shareTrip = async (trip: Trip) => {
    const url = `${window.location.origin}/share/${trip.id}`;
    await navigator.clipboard.writeText(url);
    showToast("Link copied");
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex justify-center items-center h-[60vh]">
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex justify-center items-center h-[60vh]">
          Please login
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-5xl mx-auto px-5 py-10">

        {/* HERO */}
        <div className="bg-black text-white rounded-3xl p-8 mb-10">
          <h1 className="text-2xl font-bold">
            Welcome, {user.user_metadata?.name || "Traveler"}
          </h1>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="p-4 bg-gray-100 rounded-xl">
            All Trips: {trips.length}
          </div>
          <div className="p-4 bg-gray-100 rounded-xl">
            Favorites: {trips.filter(t => t.favorite).length}
          </div>
          <div className="p-4 bg-gray-100 rounded-xl">
            Shared: {trips.filter(t => t.public).length}
          </div>
        </div>

        {/* CARDS */}
        <div className="grid gap-5">
          {trips.map((trip) => (
            <div
              key={trip.id}
              onClick={() => router.push(`/trip/${trip.id}`)}
              className="border rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition cursor-pointer"
            >
              <h2 className="font-bold text-lg">
                📍 {trip.destination}
              </h2>

              <p className="text-sm text-gray-500">
                {formatDate(trip.created_at)}
              </p>

              <div className="flex gap-3 mt-4 text-sm">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    shareTrip(trip);
                  }}
                >
                  📎 Share
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(trip);
                  }}
                >
                  {trip.favorite ? "❤️ Unfavorite" : "🤍 Favorite"}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTrip(trip);
                  }}
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-xl">
          {toast}
        </div>
      )}

      <Footer />
    </div>
  );
}