"use client";

import { useState, type ReactNode } from "react";

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

type ExportDay = {
  day: number;
  title: string;
  morning: string;
  afternoon: string;
  evening: string;
  tip: string;
};

type TripExportData = {
  title: string;
  destination: string;
  days: ExportDay[];
  food: string[];
  highlights: string[];
  tips: string[];
  budget: Record<string, string>;
};

const BUDGET_KEYS = ["hotel", "food", "transport", "ticket", "extra"];
const POSTCARD_WIDTH = 1200;
const POSTCARD_HEIGHT = 675;

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

export function getTripExportData(trip: unknown): TripExportData {
  const tripRecord =
    trip && typeof trip === "object"
      ? (trip as Record<string, unknown>)
      : null;

  const source = tripRecord && "result" in tripRecord ? tripRecord.result : trip;
  const parsed = parseResult(source);

  if (!parsed) {
    return {
      title: "Your Trip",
      destination: "Your Trip",
      days: [],
      food: [],
      highlights: [],
      tips: [],
      budget: Object.fromEntries(BUDGET_KEYS.map((key) => [key, ""])),
    };
  }

  const destination =
    stringifyValue(tripRecord?.destination) ||
    stringifyValue((source as Record<string, unknown> | null)?.destination) ||
    getDestinationFromTitle(parsed.title);

  return {
    title: parsed.title,
    destination,
    days: parsed.days.map((day, index) => ({
      day: Number(day.day) || index + 1,
      title: stringifyValue(day.title) || `Day ${Number(day.day) || index + 1}`,
      morning: stringifyValue(day.morning),
      afternoon: stringifyValue(day.afternoon),
      evening: stringifyValue(day.evening),
      tip: stringifyValue(day.tip),
    })),
    food: parsed.food,
    highlights: parsed.spots,
    tips: parsed.tips,
    budget: Object.fromEntries(
      BUDGET_KEYS.map((key) => [
        key,
        stringifyValue(parsed.budget[key]),
      ])
    ),
  };
}

function getDestinationFromTitle(title: string) {
  return title
    .replace(/\b\d+\s*-\s*day\s+trip\b/i, "")
    .replace(/\b\d+\s*day\s+trip\b/i, "")
    .replace(/\btrip\b/i, "")
    .trim() || "Your Trip";
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (context.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  lines.slice(0, maxLines).forEach((line, index) => {
    const displayLine =
      index === maxLines - 1 && lines.length > maxLines
        ? `${line.replace(/[.,;:!?]+$/, "")}...`
        : line;

    context.fillText(displayLine, x, y + index * lineHeight);
  });
}

async function shareImageFile(blob: Blob, fileName: string) {
  const file = new File([blob], fileName, { type: "image/png" });
  const navigatorWithShare = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean;
    share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>;
  };

  if (
    navigatorWithShare.share &&
    navigatorWithShare.canShare?.({ files: [file] })
  ) {
    await navigatorWithShare.share({
      files: [file],
      title: "TripMuse travel card",
      text: "A TripMuse travel postcard.",
    });
    return;
  }

  const imageUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = imageUrl;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(imageUrl);
}

