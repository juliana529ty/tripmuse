"use client";

import { useEffect } from "react";
import Link from "next/link";

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
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] px-5 py-16">
      <main className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-red-50 text-sm font-bold text-red-600">
          Error
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
            className="inline-flex w-full items-center justify-center rounded-xl bg-gray-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Try again
          </button>

          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
          >
            Return home
          </Link>
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
