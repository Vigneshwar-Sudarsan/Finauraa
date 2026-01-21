import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SubscriptionTier, getTierLimits } from "@/lib/features";

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
        is_pro
      `)
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Failed to fetch profile:", profileError);
    }

    // Determine subscription tier (fallback to is_pro for backwards compatibility)
    const tier: SubscriptionTier = profile?.subscription_tier || (profile?.is_pro ? "pro" : "free");
    const status = profile?.subscription_status || "active";

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

    return NextResponse.json({
      subscription: {
        tier,
        status,
        startedAt: profile?.subscription_started_at,
        endsAt: profile?.subscription_ends_at,
        trialEndsAt: profile?.trial_ends_at,
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
      paymentMethods: [], // Would come from Stripe
    });
  } catch (error) {
    console.error("Subscription fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}
