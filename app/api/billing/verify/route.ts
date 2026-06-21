import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // -----------------------------
  // 1. AUTH
  // -----------------------------
  const token = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");

  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase.auth.getUser(token);

  const user = data.user;

  if (!user) {
    return Response.json({ error: "Invalid user" }, { status: 401 });
  }

  // -----------------------------
  // 2. GET USER FROM DB
  // -----------------------------
  const { data: dbUser } = await supabase
    .from("users")
    .select("id, plan, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!dbUser?.stripe_customer_id) {
    return Response.json({ plan: "free" });
  }

  // -----------------------------
  // 3. CHECK STRIPE REAL STATUS
  // -----------------------------
  const subscriptions = await stripe.subscriptions.list({
    customer: dbUser.stripe_customer_id,
    status: "all",
    limit: 1,
  });

  const activeSub = subscriptions.data.find(
    (sub) =>
      sub.status === "active" ||
      sub.status === "trialing"
  );

  const isPro = !!activeSub;

  // -----------------------------
  // 4. SYNC BACK TO SUPABASE
  // -----------------------------
  if (!isPro && dbUser.plan === "pro") {
    await supabase
      .from("users")
      .update({
        plan: "free",
        credits: 3,
      })
      .eq("id", user.id);
  }

  if (isPro && dbUser.plan !== "pro") {
    await supabase
      .from("users")
      .update({
        plan: "pro",
        credits: -1,
      })
      .eq("id", user.id);
  }

  // -----------------------------
  // 5. RESPONSE
  // -----------------------------
  return Response.json({
    plan: isPro ? "pro" : "free",
    synced: true,
  });
}