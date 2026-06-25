"use client";

type DayItem = {
  day: string | number;
  morning?: string;
  afternoon?: string;
  evening?: string;
  tip?: string;
};

type BudgetInfo = {
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
  generalTips?: string[];
  budget: BudgetInfo;
  rawText: string;
};

type ResultCardProps = {
  result: unknown;
  onCopy?: () => void;
  count?: number;
  maxFree?: number;
};

/* ---------------- helpers ---------------- */

function cleanLine(line: string) {
  return line
    .replace(/^[-•]\s*/, "")
    .replace(/^[🌅🌞🌙💡🏨🍜🚗🎫🧾📍📸⚠️💰🗓️]+\s*/, "")
    .trim();
}

function getSection(text: string, startPatterns: RegExp[], endPatterns: RegExp[]) {
  const lines = text.split("\n");

  let startIndex = -1;
  let endIndex = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (startIndex === -1 && startPatterns.some(p => p.test(line))) {
      startIndex = i + 1;
      continue;
    }

    if (startIndex !== -1 && endPatterns.some(p => p.test(line))) {
      endIndex = i;
      break;
    }
  }

  if (startIndex === -1) return [];

  return lines.slice(startIndex, endIndex).map(cleanLine).filter(Boolean);
}

/* ---------------- unified tips extractor ---------------- */

function extractTips(obj: any, text: string): string[] {
  const all: string[] = [];

  if (Array.isArray(obj?.tips)) all.push(...obj.tips);
  if (Array.isArray(obj?.generalTips)) all.push(...obj.generalTips);
  if (Array.isArray(obj?.travelTips)) all.push(...obj.travelTips);

  // fallback parse text
  const textTips = getSection(
    text,
    [/^💡|Tips|Travel Tips/i],
    [/^💰|Budget/i]
  );

  all.push(...textTips);

  return Array.from(new Set(all)).filter(Boolean);
}

/* ---------------- days parser ---------------- */

function parseDays(text: string): DayItem[] {
  const dayRegex =
    /(?:📅\s*)?Day\s*(\d+)([\s\S]*?)(?=(?:📅\s*)?Day\s*\d+|💰|💡|$)/gi;

  const days: DayItem[] = [];
  let match;

  while ((match = dayRegex.exec(text)) !== null) {
    const block = match[2];

    days.push({
      day: match[1],
      morning:
        block.match(/Morning[：:\s]*(.+)/i)?.[1]?.trim() ?? "",
      afternoon:
        block.match(/Afternoon[：:\s]*(.+)/i)?.[1]?.trim() ?? "",
      evening:
        block.match(/Evening[：:\s]*(.+)/i)?.[1]?.trim() ?? "",
      tip:
        block.match(/💡[：:\s]*(.+)/i)?.[1]?.trim() ?? "",
    });
  }

  return days;
}

/* ---------------- main parser ---------------- */

function parseTextResult(text: string): ParsedResult {
  const rawText = text.replace(/```/g, "").trim();

  const lines = rawText.split("\n").filter(Boolean);

  return {
    title: lines[0] ?? "Your Trip Plan",
    overview: "",
    days: parseDays(rawText),

    food: getSection(rawText, [/🍜|Food/i], [/📸|💰|💡/i]),
    spots: getSection(rawText, [/📸|Highlights/i], [/🍜|💰|💡/i]),

    tips: extractTips({}, rawText),
    generalTips: [],

    budget: {
      hotel: "",
      food: "",
      transport: "",
      ticket: "",
      extra: "",
    },

    rawText,
  };
}

/* ---------------- normalize ---------------- */

function normalizeResult(result: unknown): ParsedResult {
  if (typeof result === "string") return parseTextResult(result);

  if (result && typeof result === "object") {
    const obj = result as any;

    const rawText = obj.rawText ?? JSON.stringify(obj, null, 2);

    return {
      title: obj.title ?? "Your Trip",
      overview: obj.overview ?? "",
      days: obj.days ?? obj.itinerary ?? [],

      food: obj.food ?? [],
      spots: obj.spots ?? [],

      tips: extractTips(obj, rawText),
      generalTips: obj.generalTips ?? [],

      budget: obj.budget ?? {},
      rawText,
    };
  }

  return {
    title: "Your Trip Plan",
    overview: "",
    days: [],
    food: [],
    spots: [],
    tips: [],
    generalTips: [],
    budget: {},
    rawText: "",
  };
}

/* ---------------- component ---------------- */

export default function ResultCard({
  result,
  onCopy,
}: ResultCardProps) {
  if (!result) {
    return (
      <div className="text-center text-gray-400 mt-10">
        ✈️ Enter destination to start
      </div>
    );
  }

  const parsed = normalizeResult(result);

  return (
    <div className="space-y-5 max-w-3xl mx-auto mt-6">

      {/* Header */}
      <div className="border rounded-2xl p-5 text-center bg-white">
        🌍 TripMuse
      </div>

      {/* Title */}
      <div className="border rounded-2xl p-5 bg-white">
        <h2 className="text-xl font-bold">📍 {parsed.title}</h2>
      </div>

      {/* Days */}
      <div className="border rounded-2xl p-5 bg-white">
        {parsed.days.map((d, i) => (
          <div key={i} className="mb-5">
            <div className="font-bold">Day {d.day}</div>

            {d.morning && <div>🌅 {d.morning}</div>}
            {d.afternoon && <div>🌞 {d.afternoon}</div>}
            {d.evening && <div>🌙 {d.evening}</div>}

            {d.tip && (
              <div className="text-amber-600 mt-2">
                💡 {d.tip}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tips (🔥 FIXED CORE) */}
      {parsed.tips.length > 0 && (
        <div className="border rounded-2xl p-5 bg-white">
          <h3 className="font-bold mb-2">💡 Travel Tips</h3>

          {parsed.tips.map((t, i) => (
            <div key={i}>• {t}</div>
          ))}
        </div>
      )}

      {/* Copy */}
      <button
        onClick={() => {
          onCopy?.();
          navigator.clipboard.writeText(parsed.rawText);
        }}
        className="w-full bg-black text-white py-3 rounded-xl"
      >
        Copy
      </button>
    </div>
  );
}