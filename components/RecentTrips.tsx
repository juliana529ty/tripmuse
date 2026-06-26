"use client";

type Trip = {
  id: string;
  destination?: string | null;
  createdAt?: string;
  created_at?: string | null;
};

export default function RecentTrips({ trips = [] }: { trips: Trip[] }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-bold">Recent Trips</h2>

      {trips.length === 0 && (
        <p className="text-sm text-gray-400">No trips yet.</p>
      )}

      <div className="space-y-4">
        {trips.map((trip) => {
          const createdAt = trip.createdAt || trip.created_at;

          return (
            <a
              key={trip.id}
              href={`/trip/${trip.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md"
            >
              <p className="text-sm font-semibold">
                {trip.destination || "Untitled trip"}
              </p>

              {createdAt && (
                <p className="mt-1 text-xs text-gray-500">
                  Created{" "}
                  {new Date(createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              )}
            </a>
          );
        })}
      </div>
    </section>
  );
}
