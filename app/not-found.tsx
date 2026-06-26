import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] px-5 py-16">
      <main className="w-full max-w-lg text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-xl bg-gray-950 text-sm font-bold text-white shadow-xl shadow-gray-300/70">
          404
        </div>

        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.3em] text-purple-500">
          Error 404
        </p>

        <h1 className="mt-4 text-4xl font-black text-gray-950 sm:text-5xl">
          This route is not on the map.
        </h1>

        <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-gray-500 sm:text-base">
          The page may have moved, the link may be incorrect, or this journey
          no longer exists.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-gray-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Plan a trip
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300"
          >
            View my trips
          </Link>
        </div>

        <Link
          href="/"
          className="mt-10 inline-flex items-center gap-2 text-sm font-bold text-gray-950"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-950 text-xs text-white">
            TM
          </span>
          TripMuse
        </Link>
      </main>
    </div>
  );
}
