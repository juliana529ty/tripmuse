export default function RecentTrips({ trips, onSelect }: any) {
  if (!trips || trips.length === 0) return null;

  return (
    <div className="max-w-md mx-auto mt-8 bg-white rounded-3xl shadow-lg border p-5">

      {/* 标题 */}
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        🕘 Recent Trips
      </h2>

      {/* 横向滚动（产品感关键升级） */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">

        {trips.map((trip: any, index: number) => (
          <button
            key={index}
            onClick={() => onSelect(trip)}
            className="
              min-w-[140px]
              text-left
              p-3
              rounded-xl
              border
              hover:bg-pink-50
              hover:shadow-md
              transition
              flex-shrink-0
            "
          >
            <p className="font-semibold text-sm">
              📍 {trip.destination}
            </p>

            <p className="text-xs text-gray-500 mt-1">
              {trip.days} Days
            </p>

            <p className="text-xs text-gray-400">
              💰 {trip.budget}
            </p>
          </button>
        ))}

      </div>
    </div>
  );
}