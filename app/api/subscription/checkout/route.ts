import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

// Lazy initialization to avoid build-time errors
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
    });
  }
  return stripe;
}

// Stripe price IDs for Pro plan (configure in Stripe Dashboard)
function getPriceIds() {
  return {
    pro: {
      monthly: process.env.STRIPE_PRO_PRICE_ID_MONTHLY!,
      yearly: process.env.STRIPE_PRO_PRICE_ID_YEARLY!,
    },
  };
}

/**
 * POST /api/subscription/checkout
 * Creates a Stripe checkout session for subscription upgrade
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan, billing = "monthly" } = await request.json();

    if (!plan || plan !== "pro") {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    if (!["monthly", "yearly"].includes(billing)) {
      return NextResponse.json(
        { error: "Invalid billing period" },
        { status: 400 }
      );
    }

    // Get user profile to check for existing Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, stripe_customer_id")
      .eq("id", user.id)
      .single();

    const PRICE_IDS = getPriceIds();
    const priceId = PRICE_IDS.pro[billing as "monthly" | "yearly"];

    if (!priceId) {
      return NextResponse.json(
        { error: "Price configuration missing. Please contact support." },
        { status: 500 }
      );
    }

    // Get or create Stripe customer
    let customerId = profile?.stripe_customer_id;

    const stripeClient = getStripe();
    if (!customerId) {
      const customer = await stripeClient.customers.create({
        email: profile?.email || user.email,
        name: profile?.full_name || undefined,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // Create checkout session
    const session = await stripeClient.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/settings/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/settings/subscription/plans?canceled=true`,
      metadata: {
        user_id: user.id,
        plan,
        billing,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan,
        },
        // Optional: Add trial period
        // trial_period_days: 7,
      },
      allow_promotion_codes: true,
      billing_address_collection: "required",
      // For Bahrain, you might want to specify currency
      // currency: 'bhd',
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Checkout error:", error);

    // Get error message safely
    let errorMessage = "Unable to start checkout. Please try again.";
    let statusCode = 500;

    if (error instanceof Stripe.errors.StripeError) {
      console.error("Stripe error:", error.type, error.code, error.message);
      statusCode = 400;

      // Handle specific Stripe errors with user-friendly messages
      switch (error.code) {
        case "resource_missing":
          if (error.message.includes("No such price")) {
            errorMessage = "This plan is temporarily unavailable. Please contact support.";
          } else if (error.message.includes("No such customer")) {
            errorMessage = "Account setup issue. Please try again or contact support.";
          } else {
            errorMessage = "Configuration error. Please contact support.";
          }
          break;
        case "card_declined":
          errorMessage = "Your card was declined. Please try a different payment method.";
          break;
        case "expired_card":
          errorMessage = "Your card has expired. Please use a different card.";
          break;
        case "incorrect_cvc":
          errorMessage = "Invalid security code. Please check and try again.";
          break;
        case "processing_error":
          errorMessage = "Payment processing error. Please try again in a moment.";
          break;
        case "rate_limit":
          errorMessage = "Too many requests. Please wait a moment and try again.";
          statusCode = 429;
          break;
        default:
          // For other Stripe errors, use a generic message
          errorMessage = "Payment service error. Please try again or contact support.";
      }
    } else if (error instanceof Error) {
      console.error("Error:", error.message, error.stack);
      errorMessage = "Something went wrong. Please try again.";
    } else {
      console.error("Unknown error type:", typeof error, error);
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
