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

  const costs =
    events?.filter((e) => e.event === "generate") || [];

  const totalCost = costs.reduce(
    (sum, e) => sum + (e.metadata?.cost || 0),
    0
  );

  const revenue =
    events?.filter((e) => e.event === "payment_success").length *
    9.9;

  const profit = revenue - totalCost;

  // 🔥 AUTO ALERT IF LOSING MONEY
  if (profit < 0) {
    await supabase.from("analytics_events").insert({
      user_id: "system",
      event: "loss_warning",
      metadata: { profit },
    });
  }

  return Response.json({
    revenue,
    totalCost,
    profit,
    status: profit > 0 ? "healthy" : "losing_money",
  });
}