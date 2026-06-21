import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const token = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");

  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return Response.json({ error: "Invalid user" }, { status: 401 });
  }

  const { referralCode } = await request.json();

  // -----------------------------
  // 1. FIND REFERRER
  // -----------------------------
  const { data: referrer } = await supabase
    .from("users")
    .select("id, credits")
    .eq("referral_code", referralCode)
    .maybeSingle();

  if (!referrer) {
    return Response.json({ error: "Invalid referral" });
  }

  // -----------------------------
  // 2. REWARD BOTH USERS
  // -----------------------------
  await supabase
    .from("users")
    .update({
      credits: referrer.credits + 1,
    })
    .eq("id", referrer.id);

  await supabase
    .from("users")
    .update({
      credits: 1,
    })
    .eq("id", user.id);

  // -----------------------------
  // 3. TRACK EVENT
  // -----------------------------
  await supabase.from("analytics_events").insert({
    user_id: user.id,
    event: "referral_success",
  });

  return Response.json({ success: true });
}