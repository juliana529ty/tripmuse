"use client";

type DayItem = {
  day?: string | number;
  title?: string;
  morning?: unknown;
  afternoon?: unknown;
  evening?: unknown;
  tip?: unknown;
};

type Budget = {
  hotel?: unknown;
  food?: unknown;
  transport?: unknown;
  ticket?: unknown;
  extra?: unknown;
  [key: string]: unknown;
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

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(stringifyValue).filter(Boolean).join(", ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, nestedValue]) => {
        const text = stringifyValue(nestedValue);
        return text ? `${key}: ${text}` : "";
      })
      .filter(Boolean)
      .join("; ");
  }

  return String(value);
}

function safeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(stringifyValue).filter(Boolean);
}

function parseResult(input: unknown): ParsedResult | null {
  if (!input) return null;

  let obj = input;

  if (typeof input === "string") {
    try {
      obj = JSON.parse(input);
    } catch {
      return {
        title: "Your Trip",
        overview: input,
        days: [],
        food: [],
        spots: [],
        tips: [],
        budget: {},
        rawText: input,
      };
    }
  }

  if (!obj || typeof obj !== "object") return null;

  const record = obj as Record<string, unknown>;
  const budget = record.budget && typeof record.budget === "object"
    ? (record.budget as Budget)
    : {};

  return {
    title: stringifyValue(record.title) || "Your Trip",
    overview: stringifyValue(record.overview),
    days: Array.isArray(record.days)
      ? (record.days as DayItem[])
      : Array.isArray(record.itinerary)
        ? (record.itinerary as DayItem[])
        : [],
    food: safeArray(record.food),
    spots: safeArray(record.spots ?? record.highlights),
    tips: safeArray(record.tips ?? record.generalTips ?? record.travelTips),
    budget,
    rawText: stringifyValue(record.rawText) || JSON.stringify(record, null, 2),
  };
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-400">{children}</p>;
}

function ListSection({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="font-bold text-gray-950">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-7 text-gray-600">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="flex gap-2">
              <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-950" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3">
          <EmptyLine>{empty}</EmptyLine>
        </div>
      )}
    </section>
  );
}

export default function ResultCard({
  result,
}: {
  result: unknown;
  count?: number;
  maxFree?: number;
}) {
  const parsed = parseResult(result);

  if (!parsed) return null;

  const budgetEntries = Object.entries(parsed.budget)
    .map(([key, value]) => [key, stringifyValue(value)] as const)
    .filter(([, value]) => Boolean(value));

  return (
    <div className="mx-auto mt-6 max-w-3xl space-y-5">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">
          TripMuse Itinerary
        </p>
        <h2 className="mt-3 text-2xl font-bold text-gray-950">
          {parsed.title}
        </h2>
        {parsed.overview ? (
          <p className="mt-3 text-sm leading-7 text-gray-600">
            {parsed.overview}
          </p>
        ) : (
          <div className="mt-3">
            <EmptyLine>No overview was provided.</EmptyLine>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-gray-950">Daily Plan</h3>
        {parsed.days.length > 0 ? (
          <div className="mt-4 space-y-4">
            {parsed.days.map((day, index) => (
              <article
                key={`day-${index}`}
                className="border-b border-gray-100 pb-4 last:border-none last:pb-0"
              >
                <h4 className="font-bold">
                  {day.title || `Day ${stringifyValue(day.day) || index + 1}`}
                </h4>
                <div className="mt-2 space-y-2 text-sm leading-7 text-gray-600">
                  {stringifyValue(day.morning) && (
                    <p>
                      <span className="font-semibold text-gray-950">Morning:</span>{" "}
                      {stringifyValue(day.morning)}
                    </p>
                  )}
                  {stringifyValue(day.afternoon) && (
                    <p>
                      <span className="font-semibold text-gray-950">Afternoon:</span>{" "}
                      {stringifyValue(day.afternoon)}
                    </p>
                  )}
                  {stringifyValue(day.evening) && (
                    <p>
                      <span className="font-semibold text-gray-950">Evening:</span>{" "}
                      {stringifyValue(day.evening)}
                    </p>
                  )}
                  {stringifyValue(day.tip) && (
                    <p className="rounded-xl bg-amber-50 px-3 py-2 text-amber-800">
                      <span className="font-semibold">Tip:</span>{" "}
                      {stringifyValue(day.tip)}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-3">
            <EmptyLine>No daily itinerary was provided.</EmptyLine>
          </div>
        )}
      </section>

      <ListSection
        title="Highlights"
        items={parsed.spots}
        empty="No highlights were provided."
      />

      <ListSection
        title="Food"
        items={parsed.food}
        empty="No food recommendations were provided."
      />

      <ListSection
        title="Travel Tips"
        items={parsed.tips}
        empty="No travel tips were provided."
      />

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-gray-950">Budget</h3>
        {budgetEntries.length > 0 ? (
          <dl className="mt-3 grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
            {budgetEntries.map(([key, value]) => (
              <div key={key} className="rounded-xl bg-gray-50 p-3">
                <dt className="font-semibold capitalize text-gray-950">
                  {key}
                </dt>
                <dd className="mt-1 leading-6">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="mt-3">
            <EmptyLine>No budget guidance was provided.</EmptyLine>
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(parsed.rawText)}
        className="w-full rounded-xl bg-gray-950 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
      >
        Copy full itinerary
      </button>
    </div>
  );
}
