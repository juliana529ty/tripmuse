import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// ✅ 正确 Stripe init（必须这样）
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  
});

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    const token = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");

    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return Response.json({ error: "Invalid user" }, { status: 401 });
    }

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

    // ⚠️ 必须保证 session.url 存在
    if (!session.url) {
      return Response.json(
        { error: "No checkout URL generated" },
        { status: 500 }
      );
    }

    return Response.json({
      url: session.url,
    });

  } catch (error: any) {
    console.error("Stripe checkout error:", error);

    return Response.json(
      { error: error.message || "Checkout failed" },
      { status: 500 }
    );
  }
}