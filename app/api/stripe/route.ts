import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      return Response.json(
        {
          url: null,
          error: "Stripe is not enabled in MVP mode.",
        },
        { status: 200 }
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
                "Unlimited AI travel planning and premium features.",
            },
            unit_amount: 999,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/?success=1`,
      cancel_url: `${siteUrl}/?canceled=1`,
    });

    return Response.json({
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe error:", error);

    return Response.json(
      {
        url: null,
        error:
          error instanceof Error
            ? error.message
            : "Stripe checkout failed",
      },
      { status: 500 }
    );
  }
}
