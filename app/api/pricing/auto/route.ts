
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

  const users =
    new Set(validUserIds).size;

  const payments =
    safeEvents.filter(
      (event) =>
        event.event === "payment_success"
    ).length;

  const conversion =
    users > 0
      ? payments / users
      : 0;

  let recommendedPrice = 9.9;

  if (conversion > 0.05) {
    recommendedPrice = 14.9;
  }

  if (conversion > 0.1) {
    recommendedPrice = 19.9;
  }

  return Response.json({
    users,
    payments,
    conversion,
    recommendedPrice,
  });
}

