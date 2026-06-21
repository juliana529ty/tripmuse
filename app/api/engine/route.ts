import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: events } = await supabase
    .from("analytics_events")
    .select("*");

  const users =
    new Set(events?.map((e) => e.user_id)).size;

  const revenue =
    events?.filter((e) => e.event === "payment_success").length *
    9.9;

  const cost =
    events?.filter((e) => e.event === "generate").length * 2;

  const profit = revenue - cost;

  const referrals =
    events?.filter((e) => e.event === "referral_success").length;

  const conversion = users ? revenue / users : 0;

  return Response.json({
    users,
    revenue,
    cost,
    profit,
    referrals,
    conversion,
    health:
      profit > 0 && conversion > 0.03 ? "scaling" : "needs_work",
  });
}