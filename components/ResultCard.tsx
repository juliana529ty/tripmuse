
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
  budget: BudgetInfo;
  rawText: string;
};

type ResultCardProps = {
  result: unknown;
  onCopy?: () => void;
  count?: number;
  maxFree?: number;
};

function cleanLine(line: string) {
  return line
    .replace(/^[-•]\s*/, "")
    .replace(/^[🌅🌞🌙💡🏨🍜🚗🎫🧾📍📸⚠️💰🗓️]+\s*/, "")
    .trim();
}

function getSection(
  text: string,
  startPatterns: RegExp[],
  endPatterns: RegExp[]
) {
  const lines = text.split("\n");

  let startIndex = -1;
  let endIndex = lines.length;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (
      startIndex === -1 &&
      startPatterns.some((pattern) => pattern.test(line))
    ) {
      startIndex = index + 1;
      continue;
    }

    if (
      startIndex !== -1 &&
      endPatterns.some((pattern) => pattern.test(line))
    ) {
      endIndex = index;
      break;
    }
  }

  if (startIndex === -1) return [];

  return lines
    .slice(startIndex, endIndex)
    .map(cleanLine)
    .filter(Boolean);
}

function parseDays(text: string): DayItem[] {
  const dayRegex =
    /(?:📅\s*)?Day\s*(\d+)([\s\S]*?)(?=(?:📅\s*)?Day\s*\d+|💰\s*预算建议|💡\s*(?:旅行\s*)?Tips|🍜\s*美食|📸\s*打卡|⚠️\s*避坑|$)/gi;

  const days: DayItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = dayRegex.exec(text)) !== null) {
    const dayNumber = match[1];
    const block = match[2];

    const morning =
      block.match(/(?:🌅\s*)?(?:上午|Morning)[：:\s]*(.+)/i)?.[1]?.trim() ??
      "";

    const afternoon =
      block.match(/(?:🌞\s*)?(?:下午|Afternoon)[：:\s]*(.+)/i)?.[1]?.trim() ??
      "";

    const evening =
      block.match(/(?:🌙\s*)?(?:晚上|Evening)[：:\s]*(.+)/i)?.[1]?.trim() ??
      "";

    const tip =
      block.match(/💡\s*(?:当天提示|提示|Tip)?[：:\s]*(.+)/i)?.[1]?.trim() ??
      "";

    days.push({
      day: dayNumber,
      morning,
      afternoon,
      evening,
      tip,
    });
  }

  return days;
}

function parseBudget(text: string): BudgetInfo {
  const section = getSection(
    text,
    [/^💰\s*预算建议/i, /^预算建议/i, /^💰\s*预算/i],
    [
      /^💡\s*(?:旅行\s*)?Tips/i,
      /^🍜\s*美食/i,
      /^📸\s*打卡/i,
      /^⚠️\s*避坑/i,
    ]
  );

  const budgetText = section.join("\n");

  const pick = (patterns: RegExp[]) => {
    for (const pattern of patterns) {
      const value = budgetText.match(pattern)?.[1]?.trim();
      if (value) return value;
    }

    return "";
  };

  return {
    hotel: pick([/(?:住宿|酒店)[：:\s]*(.+)/i]),
    food: pick([/(?:餐饮|美食)[：:\s]*(.+)/i]),
    transport: pick([/(?:交通)[：:\s]*(.+)/i]),
    ticket: pick([/(?:门票|景点)[：:\s]*(.+)/i]),
    extra: pick([/(?:机动|其他|额外)[：:\s]*(.+)/i]),
  };
}

