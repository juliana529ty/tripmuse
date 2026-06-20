import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !stripeSecretKey ||
    !webhookSecret ||
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    console.error("Webhook environment variables are incomplete.");

    return Response.json(
      {
        received: false,
        error: "Webhook environment variables are incomplete.",
      },
      {
        status: 500,
      }
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json(
      {
        received: false,
        error: "Missing Stripe signature.",
      },
      {
        status: 400,
      }
    );
  }

  const rawBody = await request.text();

  // 不再手动指定旧版 apiVersion
  const stripe = new Stripe(stripeSecretKey);

  const supabaseAdmin = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error("Stripe webhook signature error:", error);

    return Response.json(
      {
        received: false,
        error: "Invalid Stripe webhook signature.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session =
        event.data.object as Stripe.Checkout.Session;

      const userId = session.metadata?.user_id;

      const customerEmail =
        session.customer_details?.email ||
        session.customer_email ||
        null;

      if (!userId) {
        console.warn(
          "Checkout session has no user_id metadata:",
          session.id
        );

        return Response.json({
          received: true,
          upgraded: false,
          reason: "Missing user_id metadata.",
        });
      }

      const { error } = await supabaseAdmin
        .from("users")
        .upsert(
          {
            id: userId,
            email: customerEmail,
            plan: "pro",
            credits: -1,
          },
          {
            onConflict: "id",
          }
        );

      if (error) {
        console.error("Failed to upgrade user:", error);

        return Response.json(
          {
            received: true,
            upgraded: false,
            error: "Failed to update the user subscription.",
          },
          {
            status: 500,
          }
        );
      }

      console.log("TripMuse user upgraded to Pro:", {
        userId,
        customerEmail,
        checkoutSessionId: session.id,
      });

      return Response.json({
        received: true,
        upgraded: true,
      });
    }

    return Response.json({
      received: true,
      ignored: true,
      eventType: event.type,
    });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);

    return Response.json(
      {
        received: true,
        error:
          error instanceof Error
            ? error.message
            : "Webhook processing failed.",
      },
      {
        status: 500,
      }
    );
  }
}