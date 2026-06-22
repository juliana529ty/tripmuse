import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const runtime = "nodejs";

// Stripe init
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(request: Request) {
  try {
    // -------------------------
    // 1. AUTH
    // -------------------------
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const token = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");

    if (!token) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return Response.json(
        { error: "Invalid user" },
        { status: 401 }
      );
    }

    // -------------------------
    // 2. CREATE STRIPE SESSION
    // -------------------------
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",

      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "TripMuse Pro",
            },
            unit_amount: 999,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],

      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=canceled`,

      metadata: {
        user_id: user.id,
      },
    });

    // -------------------------
    // 3. RETURN URL
    // -------------------------
    return Response.json({
      url: session.url,
    });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);

    return Response.json(
      {
        error: "Checkout failed",
      },
      { status: 500 }
    );
  }
}