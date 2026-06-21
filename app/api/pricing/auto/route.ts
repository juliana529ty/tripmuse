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

  const payments =
    events?.filter((e) => e.event === "payment_success").length;

  const conversion = users ? payments / users : 0;

  let recommendedPrice = 9.9;

  // 🔥 AUTO PRICE OPTIMIZATION
  if (conversion > 0.05) recommendedPrice = 14.9;
  if (conversion > 0.1) recommendedPrice = 19.9;

  return Response.json({
    users,
    conversion,
    recommendedPrice,
  });
}