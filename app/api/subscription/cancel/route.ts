import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

/**
 * POST /api/subscription/cancel
 * Cancels the user's subscription at the end of the billing period
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { immediate = false } = body;

    // Get user's subscription info
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_subscription_id, stripe_customer_id, subscription_tier")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    if (profile.subscription_tier === "free") {
      return NextResponse.json(
        { error: "You are already on the free plan" },
        { status: 400 }
      );
    }

    if (immediate) {
      // Cancel immediately - user loses access right away
      const subscription = await stripe.subscriptions.cancel(
        profile.stripe_subscription_id
      );

      // Update profile immediately
      await supabase
        .from("profiles")
        .update({
          subscription_tier: "free",
          subscription_status: "canceled",
          subscription_ends_at: new Date().toISOString(),
          is_pro: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      return NextResponse.json({
        success: true,
        message: "Subscription canceled immediately",
        subscription: {
          status: subscription.status,
          canceledAt: new Date().toISOString(),
        },
      });
    } else {
      // Cancel at end of billing period - user keeps access until then
      const subscription = await stripe.subscriptions.update(
        profile.stripe_subscription_id,
        { cancel_at_period_end: true }
      );

      // Get the subscription item for period end
      const subscriptionItem = subscription.items.data[0];
      const periodEnd = subscriptionItem?.current_period_end
        ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
        : null;

      // Update profile to show pending cancellation
      await supabase
        .from("profiles")
        .update({
          subscription_status: "canceling",
          subscription_ends_at: periodEnd,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      return NextResponse.json({
        success: true,
        message: "Subscription will be canceled at the end of the billing period",
        subscription: {
          status: "canceling",
          cancelAt: periodEnd,
        },
      });
    }
  } catch (error) {
    console.error("Cancel subscription error:", error);

    let errorMessage = "Unable to cancel subscription. Please try again.";

    if (error instanceof Stripe.errors.StripeError) {
      console.error("Stripe error:", error.type, error.code, error.message);

      if (error.code === "resource_missing") {
        errorMessage = "Subscription not found. Please refresh and try again.";
      }

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/subscription/cancel
 * Reactivates a subscription that was scheduled for cancellation
 */
export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's subscription info
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_subscription_id, subscription_status")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 400 }
      );
    }

    if (profile.subscription_status !== "canceling") {
      return NextResponse.json(
        { error: "Subscription is not scheduled for cancellation" },
        { status: 400 }
      );
    }

    // Reactivate the subscription
    const subscription = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      { cancel_at_period_end: false }
    );

    // Update profile
    await supabase
      .from("profiles")
      .update({
        subscription_status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    return NextResponse.json({
      success: true,
      message: "Subscription reactivated successfully",
      subscription: {
        status: subscription.status,
      },
    });
  } catch (error) {
    console.error("Reactivate subscription error:", error);

    let errorMessage = "Unable to reactivate subscription. Please try again.";

    if (error instanceof Stripe.errors.StripeError) {
      console.error("Stripe error:", error.type, error.code, error.message);

      if (error.code === "resource_missing") {
        errorMessage = "Subscription not found. Please refresh and try again.";
      }

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
