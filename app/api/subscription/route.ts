import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SubscriptionTier, getTierLimits } from "@/lib/features";

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

/**
 * GET /api/subscription
 * Fetches user's subscription status, usage, and billing history
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's profile with subscription info
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(`
        subscription_tier,
        subscription_status,
        subscription_started_at,
        subscription_ends_at,
        trial_ends_at,
        is_pro,
        stripe_customer_id,
        stripe_subscription_id,
        family_group_id
      `)
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Failed to fetch profile:", profileError);
    }

    // Check if user is a family member (has family_group_id but not a family tier themselves)
    // Family members inherit the family tier's features
    let isFamilyMember = false;
    let familyOwnerTier: SubscriptionTier | null = null;

    if (profile?.family_group_id) {
      // Use admin client to bypass RLS for family group lookups
      // This is safe because we only read the owner's subscription_tier
      const adminClient = getSupabaseAdmin();

      // Check if this user is a member (not owner) of a family group
      const { data: familyGroup } = await adminClient
        .from("family_groups")
        .select("owner_id")
        .eq("id", profile.family_group_id)
        .single();

      if (familyGroup && familyGroup.owner_id !== user.id) {
        // User is a family member, get the owner's subscription tier
        const { data: ownerProfile } = await adminClient
          .from("profiles")
          .select("subscription_tier")
          .eq("id", familyGroup.owner_id)
          .single();

        if (ownerProfile?.subscription_tier === "family") {
          isFamilyMember = true;
          familyOwnerTier = "family";
        }
      }
    }

    // Try to get fresh data from Stripe if user has a Stripe subscription
    // If user is a family member, they inherit the family tier
    let tier: SubscriptionTier = isFamilyMember && familyOwnerTier
      ? familyOwnerTier
      : (profile?.subscription_tier || (profile?.is_pro ? "pro" : "free"));
    let status = profile?.subscription_status || "active";
    let startedAt = profile?.subscription_started_at;
    let endsAt = profile?.subscription_ends_at;
    let trialEndsAt = profile?.trial_ends_at;
    let billingCycle: "monthly" | "yearly" = "monthly";
    let subscriptionPaymentMethodId: string | null = null;

    // Price ID to billing cycle mapping (Pro plan only now)
    const priceToBilling: Record<string, "monthly" | "yearly"> = {
      [process.env.STRIPE_PRO_PRICE_ID_MONTHLY!]: "monthly",
      [process.env.STRIPE_PRO_PRICE_ID_YEARLY!]: "yearly",
    };

    // Fetch fresh subscription data from Stripe if available
    // Skip for family members as they inherit from the group owner
    if (profile?.stripe_subscription_id && !isFamilyMember) {
      try {
        const stripeSubscription = await getStripe().subscriptions.retrieve(
          profile.stripe_subscription_id
        );

        // Map Stripe price to tier
        // Note: Family plan has been merged into Pro. Existing family subscribers
        // retain their tier in the database for backwards compatibility.
        const priceId = stripeSubscription.items.data[0]?.price.id;
        const proPriceIds = [
          process.env.STRIPE_PRO_PRICE_ID_MONTHLY,
          process.env.STRIPE_PRO_PRICE_ID_YEARLY,
        ].filter(Boolean);

        // All paid subscriptions now map to Pro tier
        if (proPriceIds.includes(priceId)) {
          tier = "pro";
        }

        // Determine billing cycle from price ID
        if (priceId && priceToBilling[priceId]) {
          billingCycle = priceToBilling[priceId];
        }

        // Map Stripe status
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
        status = statusMap[stripeSubscription.status] || "active";

        // Check if canceling
        if (stripeSubscription.cancel_at_period_end && stripeSubscription.status === "active") {
          status = "canceling";
        }

        // Update dates from Stripe
        const subscriptionItem = stripeSubscription.items.data[0];
        startedAt = new Date(stripeSubscription.created * 1000).toISOString();
        endsAt = subscriptionItem?.current_period_end
          ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
          : null;
        trialEndsAt = stripeSubscription.trial_end
          ? new Date(stripeSubscription.trial_end * 1000).toISOString()
          : null;

        // Get the subscription's payment method
        subscriptionPaymentMethodId = stripeSubscription.default_payment_method as string | null;

        // Update the database with fresh data if it's different (use admin to bypass RLS)
        if (
          tier !== profile.subscription_tier ||
          status !== profile.subscription_status
        ) {
          await getSupabaseAdmin()
            .from("profiles")
            .update({
              subscription_tier: tier,
              subscription_status: status,
              subscription_started_at: startedAt,
              subscription_ends_at: endsAt,
              trial_ends_at: trialEndsAt,
              is_pro: tier !== "free",
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);
        }
      } catch (stripeError) {
        console.error("Failed to fetch Stripe subscription:", stripeError);
        // Fall back to database values
      }
    }

    // Fetch usage data
    const [banksResult, transactionsResult, aiQueriesResult] = await Promise.all([
      // Count bank connections
      supabase
        .from("bank_connections")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "active"),
      // Count transactions this month
      supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      // Count AI queries this month (from messages table)
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", user.id) // This might need adjustment based on your schema
        .eq("role", "user")
        .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    ]);

    // Get limits from centralized feature configuration
    const tierLimits = getTierLimits(tier);

    // Fetch billing history
    const { data: billingHistory } = await supabase
      .from("billing_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Format billing history
    const formattedBillingHistory = (billingHistory || []).map((record) => ({
      id: record.id,
      amount: record.amount,
      currency: record.currency,
      status: record.status,
      description: record.description,
      invoiceUrl: record.invoice_url,
      createdAt: record.created_at,
    }));

    // Fetch payment methods from Stripe
    let paymentMethods: Array<{
      id: string;
      type: string;
      brand: string;
      last4: string;
      expMonth: number;
      expYear: number;
      isDefault: boolean;
      isSubscriptionPayment: boolean;
    }> = [];

    if (profile?.stripe_customer_id) {
      try {
        const stripePaymentMethods = await getStripe().paymentMethods.list({
          customer: profile.stripe_customer_id,
          type: "card",
        });

        // Get default payment method
        let defaultPaymentMethodId: string | null = null;
        try {
          const customer = await getStripe().customers.retrieve(profile.stripe_customer_id);
          if (customer && !customer.deleted) {
            defaultPaymentMethodId = customer.invoice_settings?.default_payment_method as string | null;
          }
        } catch {
          // Ignore error getting default
        }

        paymentMethods = stripePaymentMethods.data.map((pm) => ({
          id: pm.id,
          type: pm.type,
          brand: pm.card?.brand || "unknown",
          last4: pm.card?.last4 || "****",
          expMonth: pm.card?.exp_month || 0,
          expYear: pm.card?.exp_year || 0,
          isDefault: pm.id === defaultPaymentMethodId,
          isSubscriptionPayment: pm.id === subscriptionPaymentMethodId,
        }));
      } catch (stripeError) {
        console.error("Failed to fetch payment methods:", stripeError);
      }
    }

    return NextResponse.json({
      subscription: {
        tier,
        status,
        billingCycle,
        startedAt,
        endsAt,
        trialEndsAt,
        isFamilyMember, // True if user inherits tier from family group owner
      },
      usage: {
        bankConnections: {
          used: banksResult.count || 0,
          limit: tierLimits.bankConnections,
        },
        transactions: {
          used: transactionsResult.count || 0,
          limit: tierLimits.transactionHistoryDays, // days, not count
        },
        aiQueries: {
          used: aiQueriesResult.count || 0,
          limit: tierLimits.aiQueriesPerMonth,
        },
        savingsGoals: {
          used: 0, // TODO: Count from savings_goals table
          limit: tierLimits.savingsGoals,
        },
        familyMembers: {
          used: 0, // TODO: Count from family_members table
          limit: tierLimits.familyMembers,
        },
      },
      features: {
        exports: tierLimits.exports,
        exportFormats: tierLimits.exportFormats,
        budgetAlerts: tierLimits.budgetAlerts,
        advancedInsights: tierLimits.advancedInsights,
        prioritySupport: tierLimits.prioritySupport,
        familyDashboard: tierLimits.familyDashboard,
        enhancedAI: tierLimits.enhancedAI,
        syncFrequency: tierLimits.syncFrequency,
      },
      billingHistory: formattedBillingHistory,
      paymentMethods,
    });
  } catch (error) {
    console.error("Subscription fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}
