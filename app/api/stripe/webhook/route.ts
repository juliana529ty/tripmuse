import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Stripe init（稳定写法）
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return Response.json({ error: "Missing signature" }, { status: 400 });
    }

    const rawBody = await request.text();

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return Response.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log("Stripe event:", event.type);

    // -------------------------
    // Checkout success
    // -------------------------
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.metadata?.user_id;

      if (!userId) {
        console.error("No user_id in metadata");
        return Response.json({ error: "No user_id" }, { status: 400 });
      }

      const { error } = await supabase
        .from("users")
        .update({
          plan: "pro",
          credits: -1,
        })
        .eq("id", userId);

      if (error) {
        console.error("Supabase update failed:", error);
        return Response.json(
          { error: "Failed to update user plan" },
          { status: 500 }
        );
      }

      console.log("User upgraded to pro:", userId);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);

    return Response.json(
      { error: "Webhook failed" },
      { status: 500 }
    );
  }
}