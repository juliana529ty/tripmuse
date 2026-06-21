import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // -----------------------------
  // 1. GET ALL PRO USERS
  // -----------------------------
  const { data: users } = await supabase
    .from("users")
    .select("id, stripe_customer_id, plan");

  if (!users) return Response.json({ ok: true });

  // -----------------------------
  // 2. VERIFY EACH USER
  // -----------------------------
  for (const user of users) {
    if (!user.stripe_customer_id) continue;

    const subs = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      status: "all",
      limit: 1,
    });

    const active = subs.data.find(
      (s) => s.status === "active"
    );

    const shouldBePro = !!active;

    if (!shouldBePro && user.plan === "pro") {
      await supabase
        .from("users")
        .update({
          plan: "free",
          credits: 3,
        })
        .eq("id", user.id);
    }

    if (shouldBePro && user.plan !== "pro") {
      await supabase
        .from("users")
        .update({
          plan: "pro",
          credits: -1,
        })
        .eq("id", user.id);
    }
  }

  return Response.json({ synced: true });
}