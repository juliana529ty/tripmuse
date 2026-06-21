
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
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

  const generateEvents = safeEvents.filter(
    (event) => event.event === "generate"
  );

  const totalCost = generateEvents.reduce(
    (sum, event) => {
      const rawCost = event.metadata?.cost;
      const cost =
        typeof rawCost === "number"
          ? rawCost
          : Number(rawCost ?? 0);

      return sum + (Number.isFinite(cost) ? cost : 0);
    },
    0
  );

  const successfulPayments = safeEvents.filter(
    (event) =>
      event.event === "payment_success"
  ).length;

  const revenue = successfulPayments * 9.9;
  const profit = revenue - totalCost;

  if (profit < 0) {
    const { error: alertError } = await supabase
      .from("analytics_events")
      .insert({
        user_id: "system",
        event: "loss_warning",
        metadata: {
          profit,
          revenue,
          totalCost,
          created_at: new Date().toISOString(),
        },
      });

    if (alertError) {
      console.error(
        "Failed to create loss warning:",
        alertError
      );
    }
  }

  return Response.json({
    revenue,
    totalCost,
    profit,
    successfulPayments,
    generationCount: generateEvents.length,
    status:
      profit >= 0
        ? "healthy"
        : "losing_money",
  });
}

