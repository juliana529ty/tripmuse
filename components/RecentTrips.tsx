"use client";

const EN_MAP: Record<string, string> = {
  重庆: "Chongqing",
  长沙: "Changsha",
  北京: "Beijing",
  上海: "Shanghai",
  深圳: "Shenzhen",
  成都: "Chengdu",
  杭州: "Hangzhou",
  广州: "Guangzhou",
};

type Trip = {
  id: string;
  destination: string;
  createdAt?: string;
};

export default function RecentTrips({ trips = [] }: { trips: Trip[] }) {
  return (
    <div className="mt-10">
      {/* Header */}
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        🕘 Recent Trips
      </h2>

      {/* Empty state */}
      {trips.length === 0 && (
        <p className="text-gray-400 text-sm">No trips yet.</p>
      )}

      {/* List */}
      <div className="space-y-4">
        {trips.map((trip) => (
          <div
            key={trip.id}
            className="border rounded-xl p-4 bg-white shadow-sm"
          >
            {/* Destination (FIXED i18n) */}
            <p className="font-semibold text-sm">
              📍 {EN_MAP[trip.destination] || trip.destination}
            </p>

            {/* Date */}
            {trip.createdAt && (
              <p className="text-xs text-gray-500 mt-1">
                Created{" "}
                {new Date(trip.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-3 text-sm">
              <button className="text-blue-600 hover:underline">
                Share
              </button>
              <button className="text-red-500 hover:underline">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}