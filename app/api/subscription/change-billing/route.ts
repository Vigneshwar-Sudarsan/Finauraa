import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

// Lazy initialization to avoid build-time errors
let stripe: Stripe | null = null;
let supabaseAdmin: SupabaseClient | null = null;

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

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return supabaseAdmin;
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

// Price lookup to determine current billing cycle
function getPriceToBilling(): Record<string, { plan: string; billing: string }> {
  return {
    [process.env.STRIPE_PRO_PRICE_ID_MONTHLY!]: { plan: "pro", billing: "monthly" },
    [process.env.STRIPE_PRO_PRICE_ID_YEARLY!]: { plan: "pro", billing: "yearly" },
  };
}

/**
 * POST /api/subscription/change-billing
 * Switches between monthly and yearly billing for the same plan
 *
 * Monthly to Yearly: User pays prorated amount for remainder + full year price
 * Yearly to Monthly: Credit applied, monthly billing starts at next cycle
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

    const { billing } = await request.json();

    if (!["monthly", "yearly"].includes(billing)) {
      return NextResponse.json(
        { error: "Invalid billing period. Must be 'monthly' or 'yearly'." },
        { status: 400 }
      );
    }

    // Get user's current subscription info
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_subscription_id, stripe_customer_id, subscription_tier, family_group_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No active subscription found." },
        { status: 400 }
      );
    }

    if (profile.subscription_tier === "free") {
      return NextResponse.json(
        { error: "Free plan does not have billing cycles." },
        { status: 400 }
      );
    }

    // Family members can't change billing - they inherit from family owner
    if (profile.family_group_id && profile.subscription_tier !== "family") {
      // User has family_group_id but isn't the family tier owner
      // Check if they're a member (not owner) of the family group
      const adminClient = getSupabaseAdmin();
      const { data: familyGroup } = await adminClient
        .from("family_groups")
        .select("owner_id")
        .eq("id", profile.family_group_id)
        .single();

      if (familyGroup && familyGroup.owner_id !== user.id) {
        return NextResponse.json(
          { error: "Family members cannot change billing. Please contact your family group owner." },
          { status: 403 }
        );
      }
    }

    // Get current subscription from Stripe
    const stripeClient = getStripe();
    const currentSubscription = await stripeClient.subscriptions.retrieve(
      profile.stripe_subscription_id
    );

    const currentItem = currentSubscription.items.data[0];
    if (!currentItem) {
      return NextResponse.json(
        { error: "Invalid subscription state." },
        { status: 500 }
      );
    }

    // Determine current billing cycle
    const currentPriceId = currentItem.price.id;
    const PRICE_TO_BILLING = getPriceToBilling();
    const currentBillingInfo = getPriceToBilling()[currentPriceId];

    if (!currentBillingInfo) {
      return NextResponse.json(
        { error: "Unable to determine current billing cycle." },
        { status: 500 }
      );
    }

    // Check if already on requested billing cycle
    if (currentBillingInfo.billing === billing) {
      return NextResponse.json(
        { error: `You are already on ${billing} billing.` },
        { status: 400 }
      );
    }

    // Get the new price ID (same plan, different billing cycle)
    // Note: family tier users are treated as pro for billing purposes
    const plan = profile.subscription_tier === "family" ? "pro" : profile.subscription_tier;
    if (plan !== "pro") {
      return NextResponse.json(
        { error: "Only Pro subscribers can change billing cycle." },
        { status: 400 }
      );
    }
    const newPriceId = getPriceIds().pro[billing as "monthly" | "yearly"];

    if (!newPriceId) {
      return NextResponse.json(
        { error: "Price configuration missing. Please contact support." },
        { status: 500 }
      );
    }

    const isUpgradeToYearly = billing === "yearly";

    // Update the subscription
    const updatedSubscription = await stripeClient.subscriptions.update(
      profile.stripe_subscription_id,
      {
        items: [
          {
            id: currentItem.id,
            price: newPriceId,
          },
        ],
        // Prorate for both directions
        proration_behavior: "create_prorations",
        // Remove any pending cancellation
        cancel_at_period_end: false,
        metadata: {
          user_id: user.id,
          plan,
          billing,
          changed_from_billing: currentBillingInfo.billing,
          change_type: isUpgradeToYearly ? "upgrade_to_yearly" : "downgrade_to_monthly",
        },
      }
    );

    // Get the subscription item for period info
    const subscriptionItem = updatedSubscription.items.data[0];

    // Update profile in database
    await getSupabaseAdmin()
      .from("profiles")
      .update({
        subscription_status: "active",
        subscription_ends_at: subscriptionItem?.current_period_end
          ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    const savingsMessage = isUpgradeToYearly
      ? "You're now saving 17% with annual billing!"
      : "";

    return NextResponse.json({
      success: true,
      message: isUpgradeToYearly
        ? `Switched to yearly billing. ${savingsMessage}`
        : "Switched to monthly billing. Your new billing cycle starts at the next renewal.",
      subscription: {
        tier: plan,
        status: updatedSubscription.status,
        billing,
        periodEnd: subscriptionItem?.current_period_end
          ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
          : null,
      },
    });
  } catch (error) {
    console.error("Change billing error:", error);

    let errorMessage = "Unable to change billing cycle. Please try again.";

    if (error instanceof Stripe.errors.StripeError) {
      console.error("Stripe error:", error.type, error.code, error.message);

      switch (error.code) {
        case "resource_missing":
          errorMessage = "Subscription not found. Please refresh and try again.";
          break;
        case "subscription_payment_intent_requires_action":
          errorMessage = "Payment requires verification. Please check your email.";
          break;
        case "card_declined":
          errorMessage = "Your card was declined. Please update your payment method and try again.";
          break;
        case "expired_card":
          errorMessage = "Your card has expired. Please update your payment method.";
          break;
        case "insufficient_funds":
          errorMessage = "Insufficient funds. Please use a different payment method.";
          break;
        case "payment_method_not_available":
          errorMessage = "No valid payment method on file. Please add a card first.";
          break;
        default:
          errorMessage = "Unable to change billing cycle. Please try again or contact support.";
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
 * GET /api/subscription/change-billing
 * Get preview of what switching billing cycle would cost
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
    const billing = searchParams.get("billing");

    if (!billing || !["monthly", "yearly"].includes(billing)) {
      return NextResponse.json(
        { error: "Invalid billing period" },
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

    // Family members can't preview billing changes - they inherit from family owner
    if (profile.family_group_id && profile.subscription_tier !== "family") {
      const adminClient = getSupabaseAdmin();
      const { data: familyGroup } = await adminClient
        .from("family_groups")
        .select("owner_id")
        .eq("id", profile.family_group_id)
        .single();

      if (familyGroup && familyGroup.owner_id !== user.id) {
        return NextResponse.json(
          { error: "Family members cannot change billing. Please contact your family group owner." },
          { status: 403 }
        );
      }
    }

    // Note: family tier users are treated as pro for billing purposes
    const plan = profile.subscription_tier === "family" ? "pro" : profile.subscription_tier;
    if (plan !== "pro") {
      return NextResponse.json(
        { error: "Only Pro subscribers can preview billing changes" },
        { status: 400 }
      );
    }
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

    // Determine current billing
    const currentPriceId = currentItem.price.id;
    const currentBillingInfo = getPriceToBilling()[currentPriceId];

    if (currentBillingInfo?.billing === billing) {
      return NextResponse.json(
        { error: `Already on ${billing} billing` },
        { status: 400 }
      );
    }

    // Get proration preview
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

    const isUpgradeToYearly = billing === "yearly";

    // Calculate savings for yearly (Pro plan pricing)
    const monthlyPrice = 7.99;
    const yearlyPrice = 79.99;
    const yearlySavings = (monthlyPrice * 12) - yearlyPrice;

    // For downgrade (yearly to monthly), calculate the credit amount
    // The total will be negative when there's more credit than the new charge
    const totalAmount = upcomingInvoice.total / 100;
    const creditAmount = totalAmount < 0 ? Math.abs(totalAmount) : 0;

    return NextResponse.json({
      preview: {
        currentBilling: currentBillingInfo?.billing || "monthly",
        newBilling: billing,
        plan,
        isUpgradeToYearly,
        // Amount to be charged immediately (for upgrades)
        proratedAmount: upcomingInvoice.amount_due / 100,
        // Total amount on the preview invoice (can be negative for downgrades)
        totalAmount,
        // Credit amount for downgrades (yearly to monthly)
        creditAmount,
        currency: upcomingInvoice.currency?.toUpperCase() || "USD",
        nextBillingDate: upcomingInvoice.period_end
          ? new Date(upcomingInvoice.period_end * 1000).toISOString()
          : null,
        // Yearly savings info
        yearlySavings: isUpgradeToYearly ? yearlySavings : 0,
        savingsPercentage: isUpgradeToYearly ? 17 : 0,
      },
    });
  } catch (error) {
    console.error("Preview billing change error:", error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: "Unable to preview billing change. Please try again." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unable to preview billing change. Please try again." },
      { status: 500 }
    );
  }
}
