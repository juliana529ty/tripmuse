import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // -----------------------------
  // 1. LOAD EVENTS
  // -----------------------------
  const { data: events } = await supabase
    .from("analytics_events")
    .select("*");

  const revenueEvents =
    events?.filter((e) => e.event === "payment_success") || [];

  const generateEvents =
    events?.filter((e) => e.event === "generate") || [];

  // -----------------------------
  // 2. CALCULATE REVENUE
  // -----------------------------
  const revenue = revenueEvents.length * 9.9;

  // -----------------------------
  // 3. COST CALCULATION
  // -----------------------------
  const cost = generateEvents.reduce((sum, e) => {
    return sum + (e.metadata?.cost || 0);
  }, 0);

  const profit = revenue - cost;

  // -----------------------------
  // 4. USERS
  // -----------------------------
  const users = new Set(events?.map((e) => e.user_id)).size;

  // -----------------------------
  // 5. CONVERSION RATE
  // -----------------------------
  const conversion =
    users > 0 ? (revenueEvents.length / users) * 100 : 0;

  return Response.json({
    revenue,
    cost,
    profit,
    users,
    conversion: conversion.toFixed(2),
  });
}