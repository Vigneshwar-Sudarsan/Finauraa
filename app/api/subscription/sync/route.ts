import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

// Use service role for database updates to bypass RLS
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/subscription/sync
 * Syncs subscription data from Stripe to database
 * Call this after checkout to ensure database is updated
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, stripe_subscription_id, subscription_tier")
      .eq("id", user.id)
      .single();

    // If we already have subscription info and it's not free, we're good
    if (profile?.stripe_subscription_id && profile?.subscription_tier !== "free") {
      return NextResponse.json({
        success: true,
        message: "Subscription already synced",
        tier: profile.subscription_tier
      });
    }

    // Try to find subscription by customer ID
    let customerId = profile?.stripe_customer_id;

    // If no customer ID, search by email
    if (!customerId) {
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;

        // Update profile with customer ID (use admin client to bypass RLS)
        await supabaseAdmin
          .from("profiles")
          .update({
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      }
    }

    if (!customerId) {
      return NextResponse.json({
        success: false,
        message: "No Stripe customer found",
        tier: "free"
      });
    }

    // Get subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No subscriptions found",
        tier: "free"
      });
    }

    const subscription = subscriptions.data[0];

    // Only process active/trialing subscriptions
    if (!["active", "trialing"].includes(subscription.status)) {
      return NextResponse.json({
        success: false,
        message: `Subscription status is ${subscription.status}`,
        tier: "free"
      });
    }

    // Map price to tier
    const priceId = subscription.items.data[0]?.price.id;
    const proPriceIds = [
      process.env.STRIPE_PRO_PRICE_ID_MONTHLY,
      process.env.STRIPE_PRO_PRICE_ID_YEARLY,
    ].filter(Boolean);
    const familyPriceIds = [
      process.env.STRIPE_FAMILY_PRICE_ID_MONTHLY,
      process.env.STRIPE_FAMILY_PRICE_ID_YEARLY,
    ].filter(Boolean);

    let tier: "free" | "pro" | "family" = "pro"; // default to pro if we have an active sub
    if (proPriceIds.includes(priceId)) {
      tier = "pro";
    } else if (familyPriceIds.includes(priceId)) {
      tier = "family";
    }

    // Map status
    const statusMap: Record<string, string> = {
      active: "active",
      trialing: "trialing",
      past_due: "past_due",
      canceled: "canceled",
      incomplete: "incomplete",
      incomplete_expired: "canceled",
      unpaid: "past_due",
      paused: "paused",
    };
    let status = statusMap[subscription.status] || "active";

    if (subscription.cancel_at_period_end && subscription.status === "active") {
      status = "canceling";
    }

    // Get dates
    const subscriptionItem = subscription.items.data[0];
    const startedAt = new Date(subscription.created * 1000).toISOString();
    const endsAt = subscriptionItem?.current_period_end
      ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
      : null;
    const trialEndsAt = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null;

    // Update profile with all subscription info (use admin client to bypass RLS)
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        subscription_tier: tier,
        subscription_status: status,
        subscription_started_at: startedAt,
        subscription_ends_at: endsAt,
        trial_ends_at: trialEndsAt,
        is_pro: true, // Always true since we only sync active subscriptions
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      console.error("Failed to update profile:", error);
      return NextResponse.json(
        { error: "Failed to update subscription in database" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Subscription synced successfully",
      tier,
      status,
    });
  } catch (error) {
    console.error("Subscription sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync subscription" },
      { status: 500 }
    );
  }
}
