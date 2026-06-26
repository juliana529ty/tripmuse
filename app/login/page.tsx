import type { Metadata } from "next";
import Link from "next/link";
import LoginButton from "@/components/LoginButton";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to TripMuse to create, save and share your AI travel plans.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] px-5 py-16">
      <main className="w-full max-w-md">
        <Link href="/" className="mx-auto mb-8 flex w-fit items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-950 text-sm font-bold text-white shadow-lg">
            TM
          </span>

          <span>
            <span className="block text-lg font-bold tracking-tight text-gray-950">
              TripMuse
            </span>

            <span className="block text-xs text-gray-400">
              AI Travel Planner
            </span>
          </span>
        </Link>

        <section className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-purple-500">
            Welcome to TripMuse
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-950">
            Your journeys, all in one place.
          </h1>

          <p className="mt-4 text-sm leading-7 text-gray-500">
            Sign in to generate AI itineraries, save travel ideas, favorite
            plans, and create public share pages.
          </p>

          <div className="mt-8 flex justify-center rounded-xl border border-gray-200 bg-[#fafafa] p-4">
            <LoginButton />
          </div>

          <p className="mt-6 text-xs leading-6 text-gray-400">
            By continuing, you agree to use TripMuse responsibly.
          </p>
        </section>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm font-semibold text-gray-500 transition hover:text-gray-950"
          >
            Return to home
          </Link>
        </div>
      </main>
    </div>
  );
}
