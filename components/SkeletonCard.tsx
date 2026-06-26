export default function SkeletonCard() {
  return (
    <div className="mx-auto mt-6 max-w-md animate-pulse space-y-4">
      <div className="text-center text-sm text-gray-400">
        Generating your personalized travel plan...
      </div>

      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mx-auto h-4 w-1/3 rounded bg-gray-200" />
        <div className="mx-auto h-6 w-1/2 rounded bg-gray-200" />
      </div>

      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="h-4 w-2/3 rounded bg-gray-200" />
        <div className="h-4 w-full rounded bg-gray-200" />
        <div className="h-4 w-5/6 rounded bg-gray-200" />
      </div>

      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="h-5 w-1/3 rounded bg-gray-200" />
        <div className="h-4 w-full rounded bg-gray-200" />
        <div className="h-4 w-4/5 rounded bg-gray-200" />
        <div className="h-4 w-3/5 rounded bg-gray-200" />
      </div>
    </div>
  );
}
