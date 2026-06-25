import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/* -----------------------------
   🌍 中文 → 英文映射
------------------------------ */
const EN_MAP = {
  重庆: "Chongqing",
  长沙: "Changsha",
  北京: "Beijing",
  上海: "Shanghai",
  深圳: "Shenzhen",
  成都: "Chengdu",
  杭州: "Hangzhou",
  广州: "Guangzhou",
};

function normalizeDestination(input) {
  if (!input) return "";
  return EN_MAP[input] || input;
}

/* -----------------------------
   🚀 MAIN API
------------------------------ */
export async function POST(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !deepseekApiKey) {
    return Response.json({ error: "Missing env config" }, { status: 500 });
  }

  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser(token);

  if (!user) {
    return Response.json({ error: "Invalid user" }, { status: 401 });
  }

  const body = await request.json();

  const destinationRaw = String(body?.destination || "").trim();
  const days = Number(body?.days || 3);
  const budget = String(body?.budget || "").trim();
  const preferences = String(body?.preferences || "").trim();

  if (!destinationRaw || !days || !budget) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const destination = normalizeDestination(destinationRaw);

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("plan, credits")
    .eq("id", user.id)
    .maybeSingle();

  const plan = profile?.plan === "pro" ? "pro" : "free";
  let credits = plan === "pro" ? -1 : profile?.credits ?? 3;

  if (plan !== "pro" && credits <= 0) {
    return Response.json({ error: "No credits left" }, { status: 403 });
  }

  /* -----------------------------
     🤖 AI PROMPT (FIXED → JSON ONLY)
  ------------------------------ */
  const prompt = `
You are TripMuse AI.

CRITICAL RULE:
Return ONLY valid JSON. No markdown. No explanation.

JSON FORMAT:
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
`.trim();

  const deepseekResponse = await fetch(
    "https://api.deepseek.com/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.7,
        messages: [
          { role: "system", content: prompt },
          {
            role: "user",
            content: `
Destination: ${destination}
Days: ${days}
Budget: ${budget}
Preferences: ${preferences}
            `.trim(),
          },
        ],
      }),
    }
  );

  const data = await deepseekResponse.json();

  const raw = data?.choices?.[0]?.message?.content;

  let result;

  try {
    result = JSON.parse(raw);
  } catch (e) {
    console.error("AI JSON parse failed:", raw);
    return Response.json(
      { error: "Invalid AI response format" },
      { status: 500 }
    );
  }

  /* -----------------------------
     💳 credits
  ------------------------------ */
  if (plan !== "pro") {
    await supabaseAdmin
      .from("users")
      .update({
        credits: Math.max(credits - 1, 0),
      })
      .eq("id", user.id);
  }

  return Response.json({
    result,
    plan,
    creditsRemaining: plan === "pro" ? null : Math.max(credits - 1, 0),
  });
}