import Link from "next/link";
import type { ReactNode } from "react";

type HeroProps = {
  planner?: ReactNode;
};

export default function Hero({ planner }: HeroProps) {
  return (
    <section className="border-b border-gray-200 bg-white px-5 py-16 text-center md:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-600">
          <span className="font-medium">AI-powered travel planning</span>
          <span className="rounded-full bg-gray-950 px-2 py-0.5 text-xs text-white">
            Pro ready
          </span>
        </div>

        <h1 className="mt-8 text-5xl font-black text-gray-950 sm:text-6xl md:text-7xl">
          Plan smarter trips with TripMuse.
        </h1>

        <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-gray-600 sm:text-lg">
          Turn a destination, trip length, and budget into a structured AI
          itinerary with daily plans, food ideas, highlights, travel tips, and
          budget guidance.
        </p>

        {planner ? (
          <div id="planner" className="mt-9">
            {planner}
          </div>
        ) : (
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#planner"
              className="inline-flex w-full items-center justify-center rounded-xl bg-gray-950 px-7 py-4 text-sm font-semibold text-white shadow-lg shadow-gray-950/15 transition hover:bg-gray-800 sm:w-auto"
            >
              Plan my trip
            </a>

            <Link
              href="/dashboard"
              className="inline-flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-7 py-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 sm:w-auto"
            >
              View my trips
            </Link>
          </div>
        )}

        <div className="mx-auto mt-12 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xl font-bold text-gray-950">Fast</p>
            <p className="mt-1 text-xs text-gray-500">AI itineraries</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xl font-bold text-gray-950">Saved</p>
            <p className="mt-1 text-xs text-gray-500">Private trip library</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xl font-bold text-gray-950">Shareable</p>
            <p className="mt-1 text-xs text-gray-500">Public trip pages</p>
          </div>
        </div>
      </div>
    </section>
  );
}
