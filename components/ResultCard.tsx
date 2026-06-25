"use client";

type DayItem = {
  day?: string | number;
  morning?: string;
  afternoon?: string;
  evening?: string;
  tip?: string;
};

type Budget = {
  hotel?: string;
  food?: string;
  transport?: string;
  ticket?: string;
  extra?: string;
};

type ParsedResult = {
  title: string;
  overview: string;
  days: DayItem[];
  food: string[];
  spots: string[];
  tips: string[];
  budget: Budget;
  rawText: string;
};

/* ---------------- utils ---------------- */

function safeArray(arr: any): string[] {
  return Array.isArray(arr) ? arr.filter(Boolean) : [];
}

function normalize(obj: any): ParsedResult {
  if (!obj) {
    return {
      title: "Your Trip",
      overview: "",
      days: [],
      food: [],
      spots: [],
      tips: [],
      budget: {},
      rawText: "",
    };
  }

  const rawText = obj.rawText || JSON.stringify(obj);

  return {
    title: obj.title || "Your Trip",
    overview: obj.overview || "",
    days: obj.days || obj.itinerary || [],

    food: safeArray(obj.food),
    spots: safeArray(obj.spots || obj.highlights),

    tips: safeArray(
      obj.tips || obj.generalTips || obj.travelTips
    ),

    budget: obj.budget || {},

    rawText,
  };
}

/* ---------------- component ---------------- */

export default function ResultCard({ result }: any) {
  const parsed = normalize(result);

  if (!parsed) return null;

  return (
    <div className="space-y-5 max-w-3xl mx-auto mt-6">

      {/* HEADER */}
      <div className="border rounded-2xl p-5 bg-white text-center font-bold">
        🌍 TripMuse Itinerary
      </div>

      {/* TITLE */}
      <div className="border rounded-2xl p-5 bg-white">
        <h2 className="text-xl font-bold">📍 {parsed.title}</h2>
        {parsed.overview && (
          <p className="text-gray-500 mt-2">{parsed.overview}</p>
        )}
      </div>

      {/* DAYS */}
      {parsed.days.length > 0 && (
        <div className="border rounded-2xl p-5 bg-white space-y-4">
          {parsed.days.map((d: any, i: number) => (
            <div key={i} className="border-b pb-3 last:border-none">
              <div className="font-bold mb-2">
                Day {d.day || i + 1}
              </div>

              {d.morning && <div>🌅 Morning: {d.morning}</div>}
              {d.afternoon && <div>🌞 Afternoon: {d.afternoon}</div>}
              {d.evening && <div>🌙 Evening: {d.evening}</div>}

              {d.tip && (
                <div className="text-amber-600 mt-1">
                  💡 Tip: {d.tip}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* HIGHLIGHTS */}
      {parsed.spots.length > 0 && (
        <div className="border rounded-2xl p-5 bg-white">
          <h3 className="font-bold mb-2">📸 Highlights</h3>
          {parsed.spots.map((s, i) => (
            <div key={i}>• {s}</div>
          ))}
        </div>
      )}

      {/* FOOD */}
      {parsed.food.length > 0 && (
        <div className="border rounded-2xl p-5 bg-white">
          <h3 className="font-bold mb-2">🍜 Food</h3>
          {parsed.food.map((f, i) => (
            <div key={i}>• {f}</div>
          ))}
        </div>
      )}

      {/* TIPS */}
      {parsed.tips.length > 0 && (
        <div className="border rounded-2xl p-5 bg-white">
          <h3 className="font-bold mb-2">💡 Travel Tips</h3>
          {parsed.tips.map((t, i) => (
            <div key={i}>• {t}</div>
          ))}
        </div>
      )}

      {/* BUDGET */}
      {parsed.budget && Object.keys(parsed.budget).length > 0 && (
        <div className="border rounded-2xl p-5 bg-white">
          <h3 className="font-bold mb-2">💰 Budget</h3>

          {parsed.budget.hotel && (
            <div>🏨 Hotel: {parsed.budget.hotel}</div>
          )}
          {parsed.budget.food && (
            <div>🍜 Food: {parsed.budget.food}</div>
          )}
          {parsed.budget.transport && (
            <div>🚗 Transport: {parsed.budget.transport}</div>
          )}
          {parsed.budget.ticket && (
            <div>🎫 Tickets: {parsed.budget.ticket}</div>
          )}
          {parsed.budget.extra && (
            <div>🧾 Extra: {parsed.budget.extra}</div>
          )}
        </div>
      )}

      {/* COPY RAW */}
      <button
        onClick={() =>
          navigator.clipboard.writeText(parsed.rawText)
        }
        className="w-full bg-black text-white py-3 rounded-xl"
      >
        Copy Full Itinerary
      </button>
    </div>
  );
}