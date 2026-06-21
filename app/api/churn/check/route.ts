import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: users } = await supabase
    .from("users")
    .select("id, plan, credits");

  for (const user of users || []) {
    // ❌ inactive free users
    if (user.plan === "free" && user.credits === 3) {
      await supabase.from("analytics_events").insert({
        user_id: user.id,
        event: "churn_risk",
      });
    }

    // ❌ pro but no usage
    if (user.plan === "pro" && user.credits === -1) {
      await supabase.from("analytics_events").insert({
        user_id: user.id,
        event: "power_user_idle",
      });
    }
  }

  return Response.json({ ok: true });
}