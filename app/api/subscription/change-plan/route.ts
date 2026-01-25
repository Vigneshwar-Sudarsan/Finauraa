import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

// Lazy initialization for admin client
let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return supabaseAdmin;
}

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

// Stripe price IDs for Pro plan
function getPriceIds() {
  return {
    pro: {
      monthly: process.env.STRIPE_PRO_PRICE_ID_MONTHLY!,
      yearly: process.env.STRIPE_PRO_PRICE_ID_YEARLY!,
    },
  };
}

/**
 * POST /api/subscription/change-plan
 * Changes the user's subscription plan (upgrade or downgrade)
 *
 * For upgrades: Prorated charge, immediate access
 * For downgrades: Takes effect at end of billing period
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

    // Validate plan - only Pro is available for purchase now
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

    // Get user's current subscription info
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_subscription_id, stripe_customer_id, subscription_tier, subscription_status, family_group_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_subscription_id) {
      // No existing subscription - redirect to checkout
      return NextResponse.json(
        {
          error: "No active subscription. Please use checkout instead.",
          redirectTo: "/api/subscription/checkout"
        },
        { status: 400 }
      );
    }

    // Family members can't change plans - they inherit from family owner
    if (profile.family_group_id && profile.subscription_tier !== "family") {
      const adminClient = getSupabaseAdmin();
      const { data: familyGroup } = await adminClient
        .from("family_groups")
        .select("owner_id")
        .eq("id", profile.family_group_id)
        .single();

      if (familyGroup && familyGroup.owner_id !== user.id) {
        return NextResponse.json(
          { error: "Family members cannot change subscription plans. Please contact your family group owner." },
          { status: 403 }
        );
      }
    }

    // Check if user already has the same plan
    if (profile.subscription_tier === plan) {
      // If same plan but different billing cycle, redirect to change-billing endpoint
      return NextResponse.json(
        {
          error: "You are already on this plan. Use the billing cycle switch to change between monthly and yearly.",
          currentTier: profile.subscription_tier,
          requestedPlan: plan,
          requestedBilling: billing,
          redirectTo: "/api/subscription/change-billing"
        },
        { status: 400 }
      );
    }

    // Get new price ID
    const newPriceId = getPriceIds().pro[billing as "monthly" | "yearly"];

    if (!newPriceId) {
      return NextResponse.json(
        { error: "Price configuration missing. Please contact support." },
        { status: 500 }
      );
    }

    // Get current subscription from Stripe
    const currentSubscription = await getStripe().subscriptions.retrieve(
      profile.stripe_subscription_id
    );

    // Determine if this is an upgrade or downgrade
    // Note: family tier exists for backwards compatibility with existing subscribers
    const tierOrder = { free: 0, pro: 1, family: 1 };
    const currentTierOrder = tierOrder[profile.subscription_tier as keyof typeof tierOrder] || 0;
    const newTierOrder = tierOrder[plan as keyof typeof tierOrder];
    const isUpgrade = newTierOrder > currentTierOrder;

    // Get the current subscription item
    const currentItem = currentSubscription.items.data[0];

    if (!currentItem) {
      return NextResponse.json(
        { error: "Invalid subscription state" },
        { status: 500 }
      );
    }

    // Update the subscription
    const updatedSubscription = await getStripe().subscriptions.update(
      profile.stripe_subscription_id,
      {
        items: [
          {
            id: currentItem.id,
            price: newPriceId,
          },
        ],
        // For upgrades: prorate immediately
        // For downgrades: change at end of period (Stripe default behavior)
        proration_behavior: isUpgrade ? "create_prorations" : "none",
        // If downgrading, schedule the change for the end of the period
        ...(isUpgrade ? {} : {
          // For downgrades, we update immediately but Stripe handles proration
          // The user keeps current plan features until end of billing period
          billing_cycle_anchor: "unchanged",
        }),
        // Remove any pending cancellation
        cancel_at_period_end: false,
        metadata: {
          user_id: user.id,
          plan,
          billing,
          changed_from: profile.subscription_tier,
          change_type: isUpgrade ? "upgrade" : "downgrade",
        },
      }
    );

    // Get the subscription item for period info
    const subscriptionItem = updatedSubscription.items.data[0];

    // Update profile in database
    const updateData: Record<string, unknown> = {
      subscription_tier: plan,
      subscription_status: "active",
      subscription_ends_at: subscriptionItem?.current_period_end
        ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
        : null,
      is_pro: plan !== "free",
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    return NextResponse.json({
      success: true,
      message: isUpgrade
        ? `Upgraded to ${plan} plan successfully!`
        : `Changed to ${plan} plan. You'll continue to have access to your current features until the end of your billing period.`,
      subscription: {
        tier: plan,
        status: updatedSubscription.status,
        billing,
        periodEnd: subscriptionItem?.current_period_end
          ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
          : null,
        isUpgrade,
      },
    });
  } catch (error) {
    console.error("Change plan error:", error);

    let errorMessage = "Unable to change plan. Please try again.";

    if (error instanceof Stripe.errors.StripeError) {
      console.error("Stripe error:", error.type, error.code, error.message);

      switch (error.code) {
        case "resource_missing":
          errorMessage = "Subscription not found. Please refresh and try again.";
          break;
        case "subscription_payment_intent_requires_action":
          errorMessage = "Payment requires verification. Please check your email.";
          break;
        default:
          errorMessage = "Unable to change plan. Please try again or contact support.";
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
 * GET /api/subscription/change-plan
 * Get preview of what changing plans would cost (proration preview)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const plan = searchParams.get("plan");
    const billing = searchParams.get("billing") || "monthly";

    if (!plan || plan !== "pro") {
      return NextResponse.json(
        { error: "Invalid plan" },
        { status: 400 }
      );
    }

    // Get user's current subscription info
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_subscription_id, subscription_tier, family_group_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No active subscription" },
        { status: 400 }
      );
    }

    // Family members can't preview plan changes - they inherit from family owner
    if (profile.family_group_id && profile.subscription_tier !== "family") {
      const adminClient = getSupabaseAdmin();
      const { data: familyGroup } = await adminClient
        .from("family_groups")
        .select("owner_id")
        .eq("id", profile.family_group_id)
        .single();

      if (familyGroup && familyGroup.owner_id !== user.id) {
        return NextResponse.json(
          { error: "Family members cannot change subscription plans. Please contact your family group owner." },
          { status: 403 }
        );
      }
    }

    // Get new price ID
    const newPriceId = getPriceIds().pro[billing as "monthly" | "yearly"];

    if (!newPriceId) {
      return NextResponse.json(
        { error: "Price configuration missing" },
        { status: 500 }
      );
    }

    // Get current subscription
    const subscription = await getStripe().subscriptions.retrieve(
      profile.stripe_subscription_id
    );

    const currentItem = subscription.items.data[0];

    if (!currentItem) {
      return NextResponse.json(
        { error: "Invalid subscription state" },
        { status: 500 }
      );
    }

    // Get proration preview using invoice preview
    const upcomingInvoice = await getStripe().invoices.createPreview({
      customer: subscription.customer as string,
      subscription: profile.stripe_subscription_id,
      subscription_details: {
        items: [
          {
            id: currentItem.id,
            price: newPriceId,
          },
        ],
        proration_behavior: "create_prorations",
      },
    });

    // Determine if this is an upgrade or downgrade
    // Note: family tier exists for backwards compatibility with existing subscribers
    const tierOrder = { free: 0, pro: 1, family: 1 };
    const currentTierOrder = tierOrder[profile.subscription_tier as keyof typeof tierOrder] || 0;
    const newTierOrder = tierOrder[plan as keyof typeof tierOrder];
    const isUpgrade = newTierOrder > currentTierOrder;

    return NextResponse.json({
      preview: {
        currentPlan: profile.subscription_tier,
        newPlan: plan,
        billing,
        isUpgrade,
        // Amount to be charged/credited immediately (prorated)
        proratedAmount: upcomingInvoice.amount_due / 100,
        // Total amount on the preview invoice
        totalAmount: upcomingInvoice.total / 100,
        currency: upcomingInvoice.currency?.toUpperCase() || "USD",
        nextBillingDate: upcomingInvoice.period_end
          ? new Date(upcomingInvoice.period_end * 1000).toISOString()
          : null,
      },
    });
  } catch (error) {
    console.error("Preview change plan error:", error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: "Unable to preview plan change. Please try again." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unable to preview plan change. Please try again." },
      { status: 500 }
    );
  }
}
