"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

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

  if (loading) {
    return (
      <div className="p-10 text-gray-500">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      
      {/* HEADER */}
      <div className="bg-black text-white p-6 rounded-2xl mb-6">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-gray-300 mt-1">Your travel dashboard</p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-gray-500 text-sm">All Trips</p>
          <p className="text-xl font-bold">{trips.length}</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Favorites</p>
          <p className="text-xl font-bold">
            {trips.filter(t => t.favorite).length}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Shared</p>
          <p className="text-xl font-bold">
            {trips.filter(t => t.shared).length}
          </p>
        </div>
      </div>

      {/* TRIPS LIST */}
      <div className="space-y-4">
        {trips.map((trip) => (
          <div
            key={trip.id}
            onClick={() => router.push(`/trip/${trip.id}`)}
            className="bg-white p-5 rounded-xl shadow hover:shadow-md cursor-pointer transition"
          >
            <h2 className="text-lg font-semibold">
              📍 {trip.destination || "Unknown"}
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              Created {new Date(trip.created_at).toLocaleDateString()}
            </p>

            <div className="flex gap-4 mt-3 text-sm text-gray-600">
              <button>Share</button>
              <button>
                {trip.favorite ? "Unfavorite" : "Favorite"}
              </button>
              <button className="text-red-500">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}