async function createTravelPostcard(exportData: TripExportData) {
  const canvas = document.createElement("canvas");
  canvas.width = POSTCARD_WIDTH;
  canvas.height = POSTCARD_HEIGHT;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not supported in this browser.");
  }

  const destination = exportData.destination || getDestinationFromTitle(exportData.title);
  const duration = exportData.days.length || 1;
  const highlights =
    exportData.highlights.length > 0
      ? exportData.highlights.slice(0, 4)
      : ["Personalized itinerary", "Food ideas", "Travel tips", "Budget guidance"];

  const gradient = context.createLinearGradient(0, 0, POSTCARD_WIDTH, POSTCARD_HEIGHT);
  gradient.addColorStop(0, "#f8fafc");
  gradient.addColorStop(0.42, "#fef3c7");
  gradient.addColorStop(1, "#dbeafe");
  context.fillStyle = gradient;
  context.fillRect(0, 0, POSTCARD_WIDTH, POSTCARD_HEIGHT);

  context.fillStyle = "rgba(17, 24, 39, 0.08)";
  context.beginPath();
  context.arc(1040, 90, 190, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "rgba(236, 72, 153, 0.12)";
  context.beginPath();
  context.arc(120, 600, 240, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "rgba(255, 255, 255, 0.78)";
  context.fillRect(56, 56, POSTCARD_WIDTH - 112, POSTCARD_HEIGHT - 112);

  context.strokeStyle = "rgba(17, 24, 39, 0.16)";
  context.lineWidth = 2;
  context.strokeRect(56, 56, POSTCARD_WIDTH - 112, POSTCARD_HEIGHT - 112);

  context.fillStyle = "#111827";
  context.font = "700 28px Arial, Helvetica, sans-serif";
  context.fillText("TripMuse Travel Postcard", 96, 118);

  context.fillStyle = "#6b7280";
  context.font = "600 24px Arial, Helvetica, sans-serif";
  context.fillText(`${duration} day${duration === 1 ? "" : "s"} planned`, 96, 162);

  context.fillStyle = "#111827";
  context.font = "800 76px Arial, Helvetica, sans-serif";
  wrapCanvasText(context, destination, 96, 270, 650, 82, 2);

  context.fillStyle = "#374151";
  context.font = "400 26px Arial, Helvetica, sans-serif";
  wrapCanvasText(
    context,
    exportData.title || "A personalized AI itinerary built with TripMuse.",
    96,
    425,
    630,
    34,
    3
  );

  context.fillStyle = "#111827";
  context.font = "700 26px Arial, Helvetica, sans-serif";
  context.fillText("Key highlights", 790, 240);

  context.font = "400 23px Arial, Helvetica, sans-serif";
  highlights.forEach((highlight, index) => {
    const y = 292 + index * 74;

    context.fillStyle = "#111827";
    context.beginPath();
    context.arc(804, y - 8, 5, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#374151";
    wrapCanvasText(context, highlight, 826, y, 280, 28, 2);
  });

  context.fillStyle = "#111827";
  context.font = "700 24px Arial, Helvetica, sans-serif";
  context.fillText("tripmuse.ai", 96, 590);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Unable to create share image."));
      }
    }, "image/png");
  });
}

function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="text-sm text-gray-400">{children}</p>;
}

function FieldLine({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  const text = stringifyValue(value);

  return (
    <p>
      <span className="font-semibold text-gray-950">{label}:</span>{" "}
      {text || <span className="text-gray-400">Not provided.</span>}
    </p>
  );
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
  const [sharingImage, setSharingImage] = useState(false);

  if (!parsed) return null;

  const exportData = getTripExportData(result);

  const budgetEntries = BUDGET_KEYS.map((key) => [
    key,
    stringifyValue(parsed.budget[key]),
  ] as const);

  const handleShareImage = async () => {
    setSharingImage(true);

    try {
      const blob = await createTravelPostcard(exportData);
      await shareImageFile(blob, "tripmuse-travel-postcard.png");
    } catch (error) {
      console.error("Share image failed:", error);
      alert("Unable to create the share image. Please try again.");
    } finally {
      setSharingImage(false);
    }
  };

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
                  <FieldLine label="Morning" value={day.morning} />
                  <FieldLine label="Afternoon" value={day.afternoon} />
                  <FieldLine label="Evening" value={day.evening} />
                  <p className="rounded-xl bg-amber-50 px-3 py-2 text-amber-800">
                    <span className="font-semibold">Tip:</span>{" "}
                    {stringifyValue(day.tip) || "Not provided."}
                  </p>
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
        <dl className="mt-3 grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
          {budgetEntries.map(([key, value]) => (
            <div key={key} className="rounded-xl bg-gray-50 p-3">
              <dt className="font-semibold capitalize text-gray-950">
                {key}
              </dt>
              <dd className="mt-1 leading-6">
                {value || <span className="text-gray-400">Not provided.</span>}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() =>
            navigator.clipboard.writeText(JSON.stringify(exportData, null, 2))
          }
          className="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
        >
          Copy export JSON
        </button>

        <button
          type="button"
          onClick={handleShareImage}
          disabled={sharingImage}
          className="w-full rounded-xl bg-gray-950 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sharingImage ? "Creating image..." : "Share Image"}
        </button>
      </div>
    </div>
  );
}
