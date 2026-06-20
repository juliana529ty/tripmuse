"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";

type Trip = {
  id: string;
  user_id: string;
  destination: string;
  days: string | number;
  budget: string | number;
  result: any;
  favorite: boolean;
  public: boolean;
  created_at: string;
};

type PeriodSection = {
  title: string;
  icon: string;
  content: string;
  order: number;
};

type DaySection = {
  title: string;
  sections: PeriodSection[];
};

type PeriodDefinition = {
  title: string;
  icon: string;
  order: number;
  aliases: string[];
};

const PERIOD_DEFINITIONS: PeriodDefinition[] = [
  {
    title: "Morning",
    icon: "☀️",
    order: 10,
    aliases: [
      "morning",
      "breakfast",
      "earlymorning",
      "上午",
      "早上",
      "清晨",
      "早餐",
    ],
  },
  {
    title: "Lunch",
    icon: "🍜",
    order: 20,
    aliases: [
      "lunch",
      "brunch",
      "noon",
      "午餐",
      "中午",
      "午饭",
    ],
  },
  {
    title: "Afternoon",
    icon: "🌤️",
    order: 30,
    aliases: ["afternoon", "下午"],
  },
  {
    title: "Evening",
    icon: "🌙",
    order: 40,
    aliases: [
      "evening",
      "night",
      "dinner",
      "latenight",
      "傍晚",
      "晚餐",
      "晚上",
      "夜晚",
      "夜间",
    ],
  },
  {
    title: "Accommodation",
    icon: "🏨",
    order: 50,
    aliases: [
      "accommodation",
      "hotel",
      "stay",
      "lodging",
      "住宿",
      "酒店",
    ],
  },
  {
    title: "Transport",
    icon: "🚇",
    order: 60,
    aliases: [
      "transport",
      "transportation",
      "transit",
      "traffic",
      "交通",
      "交通方式",
    ],
  },
  {
    title: "Travel Tips",
    icon: "💡",
    order: 70,
    aliases: [
      "tips",
      "tip",
      "traveltips",
      "notes",
      "advice",
      "建议",
      "小贴士",
      "旅行贴士",
      "注意事项",
    ],
  },
];

const META_KEYS = new Set([
  "day",
  "days",
  "daynumber",
  "dayno",
  "dayindex",
  "date",
  "title",
  "theme",
  "summary",
  "destination",
  "city",
  "location",
  "budget",
  "duration",
  "number",
  "id",
  "__daytitle",
]);

const normalizeKey = (key: string) => {
  return key
    .toLowerCase()
    .replace(/[\s_\-—–:：#*`()[\]{}]/g, "")
    .trim();
};

const humanizeKey = (key: string) => {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
};

const getPeriodDefinition = (
  rawKey: string
): PeriodDefinition | null => {
  const normalizedKey = normalizeKey(rawKey);

  for (const definition of PERIOD_DEFINITIONS) {
    const matched = definition.aliases.some((alias) => {
      const normalizedAlias = normalizeKey(alias);

      return (
        normalizedKey === normalizedAlias ||
        normalizedKey.startsWith(normalizedAlias) ||
        normalizedKey.endsWith(normalizedAlias)
      );
    });

    if (matched) {
      return definition;
    }
  }

  return null;
};

const formatNestedValue = (value: any): string => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean"
        ) {
          return `• ${String(item).trim()}`;
        }

        return formatNestedValue(item);
      })
      .filter(Boolean)
      .join("\n");
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, any>)
      .map(([key, nestedValue]) => {
        const content = formatNestedValue(nestedValue);

        if (!content) return "";

        const normalizedKey = normalizeKey(key);

        if (META_KEYS.has(normalizedKey)) {
          return content;
        }

        return `${humanizeKey(key)}：${content}`;
      })
      .filter(Boolean)
      .join("\n");
  }

  return String(value);
};

const mergeText = (current: string, incoming: string) => {
  const paragraphs = `${current}\n\n${incoming}`
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set(paragraphs)).join("\n\n");
};

