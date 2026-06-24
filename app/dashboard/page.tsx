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
        showToast("Failed to load trips. Please refresh and try again.");
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
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("checkout");

    if (checkoutStatus === "success") {
      showToast("Payment successful. Upgrading to TripMuse Pro...");
      window.history.replaceState({}, "", "/dashboard");
    }

    if (checkoutStatus === "canceled") {
      showToast("Payment canceled");
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  const showToast = (message: string) => {
    setToast(message);

    if (toastTimer.current) clearTimeout(toastTimer.current);

    toastTimer.current = setTimeout(() => setToast(""), 1800);
  };

  const handleUpgrade = async () => {
    if (plan === "pro") {
      showToast("You are already a TripMuse Pro user ✨");
      return;
    }

    setCheckoutLoading(true);

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session?.access_token) {
        showToast("Please sign in before upgrading.");
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
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (!data.url) {
        throw new Error("No checkout URL returned from Stripe");
      }

      window.location.assign(data.url);
    } catch (error) {
      console.log("Checkout failed:", error);
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to open checkout. Please try again."
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  const toggleFavorite = async (trip: Trip) => {
    if (!user?.id) return;

    const newValue = !trip.favorite;

    setTrips((prev) =>
      prev.map((t) =>
        t.id === trip.id ? { ...t, favorite: newValue } : t
      )
    );

    showToast(newValue ? "Added to favorites ❤️" : "Removed from favorites");

    const { error } = await supabase
      .from("trip_records")
      .update({ favorite: newValue })
      .eq("id", trip.id)
      .eq("user_id", user.id);

    if (error) {
      console.log(error);
      setTrips((prev) =>
        prev.map((t) =>
          t.id === trip.id ? { ...t, favorite: trip.favorite } : t
        )
      );
      showToast("Failed to update favorite");
    }
  };

  const shareTrip = async (trip: Trip) => {
    if (!user?.id) return;

    setSharingId(trip.id);

    try {
      if (!trip.public) {
        const { error } = await supabase
          .from("trip_records")
          .update({ public: true })
          .eq("id", trip.id)
          .eq("user_id", user.id);

        if (error) throw error;

        setTrips((prev) =>
          prev.map((t) =>
            t.id === trip.id ? { ...t, public: true } : t
          )
        );
      }

      const url = `${window.location.origin}/share/${trip.id}`;

      try {
        await navigator.clipboard.writeText(url);
        showToast("Share link copied 📎");
      } catch {
        window.prompt("Copy link:", url);
        showToast("Share link generated");
      }
    } catch (error) {
      console.log(error);
      showToast("Failed to share trip");
    } finally {
      setSharingId(null);
    }
  };

  const deleteTrip = async (trip: Trip) => {
    if (!user?.id) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${trip.destination}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("trip_records")
      .delete()
      .eq("id", trip.id)
      .eq("user_id", user.id);

    if (error) {
      console.log(error);
      showToast("Failed to delete trip");
      return;
    }

    setTrips((prev) => prev.filter((t) => t.id !== trip.id));
    showToast("Trip deleted 🗑");
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const normalized = search.toLowerCase().trim();

  const filteredTrips = trips.filter((trip) => {
    const matchSearch = trip.destination
      .toLowerCase()
      .includes(normalized);

    const matchFilter =
      filter === "all" ||
      (filter === "favorite" && trip.favorite) ||
      (filter === "public" && trip.public);

    return matchSearch && matchFilter;
  });

  const favoriteCount = trips.filter((t) => t.favorite).length;
  const publicCount = trips.filter((t) => t.public).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <Navbar />
        <main className="flex min-h-[70vh] items-center justify-center">
          <p className="text-sm text-gray-500">
            Preparing your travel dashboard...
          </p>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <Navbar />

        <main className="flex min-h-[70vh] items-center justify-center px-5">
          <div className="text-center max-w-md">
            <div className="text-3xl">🧳</div>

            <h1 className="mt-4 text-xl font-bold">
              Sign in to view your trips
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Save AI itineraries, bookmark destinations, and share your trips.
            </p>

            <a
              href="/"
              className="mt-6 inline-flex rounded-2xl bg-black px-5 py-3 text-white text-sm"
            >
              Return Home
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

      <main className="px-5 py-10 max-w-6xl mx-auto space-y-10">
        {/* HERO */}
        <section className="bg-black text-white rounded-3xl p-8">
          <p className="text-sm opacity-70">Welcome back</p>
          <h1 className="text-2xl font-bold">
            {user.user_metadata?.name || "Traveler"}
          </h1>

          <button
            onClick={handleUpgrade}
            className="mt-5 bg-white text-black px-5 py-2 rounded-xl text-sm"
            disabled={checkoutLoading}
          >
            {plan === "pro"
              ? "Pro Active ✓"
              : "Upgrade to Pro · $9.99/month"}
          </button>
        </section>

        {/* STATS */}
        <section className="grid grid-cols-3 gap-4">
          <div>All Trips: {trips.length}</div>
          <div>Favorites: {favoriteCount}</div>
          <div>Shared: {publicCount}</div>
        </section>

        {/* TRIPS */}
        <section className="space-y-4">
          {filteredTrips.map((trip) => (
            <div
              key={trip.id}
              className="border rounded-xl p-4 bg-white"
            >
              <h3 className="font-bold">{trip.destination}</h3>
              <p className="text-sm text-gray-500">
                Created {formatDate(trip.created_at)}
              </p>

              <div className="flex gap-2 mt-3">
                <button onClick={() => shareTrip(trip)}>Share</button>
                <button onClick={() => toggleFavorite(trip)}>
                  {trip.favorite ? "Unfavorite" : "Favorite"}
                </button>
                <button onClick={() => deleteTrip(trip)}>Delete</button>
              </div>
            </div>
          ))}
        </section>
      </main>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-xl text-sm">
          {toast}
        </div>
      )}

      <Footer />
    </div>
  );
}