
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json(
      {
        error: "Missing Supabase environment variables",
      },
      { status: 500 }
    );
  }

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const { data: events, error: eventsError } =
    await supabase
      .from("analytics_events")
      .select("*");

  if (eventsError) {
    console.error(
      "Failed to load analytics events:",
      eventsError
    );

    return Response.json(
      {
        error: "Failed to load analytics events",
      },
      { status: 500 }
    );
  }

  const safeEvents = events ?? [];

  const validUserIds = safeEvents
    .map((event) => event.user_id)
    .filter(
      (
        userId
      ): userId is string =>
        typeof userId === "string" &&
        userId.trim().length > 0
    );

  const users = new Set(validUserIds).size;

  const successfulPayments =
    safeEvents.filter(
      (event) =>
        event.event === "payment_success"
    ).length;

  const generations =
    safeEvents.filter(
      (event) => event.event === "generate"
    ).length;

  const referrals =
    safeEvents.filter(
      (event) =>
        event.event === "referral_success"
    ).length;

  const revenue =
    successfulPayments * 9.9;

  const cost =
    generations * 2;

  const profit =
    revenue - cost;

  const conversion =
    users > 0
      ? successfulPayments / users
      : 0;

  return Response.json({
    users,
    successfulPayments,
    generations,
    revenue,
    cost,
    profit,
    referrals,
    conversion,
    health:
      profit > 0 && conversion > 0.03
        ? "scaling"
        : "needs_work",
  });
}