const addPeriodSection = (
  sectionMap: Map<string, PeriodSection>,
  definition: PeriodDefinition,
  content: string
) => {
  const cleanedContent = content.trim();

  if (!cleanedContent) return;

  const existing = sectionMap.get(definition.title);

  if (existing) {
    sectionMap.set(definition.title, {
      ...existing,
      content: mergeText(existing.content, cleanedContent),
    });

    return;
  }

  sectionMap.set(definition.title, {
    title: definition.title,
    icon: definition.icon,
    order: definition.order,
    content: cleanedContent,
  });
};

const collectStructuredPeriods = (
  node: any,
  sectionMap: Map<string, PeriodSection>
) => {
  if (node === null || node === undefined) return;

  if (Array.isArray(node)) {
    node.forEach((item) => {
      collectStructuredPeriods(item, sectionMap);
    });

    return;
  }

  if (typeof node !== "object") return;

  Object.entries(node as Record<string, any>).forEach(
    ([key, value]) => {
      const normalizedKey = normalizeKey(key);

      if (META_KEYS.has(normalizedKey)) {
        return;
      }

      const periodDefinition = getPeriodDefinition(key);

      if (periodDefinition) {
        const content = formatNestedValue(value);

        addPeriodSection(
          sectionMap,
          periodDefinition,
          content
        );

        return;
      }

      if (
        typeof value === "object" &&
        value !== null
      ) {
        collectStructuredPeriods(value, sectionMap);
      }
    }
  );
};

const getDayTitle = (day: any, index: number) => {
  if (!day || typeof day !== "object") {
    return `Day ${index + 1}`;
  }

  const explicitTitle =
    day.__dayTitle ??
    day.day_title ??
    day.dayTitle;

  if (explicitTitle) {
    return String(explicitTitle);
  }

  const dayValue =
    day.day ??
    day.day_number ??
    day.dayNumber ??
    day.number;

  const titleValue =
    day.title ??
    day.theme ??
    day.summary;

  if (dayValue !== undefined && dayValue !== null) {
    const text = String(dayValue).trim();

    const dayLabel = /^day/i.test(text)
      ? text
      : `Day ${text}`;

    if (
      titleValue &&
      String(titleValue).trim() !== text
    ) {
      return `${dayLabel} · ${String(titleValue).trim()}`;
    }

    return dayLabel;
  }

  if (titleValue) {
    return `Day ${index + 1} · ${String(titleValue).trim()}`;
  }

  return `Day ${index + 1}`;
};

const getDayCandidates = (result: any): any[] | null => {
  if (Array.isArray(result)) {
    return result;
  }

  if (!result || typeof result !== "object") {
    return null;
  }

  const objectResult = result as Record<string, any>;

  const preferredKeys = [
    "days",
    "itinerary",
    "schedule",
    "dailyPlan",
    "daily_plan",
    "plan",
  ];

  for (const key of preferredKeys) {
    if (Array.isArray(objectResult[key])) {
      return objectResult[key];
    }
  }

  const dayEntries = Object.entries(objectResult).filter(
    ([key]) => {
      const cleanedKey = key.trim();

      return (
        /^day[\s_\-]*\d+/i.test(cleanedKey) ||
        /^第\s*[一二三四五六七八九十百\d]+\s*天/.test(
          cleanedKey
        )
      );
    }
  );

  if (dayEntries.length > 0) {
    return dayEntries.map(([key, value]) => {
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        return {
          __dayTitle: humanizeKey(key),
          ...value,
        };
      }

      return {
        __dayTitle: humanizeKey(key),
        itinerary: value,
      };
    });
  }

  const containsPeriod = Object.keys(objectResult).some(
    (key) => getPeriodDefinition(key)
  );

  if (containsPeriod) {
    return [objectResult];
  }

  return null;
};

const parseStructuredItinerary = (
  result: any
): DaySection[] | null => {
  const dayCandidates = getDayCandidates(result);

  if (!dayCandidates || dayCandidates.length === 0) {
    return null;
  }

  const parsedDays = dayCandidates
    .map((day, index) => {
      const sectionMap = new Map<
        string,
        PeriodSection
      >();

      collectStructuredPeriods(day, sectionMap);

      let sections = Array.from(sectionMap.values()).sort(
        (first, second) =>
          first.order - second.order
      );

      if (sections.length === 0) {
        const fallbackContent = formatNestedValue(day);

        if (fallbackContent) {
          sections = [
            {
              title: "Itinerary",
              icon: "🗺️",
              order: 100,
              content: fallbackContent,
            },
          ];
        }
      }

      return {
        title: getDayTitle(day, index),
        sections,
      };
    })
    .filter((day) => day.sections.length > 0);

  return parsedDays.length > 0 ? parsedDays : null;
};