function parseTextResult(text: string): ParsedResult {
  const normalizedText = text
    .replace(/^```(?:markdown|text|json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const lines = normalizedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const title =
    lines.find(
      (line) =>
        !/^🗺️?\s*行程/i.test(line) &&
        !/^Day\s*\d+/i.test(line)
    ) ?? "Your Trip Plan";

  const overviewLines = getSection(
    normalizedText,
    [/^🗺️\s*行程概览/i, /^行程概览/i],
    [
      /^(?:📅\s*)?Day\s*\d+/i,
      /^🍜\s*美食/i,
      /^📸\s*打卡/i,
      /^⚠️\s*避坑/i,
      /^💰\s*预算/i,
    ]
  );

  const days = parseDays(normalizedText);

  const food = getSection(
    normalizedText,
    [/^🍜\s*美食/i, /^美食/i],
    [
      /^📸\s*打卡/i,
      /^⚠️\s*避坑/i,
      /^💰\s*预算/i,
      /^💡\s*(?:旅行\s*)?Tips/i,
    ]
  );

  const spots = getSection(
    normalizedText,
    [/^📸\s*打卡/i, /^打卡/i, /^景点推荐/i],
    [
      /^⚠️\s*避坑/i,
      /^💰\s*预算/i,
      /^💡\s*(?:旅行\s*)?Tips/i,
    ]
  );

  const tips = getSection(
    normalizedText,
    [
      /^⚠️\s*避坑/i,
      /^避坑/i,
      /^💡\s*(?:旅行\s*)?Tips/i,
      /^旅行贴士/i,
      /^注意事项/i,
    ],
    [/^💰\s*预算/i]
  );

  return {
    title,
    overview: overviewLines.join(" "),
    days,
    food,
    spots,
    tips,
    budget: parseBudget(normalizedText),
    rawText: normalizedText,
  };
}

function normalizeResult(result: unknown): ParsedResult {
  if (typeof result === "string") {
    return parseTextResult(result);
  }

  if (result && typeof result === "object") {
    const objectResult = result as Record<string, any>;

    const rawText =
      typeof objectResult.rawText === "string"
        ? objectResult.rawText
        : JSON.stringify(objectResult, null, 2);

    return {
      title:
        typeof objectResult.title === "string"
          ? objectResult.title
          : "Your Trip Plan",

      overview:
        typeof objectResult.overview === "string"
          ? objectResult.overview
          : "",

      days: Array.isArray(objectResult.days)
        ? objectResult.days
        : Array.isArray(objectResult.itinerary)
          ? objectResult.itinerary.map(
              (item: Record<string, any>, index: number) => ({
                day: item.day ?? index + 1,
                morning: item.morning ?? item.plan ?? "",
                afternoon: item.afternoon ?? "",
                evening: item.evening ?? "",
                tip: item.tip ?? "",
              })
            )
          : [],

      food: Array.isArray(objectResult.food)
        ? objectResult.food
        : [],

      spots: Array.isArray(objectResult.spots)
        ? objectResult.spots
        : [],

      tips: Array.isArray(objectResult.tips)
        ? objectResult.tips
        : [],

      budget:
        objectResult.budget &&
        typeof objectResult.budget === "object"
          ? objectResult.budget
          : {},

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
    budget: {},
    rawText: "",
  };
}

export default function ResultCard({
  result,
  onCopy,
  count = 0,
  maxFree = 3,
}: ResultCardProps) {
  if (!result) {
    return (
      <div className="mx-auto mt-10 max-w-md text-center text-gray-400">
        ✈️ Enter a destination to start planning your trip
      </div>
    );
  }

  const parsed = normalizeResult(result);

  const handleCopy = async () => {
    if (onCopy) {
      onCopy();
      return;
    }

    try {
      await navigator.clipboard.writeText(parsed.rawText);
      alert("Trip plan copied");
    } catch {
      alert("Unable to copy the trip plan");
    }
  };

  const hasBudget =
    parsed.budget.hotel ||
    parsed.budget.food ||
    parsed.budget.transport ||
    parsed.budget.ticket ||
    parsed.budget.extra;

  return (
    <div className="mx-auto mt-6 max-w-3xl space-y-5 animate-fade-in">
      <div className="rounded-3xl border bg-white p-6 text-center shadow">
        <p className="text-xs text-gray-400">
          Generated by
        </p>
        <h2 className="text-xl font-bold">
          🌍 TripMuse
        </h2>
      </div>

      <div className="rounded-3xl border bg-white p-6 shadow">
        <h3 className="text-xl font-bold">
          📍 {parsed.title}
        </h3>

        {parsed.overview && (
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-600">
            {parsed.overview}
          </p>
        )}
      </div>

      <div className="rounded-3xl border bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-bold">
          🗓 Itinerary
        </h3>

        {parsed.days.length > 0 ? (
          parsed.days.map((day, index) => (
            <div
              key={`${day.day}-${index}`}
              className="mb-6 border-b border-gray-100 pb-6 last:mb-0 last:border-b-0 last:pb-0"
            >
              <p className="mb-3 text-lg font-bold">
                Day {day.day}
              </p>

              {day.morning && (
                <p className="mb-2 leading-7">
                  🌅 {day.morning}
                </p>
              )}

              {day.afternoon && (
                <p className="mb-2 leading-7">
                  🌞 {day.afternoon}
                </p>
              )}

              {day.evening && (
                <p className="mb-2 leading-7">
                  🌙 {day.evening}
                </p>
              )}

              {day.tip && (
                <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                  💡 {day.tip}
                </p>
              )}
            </div>
          ))
        ) : (
          <p className="whitespace-pre-line leading-7 text-gray-700">
            {parsed.rawText}
          </p>
        )}
      </div>

      {parsed.food.length > 0 && (
        <div className="rounded-3xl border bg-white p-6 shadow">
          <h3 className="mb-3 text-lg font-bold">
            🍜 Food
          </h3>

          {parsed.food.map((item, index) => (
            <p key={index} className="mb-2 leading-7">
              • {item}
            </p>
          ))}
        </div>
      )}

      {parsed.spots.length > 0 && (
        <div className="rounded-3xl border bg-white p-6 shadow">
          <h3 className="mb-3 text-lg font-bold">
            📸 Highlights
          </h3>

          {parsed.spots.map((item, index) => (
            <p key={index} className="mb-2 leading-7">
              • {item}
            </p>
          ))}
        </div>
      )}

      {parsed.tips.length > 0 && (
        <div className="rounded-3xl border bg-white p-6 shadow">
          <h3 className="mb-3 text-lg font-bold">
            ⚠️ Travel Tips
          </h3>

          {parsed.tips.map((item, index) => (
            <p
              key={index}
              className="mb-2 leading-7 text-red-600"
            >
              • {item}
            </p>
          ))}
        </div>
      )}

      {hasBudget && (
        <div className="rounded-3xl border bg-white p-6 shadow">
          <h3 className="mb-3 text-lg font-bold">
            💰 Budget
          </h3>

          {parsed.budget.hotel && (
            <p className="mb-2">
              🏨 {parsed.budget.hotel}
            </p>
          )}

          {parsed.budget.food && (
            <p className="mb-2">
              🍜 {parsed.budget.food}
            </p>
          )}

          {parsed.budget.transport && (
            <p className="mb-2">
              🚗 {parsed.budget.transport}
            </p>
          )}

          {parsed.budget.ticket && (
            <p className="mb-2">
              🎫 {parsed.budget.ticket}
            </p>
          )}

          {parsed.budget.extra && (
            <p className="mb-2">
              🧾 {parsed.budget.extra}
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleCopy}
        className="w-full rounded-xl bg-black py-3 font-semibold text-white"
      >
        📋 Copy Trip Plan
      </button>

      {maxFree > 0 && count >= maxFree && (
        <div className="rounded-xl border bg-yellow-50 p-4 text-center">
          <p className="font-bold">
            🔥 Upgrade to TripMuse Pro
          </p>
        </div>
      )}
    </div>
  );
}

