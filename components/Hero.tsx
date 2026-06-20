export default function Hero() {
  return (
    <section className="relative overflow-hidden px-5 pb-14 pt-16 text-center md:pb-20 md:pt-24">
      <div className="pointer-events-none absolute left-1/2 top-8 -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-pink-200/50 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-32 -z-10 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
      <div className="pointer-events-none absolute left-0 top-52 -z-10 h-64 w-64 rounded-full bg-purple-200/40 blur-3xl" />

      <div className="mx-auto max-w-5xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-sm text-gray-600 shadow-sm backdrop-blur">
          <span>✨</span>
          <span className="font-medium">AI-powered travel planning</span>
          <span className="rounded-full bg-gray-950 px-2 py-0.5 text-xs text-white">
            V3.0
          </span>
        </div>

        <h1 className="mt-8 text-5xl font-black tracking-[-0.05em] text-gray-950 sm:text-6xl md:text-7xl lg:text-8xl">
          Plan smarter.
          <br />
          <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
            Travel happier.
          </span>
        </h1>

        <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-gray-500 sm:text-lg md:text-xl">
          Turn a destination, travel dates and budget into a personalized
          itinerary you can save, share and make your own.
        </p>

        <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-gray-400">
          从旅行灵感到完整行程，只需要几十秒。
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#planner"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-gray-950 px-7 py-4 text-sm font-semibold text-white shadow-lg shadow-gray-950/20 transition hover:-translate-y-0.5 hover:bg-gray-800 sm:w-auto"
          >
            ✨ Plan my trip
          </a>

          <a
            href="/dashboard"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 bg-white px-7 py-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 sm:w-auto"
          >
            View my trips
          </a>
        </div>

        <div className="mx-auto mt-12 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur">
            <p className="text-xl font-bold text-gray-950">30 sec</p>
            <p className="mt-1 text-xs text-gray-500">AI itinerary</p>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur">
            <p className="text-xl font-bold text-gray-950">Save</p>
            <p className="mt-1 text-xs text-gray-500">Your travel ideas</p>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur">
            <p className="text-xl font-bold text-gray-950">Share</p>
            <p className="mt-1 text-xs text-gray-500">Beautiful trip pages</p>
          </div>
        </div>
      </div>
    </section>
  );
}