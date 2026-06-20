export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] px-5">
      <div className="text-center">
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-3xl bg-purple-200/50" />

          <div className="relative flex h-16 w-16 animate-float-softly items-center justify-center rounded-3xl bg-gray-950 text-3xl text-white shadow-xl shadow-gray-300/60">
            ✈️
          </div>
        </div>

        <p className="mt-6 text-lg font-bold tracking-tight text-gray-950">
          TripMuse
        </p>

        <p className="mt-2 animate-pulse-softly text-sm text-gray-500">
          Preparing your next journey…
        </p>
      </div>
    </div>
  );
}