import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

// Stripe price IDs for each plan (configure in Stripe Dashboard)
const PRICE_IDS = {
  pro: {
    monthly: process.env.STRIPE_PRO_PRICE_ID_MONTHLY!,
    yearly: process.env.STRIPE_PRO_PRICE_ID_YEARLY!,
  },
  family: {
    monthly: process.env.STRIPE_FAMILY_PRICE_ID_MONTHLY!,
    yearly: process.env.STRIPE_FAMILY_PRICE_ID_YEARLY!,
  },
};

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

    if (!plan || !["pro", "family"].includes(plan)) {
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

    const priceId = PRICE_IDS[plan as "pro" | "family"][billing as "monthly" | "yearly"];

    if (!priceId) {
      return NextResponse.json(
        { error: "Price configuration missing. Please contact support." },
        { status: 500 }
      );
    }

    // Get or create Stripe customer
    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
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
    const session = await stripe.checkout.sessions.create({
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

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
