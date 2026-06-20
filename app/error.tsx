"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("TripMuse page error:", error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fafafa] px-5 py-16">
      <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-pink-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-purple-200/30 blur-3xl" />

      <main className="relative w-full max-w-md rounded-[2rem] border border-gray-200 bg-white p-8 text-center shadow-2xl shadow-gray-200/60 sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-3xl">
          🛠️
        </div>

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-red-500">
          Something went wrong
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-950">
          This journey hit some turbulence.
        </h1>

        <p className="mt-4 text-sm leading-7 text-gray-500">
          TripMuse encountered an unexpected problem. Your saved trips are
          still safe, and you can try loading this page again.
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-gray-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Try again
          </button>

          <a
            href="/"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
          >
            Return home
          </a>
        </div>

        {error.digest && (
          <p className="mt-6 text-xs text-gray-300">
            Reference: {error.digest}
          </p>
        )}
      </main>
    </div>
  );
}