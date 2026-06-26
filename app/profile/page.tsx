"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";

function formatDate(date?: string) {
  if (!date) return "Not available";

  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
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
      alert("Sign out failed. Please try again.");
      setSigningOut(false);
      return;
    }

    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <Navbar />

        <main className="flex min-h-[70vh] items-center justify-center px-5">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-gray-200 border-t-gray-950" />
            <p className="mt-5 text-sm text-gray-500">
              Loading your profile...
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

        <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-5">
          <section className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold tracking-tight text-gray-950">
              Sign in required
            </h1>
            <p className="mt-3 text-sm leading-7 text-gray-500">
              Sign in to view your profile, manage itineraries, and access your
              saved travel collection.
            </p>
            <Link
              href="/"
              className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-gray-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Return home
            </Link>
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
          <section className="rounded-xl bg-gray-950 p-7 text-white shadow-xl shadow-gray-300/60 md:p-10">
            <div className="flex flex-col gap-7 sm:flex-row sm:items-center">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={`${fullName} avatar`}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-xl border border-white/20 object-cover shadow-xl"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-white/10 text-sm font-bold">
                  TM
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
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-500">
                Account
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight">
                Personal information
              </h2>

              <div className="mt-8 space-y-5">
                <div className="rounded-xl border border-gray-200 bg-[#fafafa] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">
                    Display name
                  </p>
                  <p className="mt-2 break-words font-semibold text-gray-950">
                    {fullName}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-[#fafafa] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">
                    Email
                  </p>
                  <p className="mt-2 break-words font-semibold text-gray-950">
                    {user.email || "Not available"}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-[#fafafa] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">
                    Member since
                  </p>
                  <p className="mt-2 font-semibold text-gray-950">
                    {formatDate(user.created_at)}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-[#fafafa] p-5">
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
              <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold">
                  Your travel collection
                </h2>
                <p className="mt-3 text-sm leading-7 text-gray-500">
                  View saved itineraries, favorites, and public share pages.
                </p>
                <a
                  href="/dashboard"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-gray-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  View my trips
                </a>
              </section>

              <section className="rounded-xl border border-red-100 bg-red-50/60 p-6">
                <p className="text-sm font-semibold text-red-700">
                  Account session
                </p>
                <p className="mt-2 text-sm leading-6 text-red-600/70">
                  Sign out when you are done. You will need to sign in again to
                  manage your trips.
                </p>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
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
