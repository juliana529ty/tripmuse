import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const token = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");

  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return Response.json({ error: "Invalid user" }, { status: 401 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription", // 💥 关键：订阅模式

    payment_method_types: ["card"],

    customer_email: user.email || undefined,

    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "TripMuse Pro",
            description: "Unlimited AI travel planning",
          },
          unit_amount: 999,
          recurring: {
            interval: "month",
          },
        },
        quantity: 1,
      },
    ],

    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?cancel=1`,

    metadata: {
      user_id: user.id,
    },
  });

  return Response.json({ url: session.url });
}