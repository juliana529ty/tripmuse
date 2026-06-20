import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!stripeSecretKey || !supabaseUrl || !supabaseAnonKey) {
      return Response.json(
        { url: null, error: "服务器支付配置不完整" },
        { status: 500 }
      );
    }

    const authorization = request.headers.get("authorization");
    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;

    if (!accessToken) {
      return Response.json(
        { url: null, error: "请先登录后再升级 Pro" },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return Response.json(
        { url: null, error: "登录状态已失效，请重新登录" },
        { status: 401 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);
    const requestUrl = new URL(request.url);
    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin
    ).replace(/\/$/, "");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email || undefined,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        product: "tripmuse_pro",
        plan: "monthly",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          product: "tripmuse_pro",
          plan: "monthly",
        },
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "TripMuse Pro",
              description:
                "Unlimited AI travel planning and premium TripMuse features.",
            },
            unit_amount: 999,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: `${siteUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/dashboard?checkout=canceled`,
    });

    if (!session.url) {
      throw new Error("Stripe 没有返回支付页面地址");
    }

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Checkout error:", error);

    return Response.json(
      {
        url: null,
        error:
          error instanceof Error
            ? error.message
            : "创建 Stripe 支付页面失败",
      },
      { status: 500 }
    );
  }
}
