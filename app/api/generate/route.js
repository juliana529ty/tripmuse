import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const REQUIRED_BUDGET_KEYS = ["hotel", "food", "transport", "ticket", "extra"];

function normalizeDestination(input) {
  return String(input || "").trim();
}

function asString(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(item))
    .filter(Boolean);
}

function buildFallbackDay(index, destination) {
  return {
    day: index + 1,
    morning: `Start with a relaxed local breakfast and explore a central area of ${destination}.`,
    afternoon: `Visit one major highlight in ${destination} and leave time for nearby streets or viewpoints.`,
    evening: `Enjoy dinner in a lively neighborhood and keep the evening flexible.`,
    tip: "Confirm opening hours, transit times, and reservations before you go.",
  };
}

function normalizeDays(value, requestedDays, destination) {
  const sourceDays = Array.isArray(value) ? value : [];
  const totalDays = Math.max(Number(requestedDays) || 1, sourceDays.length, 1);
  const normalizedDays = [];

  for (let index = 0; index < totalDays; index += 1) {
    const day = sourceDays[index];
    const record = day && typeof day === "object" ? day : {};
    const fallbackDay = buildFallbackDay(index, destination);

    normalizedDays.push({
      day: Number(record.day || fallbackDay.day),
      morning: asString(record.morning, fallbackDay.morning),
      afternoon: asString(record.afternoon, fallbackDay.afternoon),
      evening: asString(record.evening, fallbackDay.evening),
      tip: asString(record.tip, fallbackDay.tip),
    });
  }

  return normalizedDays;
}

function normalizeBudget(value, userBudget) {
  const record = value && typeof value === "object" ? value : {};
  const fallbackBudget = {
    hotel: "Choose lodging that fits your stated budget and preferred comfort level.",
    food: "Reserve part of your budget for local restaurants, cafes, snacks, and water.",
    transport: "Plan for local transit, ride-hailing, airport transfers, and short walks.",
    ticket: "Set aside funds for attractions, museums, tours, and timed-entry tickets.",
    extra: userBudget || "Keep a small buffer for souvenirs, tips, and unexpected changes.",
  };

  return REQUIRED_BUDGET_KEYS.reduce((budget, key) => {
    budget[key] = asString(record[key], fallbackBudget[key]);
    return budget;
  }, {});
}

function withFallbackItems(items, fallbacks) {
  return items.length > 0 ? items : fallbacks;
}

function normalizeTripResult(value, destination, days, budget) {
  const record = value && typeof value === "object" ? value : {};
  const normalizedDays = normalizeDays(record.days, days, destination);

  return {
    title: asString(record.title, `${destination} ${days}-Day Trip`),
    overview: asString(
      record.overview,
      `A personalized TripMuse itinerary for ${destination}.`
    ),
    days: normalizedDays,
    food: withFallbackItems(asStringArray(record.food), [
      "Try one local breakfast spot, one casual lunch, and one memorable dinner.",
      "Check recent reviews and reservation availability before committing.",
    ]),
    spots: withFallbackItems(asStringArray(record.spots || record.highlights), [
      `A central landmark or signature neighborhood in ${destination}.`,
      "A scenic viewpoint, museum, market, or walkable local district.",
    ]),
    tips: withFallbackItems(asStringArray(record.tips), [
      "Keep travel times realistic and leave room for rest between stops.",
      "Save offline maps, booking confirmations, and emergency contact details.",
    ]),
    budget: normalizeBudget(record.budget || { extra: budget }, budget),
  };
}

function extractJsonObject(raw) {
  if (!raw || typeof raw !== "string") return null;

  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

export async function POST(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !deepseekApiKey) {
    return Response.json({ error: "Missing environment configuration." }, { status: 500 });
  }

  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseAuth.auth.getUser(token);

  if (userError || !user) {
    return Response.json({ error: "Invalid user." }, { status: 401 });
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const destinationRaw = normalizeDestination(body?.destination);
  const tripDays = Number(body?.days || 3);
  const budget = asString(body?.budget);
  const preferences = asString(body?.preferences);

  if (!destinationRaw || !tripDays || tripDays < 1 || !budget) {
    return Response.json(
      { error: "Destination, days, and budget are required." },
      { status: 400 }
    );
  }

  const destination = normalizeDestination(destinationRaw);
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("plan, credits")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return Response.json({ error: "Unable to load billing profile." }, { status: 500 });
  }

  const plan = profile?.plan === "pro" ? "pro" : "free";
  const credits = plan === "pro" ? -1 : profile?.credits ?? 3;

  if (plan !== "pro" && credits <= 0) {
    return Response.json(
      {
        error: "No free trips remaining.",
        code: "FREE_LIMIT_REACHED",
        upgrade: true,
        plan,
        creditsRemaining: 0,
      },
      { status: 403 }
    );
  }

  const systemPrompt = `
You are TripMuse AI, a production travel planning engine.

Return strict JSON only. Do not include markdown, code fences, commentary,
explanations, or any text outside the JSON object.

The JSON object must have exactly this top-level shape:
{
  "title": "string",
  "overview": "string",
  "days": [
    {
      "day": 1,
      "morning": "string",
      "afternoon": "string",
      "evening": "string",
      "tip": "string"
    }
  ],
  "food": ["string"],
  "spots": ["string"],
  "tips": ["string"],
  "budget": {
    "hotel": "string",
    "food": "string",
    "transport": "string",
    "ticket": "string",
    "extra": "string"
  }
}

Create one entry in "days" for each requested travel day.
All copy must be in English.
`.trim();

  const deepseekResponse = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deepseekApiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: JSON.stringify({
            destination,
            days: tripDays,
            budget,
            preferences,
          }),
        },
      ],
    }),
  });

  if (!deepseekResponse.ok) {
    return Response.json(
      { error: "AI generation failed." },
      { status: deepseekResponse.status || 500 }
    );
  }

  const data = await deepseekResponse.json();
  const raw = data?.choices?.[0]?.message?.content;
  const parsed = extractJsonObject(raw);

  if (!parsed) {
    console.error("AI JSON parse failed:", raw);
    return Response.json({ error: "Invalid AI response format." }, { status: 500 });
  }

  const result = normalizeTripResult(parsed, destination, tripDays, budget);
  const creditsRemaining = plan === "pro" ? null : Math.max(credits - 1, 0);

  if (plan !== "pro") {
    const { error: creditsError } = await supabaseAdmin
      .from("users")
      .update({ credits: creditsRemaining })
      .eq("id", user.id);

    if (creditsError) {
      console.log("Credit update failed:", creditsError);
    }
  }

  return Response.json({
    result,
    plan,
    creditsRemaining,
    upgradeHint: plan !== "pro" && creditsRemaining <= 1,
  });
}
