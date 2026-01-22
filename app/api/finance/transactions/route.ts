import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SubscriptionTier, getTierLimits } from "@/lib/features";
import { requireBankConsent, logDataAccessSuccess } from "@/lib/consent-middleware";

/**
 * GET /api/finance/transactions
 * Fetches transactions with optional filtering
 * BOBF/PDPL: Requires active bank_access consent
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

    // BOBF/PDPL: Verify active consent before data access
    const consentCheck = await requireBankConsent(supabase, user.id, "/api/finance/transactions");
    if (!consentCheck.allowed) {
      return consentCheck.response;
    }

    // Get user's subscription tier for transaction history limits
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, is_pro")
      .eq("id", user.id)
      .single();

    const tier: SubscriptionTier = profile?.subscription_tier || (profile?.is_pro ? "pro" : "free");
    const tierLimits = getTierLimits(tier);
    const historyDaysLimit = tierLimits.transactionHistoryDays; // null = unlimited

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const category = searchParams.get("category");
    const type = searchParams.get("type"); // "credit" or "debit"
    const days = searchParams.get("days");
    const accountId = searchParams.get("account_id"); // Filter by specific account

    // Build query - select all transaction fields
    // Note: provider_id, merchant_logo, category_group are optional columns added later
    let query = supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (accountId) {
      query = query.eq("account_id", accountId);
    }

    if (category) {
      query = query.eq("category", category.toLowerCase());
    }

    if (type) {
      query = query.eq("transaction_type", type.toLowerCase());
    }

    // Apply transaction history limit based on subscription tier
    // Free tier: 30 days, Pro/Family: unlimited (null)
    if (historyDaysLimit !== null) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - historyDaysLimit);
      query = query.gte("transaction_date", startDate.toISOString());
    } else if (days) {
      // Only apply user-specified days filter if they have unlimited access
      const daysNum = parseInt(days, 10);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);
      query = query.gte("transaction_date", startDate.toISOString());
    }

    const { data: transactions, error, count } = await query;

    if (error) {
      console.error("Failed to fetch transactions:", error);
      return NextResponse.json(
        { error: "Failed to fetch transactions" },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Log successful data access
    await logDataAccessSuccess(user.id, "transaction", consentCheck.consentId, "/api/finance/transactions", {
      transactionCount: transactions?.length || 0,
      filters: { category, type, accountId },
    });

    return NextResponse.json({
      transactions: transactions || [],
      pagination: {
        limit,
        offset,
        total: totalCount || 0,
        hasMore: (offset + limit) < (totalCount || 0),
      },
      subscription: {
        tier,
        historyDaysLimit, // null = unlimited
        isLimited: historyDaysLimit !== null,
      },
    });
  } catch (error) {
    console.error("Transactions fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
