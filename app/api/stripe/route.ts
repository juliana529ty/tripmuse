import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      console.error("Missing STRIPE_SECRET_KEY");

      return Response.json(
        {
          url: null,
          error: "服务器尚未配置 Stripe 密钥",
        },
        {
          status: 500,
        }
      );
    }

    const stripe = new Stripe(secretKey);

    const requestUrl = new URL(request.url);

    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin
    ).replace(/\/$/, "");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

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

      success_url: `${siteUrl}/?success=1&session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${siteUrl}/?canceled=1`,

      metadata: {
        product: "tripmuse_pro",
        plan: "monthly",
      },
    });

    if (!session.url) {
      throw new Error("Stripe 没有返回支付页面地址");
    }

    return Response.json({
      url: session.url,
    });
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
      {
        status: 500,
      }
    );
  }
}