const cleanMarkdownLine = (line: string) => {
  return line
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\s*[\-*•]\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")
    .trim();
};

const normalizeTextLines = (text: string) => {
  const originalLines = text
    .replace(/\r\n/g, "\n")
    .split("\n");

  const normalizedLines: string[] = [];

  for (
    let index = 0;
    index < originalLines.length;
    index += 1
  ) {
    const currentLine = cleanMarkdownLine(
      originalLines[index]
    );

    const nextLine =
      index + 1 < originalLines.length
        ? cleanMarkdownLine(originalLines[index + 1])
        : "";

    if (
      /^day$/i.test(currentLine) &&
      /^\d+$/.test(nextLine)
    ) {
      normalizedLines.push(`Day ${nextLine}`);
      index += 1;
      continue;
    }

    if (/^days?$/i.test(currentLine)) {
      continue;
    }

    normalizedLines.push(originalLines[index]);
  }

  return normalizedLines;
};

const getDayHeading = (line: string): string | null => {
  const cleanedLine = cleanMarkdownLine(line);

  const match = cleanedLine.match(
    /^(day\s*#?\s*\d+|第\s*[一二三四五六七八九十百\d]+\s*天)(?:\s*[:：\-—]\s*(.*))?$/i
  );

  if (!match) {
    return null;
  }

  const heading = match[1].replace(/\s+/g, " ").trim();
  const subtitle = match[2]?.trim();

  return subtitle
    ? `${heading} · ${subtitle}`
    : heading;
};

const getPeriodFromLine = (
  line: string
): {
  definition: PeriodDefinition;
  remaining: string;
} | null => {
  const cleanedLine = cleanMarkdownLine(line)
    .replace(
      /^[☀️🌤️🍳🍜🍽️🌆🌇🌙🌃⭐✨📍🗺️🚇💡🏨🚕🚌🚆🚗\s]+/,
      ""
    )
    .trim();

  for (const definition of PERIOD_DEFINITIONS) {
    for (const alias of definition.aliases) {
      const escapedAlias = alias.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const regex = new RegExp(
        `^${escapedAlias}(?:\\s*[:：\\-—]\\s*(.*))?$`,
        "i"
      );

      const match = cleanedLine.match(regex);

      if (match) {
        return {
          definition,
          remaining: match[1]?.trim() || "",
        };
      }
    }
  }

  return null;
};

const parseTextPeriods = (
  lines: string[]
): PeriodSection[] => {
  const sectionMap = new Map<
    string,
    PeriodSection
  >();

  let currentPeriod: PeriodDefinition | null = null;
  let currentLines: string[] = [];
  const looseLines: string[] = [];

  const flushCurrentPeriod = () => {
    if (!currentPeriod) return;

    const content = currentLines
      .join("\n")
      .trim();

    addPeriodSection(
      sectionMap,
      currentPeriod,
      content
    );

    currentLines = [];
  };

  lines.forEach((line) => {
    const periodMatch = getPeriodFromLine(line);

    if (periodMatch) {
      flushCurrentPeriod();

      currentPeriod = periodMatch.definition;
      currentLines = periodMatch.remaining
        ? [periodMatch.remaining]
        : [];

      return;
    }

    if (currentPeriod) {
      currentLines.push(line);
    } else if (line.trim()) {
      looseLines.push(line);
    }
  });

  flushCurrentPeriod();

  const sections = Array.from(sectionMap.values()).sort(
    (first, second) => first.order - second.order
  );

  if (sections.length > 0) {
    return sections;
  }

  const looseContent = looseLines
    .join("\n")
    .trim();

  if (!looseContent) {
    return [];
  }

  return [
    {
      title: "Itinerary",
      icon: "🗺️",
      order: 100,
      content: looseContent,
    },
  ];
};

const parseTextItinerary = (
  result: any
): DaySection[] => {
  const text =
    typeof result === "string"
      ? result
      : JSON.stringify(result, null, 2);

  const lines = normalizeTextLines(text);

  const days: {
    title: string;
    lines: string[];
  }[] = [];

  let currentDay: {
    title: string;
    lines: string[];
  } | null = null;

  lines.forEach((line) => {
    const dayHeading = getDayHeading(line);

    if (dayHeading) {
      if (currentDay) {
        days.push(currentDay);
      }

      currentDay = {
        title: dayHeading,
        lines: [],
      };

      return;
    }

    if (currentDay) {
      currentDay.lines.push(line);
    }
  });

  if (currentDay) {
    days.push(currentDay);
  }

  if (days.length === 0) {
    return [
      {
        title: "Your itinerary",
        sections: parseTextPeriods(lines),
      },
    ].filter((day) => day.sections.length > 0);
  }

  return days
    .map((day) => ({
      title: day.title,
      sections: parseTextPeriods(day.lines),
    }))
    .filter((day) => day.sections.length > 0);
};

const parseItinerary = (result: any): DaySection[] => {
  const structuredResult =
    parseStructuredItinerary(result);

  if (structuredResult) {
    return structuredResult;
  }

  return parseTextItinerary(result);
};

export default function ShareTripPage() {
  const params = useParams();

  const id = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const toastTimer =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let pageIsActive = true;

    const loadTrip = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("trip_records")
        .select("*")
        .eq("id", id)
        .eq("public", true)
        .single();

      if (!pageIsActive) return;

      if (error) {
        console.log("Load shared trip error:", error);
        setTrip(null);
        setLoading(false);
        return;
      }

      setTrip(data);
      setLoading(false);
    };

    loadTrip();

    return () => {
      pageIsActive = false;
    };
  }, [id]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const showToast = (message: string) => {
    setToast(message);

    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    toastTimer.current = setTimeout(() => {
      setToast("");
    }, 1800);
  };

  const copyShareLink = async () => {
    const shareUrl = window.location.href;

    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast("📎 分享链接已复制");
    } catch {
      window.prompt("复制下面的分享链接：", shareUrl);
    }
  };

  const formatCreatedDate = (date: string) => {
    return new Date(date).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <Navbar />

        <main className="flex min-h-[75vh] items-center justify-center px-5">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-gray-200 border-t-gray-950" />

            <p className="mt-5 text-sm text-gray-500">
              ✈️ 正在打开这份旅行计划……
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <Navbar />

        <main className="flex min-h-[75vh] items-center justify-center px-5">
          <div className="w-full max-w-md rounded-[2rem] border border-gray-200 bg-white p-8 text-center shadow-xl shadow-gray-200/50">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-100 text-3xl">
              🔒
            </div>

            <h1 className="mt-6 text-2xl font-bold tracking-tight text-gray-950">
              This trip is unavailable
            </h1>

            <p className="mt-3 text-sm leading-7 text-gray-500">
              这份旅行可能是私人行程、已经被删除，或者分享链接不正确。
            </p>

            <a
              href="/"
              className="mt-7 inline-flex w-full items-center justify-center rounded-2xl bg-gray-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              ✨ Create my own trip
            </a>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  const itineraryDays = parseItinerary(trip.result);

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-950">
      <Navbar />

      <main className="px-5 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-6xl space-y-8">
          <section className="relative overflow-hidden rounded-[2.25rem] bg-gray-950 p-7 text-white shadow-2xl shadow-gray-300/60 md:p-10">
            <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-purple-500/30 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-32 left-20 h-80 w-80 rounded-full bg-pink-500/20 blur-3xl" />

            <div className="pointer-events-none absolute right-1/3 top-1/2 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl" />

            <div className="relative">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur">
                      ✈️ Shared with TripMuse
                    </span>

                    <span className="rounded-full bg-green-400/15 px-3 py-1.5 text-xs font-semibold text-green-200">
                      🌍 Public trip
                    </span>
                  </div>

                  <p className="mt-8 text-sm font-medium uppercase tracking-[0.25em] text-white/50">
                    A journey to
                  </p>

                  <h1 className="mt-3 break-words text-4xl font-black tracking-[-0.04em] sm:text-5xl md:text-6xl">
                    {trip.destination}
                  </h1>

                  <p className="mt-5 max-w-2xl text-sm leading-7 text-white/60 md:text-base">
                    A personalized AI itinerary created with TripMuse.
                    Explore the journey day by day.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur">
                    <p className="text-xs text-white/50">
                      Duration
                    </p>

                    <p className="mt-1 text-lg font-bold">
                      {trip.days} days
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur">
                    <p className="text-xs text-white/50">
                      Budget
                    </p>

                    <p className="mt-1 text-lg font-bold">
                      ¥{trip.budget}
                    </p>
                  </div>

                  <div className="col-span-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur sm:col-span-1">
                    <p className="text-xs text-white/50">
                      Created
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      {formatCreatedDate(trip.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-9 flex flex-wrap gap-3">
                <button
                  onClick={copyShareLink}
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-gray-950 transition hover:-translate-y-0.5 hover:bg-gray-100"
                >
                  🔗 Copy link
                </button>

                <a
                  href="/#planner"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  ✨ Create my own trip
                </a>
              </div>
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-500">
                  Day by day
                </p>

                <h2 className="mt-3 text-3xl font-bold tracking-tight">
                  Travel itinerary
                </h2>

                <p className="mt-3 text-sm leading-7 text-gray-500">
                  从早晨到夜晚，按时间顺序浏览完整的旅行安排。
                </p>
              </div>

              {itineraryDays.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white p-10 text-center">
                  <div className="text-4xl">🗺️</div>

                  <h3 className="mt-4 text-lg font-bold">
                    暂时没有行程内容
                  </h3>
                </div>
              ) : (
                itineraryDays.map((day, dayIndex) => (
                  <section
                    key={`${day.title}-${dayIndex}`}
                    className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm"
                  >
                    <div className="flex items-center gap-4 border-b border-gray-100 bg-gradient-to-r from-pink-50 via-purple-50 to-blue-50 px-6 py-5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-950 text-sm font-bold text-white">
                        {dayIndex + 1}
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                          Day plan
                        </p>

                        <h3 className="mt-1 text-xl font-bold tracking-tight">
                          {day.title}
                        </h3>
                      </div>
                    </div>

                    <div className="p-6 md:p-8">
                      {day.sections.map(
                        (section, sectionIndex) => {
                          const isLastSection =
                            sectionIndex ===
                            day.sections.length - 1;

                          return (
                            <article
                              key={`${section.title}-${sectionIndex}`}
                              className="relative flex gap-4 pb-8 last:pb-0"
                            >
                              {!isLastSection && (
                                <div className="absolute bottom-0 left-5 top-10 w-px bg-gray-200" />
                              )}

                              <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-xl shadow-sm">
                                {section.icon}
                              </div>

                              <div className="min-w-0 flex-1 pt-1">
                                <h4 className="text-base font-bold text-gray-950">
                                  {section.title}
                                </h4>

                                <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-8 text-gray-600">
                                  {section.content}
                                </div>
                              </div>
                            </article>
                          );
                        }
                      )}
                    </div>
                  </section>
                ))
              )}
            </div>

            <aside>
              <div className="sticky top-24 space-y-5">
                <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                    Trip snapshot
                  </p>

                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                      <span className="text-sm text-gray-500">
                        Destination
                      </span>

                      <span className="max-w-[150px] truncate text-sm font-semibold">
                        {trip.destination}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                      <span className="text-sm text-gray-500">
                        Duration
                      </span>

                      <span className="text-sm font-semibold">
                        {trip.days} days
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                      <span className="text-sm text-gray-500">
                        Budget
                      </span>

                      <span className="text-sm font-semibold">
                        ¥{trip.budget}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Status
                      </span>

                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                        Public
                      </span>
                    </div>
                  </div>
                </section>

                <section className="relative overflow-hidden rounded-[2rem] bg-gray-950 p-6 text-white">
                  <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-pink-500/30 blur-3xl" />

                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">
                      ✨
                    </div>

                    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                      Plan your journey
                    </p>

                    <h3 className="mt-2 text-xl font-bold">
                      Where will you go next?
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-white/60">
                      输入目的地、天数和预算，让 AI 在几十秒内生成专属行程。
                    </p>

                    <a
                      href="/#planner"
                      className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-950 transition hover:bg-gray-100"
                    >
                      Create my trip
                    </a>
                  </div>
                </section>

                <p className="text-center text-xs text-gray-400">
                  Powered by{" "}
                  <span className="font-semibold text-gray-600">
                    TripMuse ✈️
                  </span>
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-2xl bg-gray-950 px-5 py-3 text-sm font-medium text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}