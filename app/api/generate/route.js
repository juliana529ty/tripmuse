import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/* -----------------------------
   🌍 统一英文映射层（解决中文污染）
------------------------------ */
const EN_MAP = {
  "重庆": "Chongqing",
  "长沙": "Changsha",
  "北京": "Beijing",
  "上海": "Shanghai",
  "深圳": "Shenzhen",
  "成都": "Chengdu",
  "杭州": "Hangzhou",
  "广州": "Guangzhou",
};

function normalizeDestination(input) {
  if (!input) return "";
  return EN_MAP[input] || input;
}

/* -----------------------------
   🚀 API ROUTE
------------------------------ */
export async function POST(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !deepseekApiKey) {
    return Response.json(
      { error: "Missing env config" },
      { status: 500 }
    );
  }

  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

  const { data: { user } } = await supabaseAuth.auth.getUser(accessToken);

  if (!user) {
    return Response.json({ error: "Invalid user" }, { status: 401 });
  }

  const body = await request.json();

  const destinationRaw = String(body?.destination || "").trim();
  const days = String(body?.days || "").trim();
  const budget = String(body?.budget || "").trim();
  const preferences = String(body?.preferences || "").trim();

  if (!destinationRaw || !days || !budget) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  /* -----------------------------
     🌍 强制英文化输入
  ------------------------------ */
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
    return Response.json(
      { error: "No credits left" },
      { status: 403 }
    );
  }

  /* -----------------------------
     🤖 AI CALL（强制英文输出）
  ------------------------------ */
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
          {
            role: "system",
            content: `
You are TripMuse, a professional AI travel planner.

CRITICAL RULES:
- Output ONLY English
- NEVER output Chinese
- If input is non-English, translate internally first
- Be structured, practical, and realistic

FORMAT:
Day 1:
Morning:
Afternoon:
Evening:

Then include:
- Budget breakdown
- Travel tips
            `.trim(),
          },
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

  const result = data?.choices?.[0]?.message?.content ?? "";

  /* -----------------------------
     💳 credits update
  ------------------------------ */
  if (plan !== "pro") {
    await supabaseAdmin
      .from("users")
      .update({
        credits: Math.max((credits ?? 1) - 1, 0),
      })
      .eq("id", user.id);
  }

  /* -----------------------------
     📦 response
  ------------------------------ */
  return Response.json({
    result,
    plan,
    creditsRemaining: plan === "pro" ? null : Math.max((credits ?? 1) - 1, 0),
  });
}