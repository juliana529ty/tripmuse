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

  const users = new Set(events?.map((e) => e.user_id)).size;

  const referrals =
    events?.filter((e) => e.event === "referral_success").length || 0;

  const payments =
    events?.filter((e) => e.event === "payment_success").length || 0;

  const retention =
    events?.filter((e) => e.event === "generate").length || 0;

  return Response.json({
    users,
    referrals,
    payments,
    retention,
    virality: users > 0 ? referrals / users : 0,
    conversion: users > 0 ? payments / users : 0,
  });
}