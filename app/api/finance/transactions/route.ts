import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTierLimits } from "@/lib/features";
import { getUserSubscription } from "@/lib/features-server";
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

    // If no banks connected, return empty data (not an error)
    if (consentCheck.noBanksConnected) {
      return NextResponse.json({
        transactions: [],
        pagination: {
          limit: 50,
          offset: 0,
          total: 0,
          hasMore: false,
        },
        subscription: {
          tier: "free",
          historyDaysLimit: 30,
          isLimited: true,
        },
        noBanksConnected: true,
      });
    }

    // Get user's region for filtering
    const { data: profile } = await supabase
      .from("profiles")
      .select("country")
      .eq("id", user.id)
      .single();
    const userRegion = profile?.country || "BH";

    // Get region-filtered bank connections -> accounts -> account IDs
    const { data: regionConnections } = await supabase
      .from("bank_connections")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .eq("region", userRegion);
    const regionConnectionIds = regionConnections?.map(c => c.id) || [];

    const { data: regionAccounts } = await supabase
      .from("bank_accounts")
      .select("id")
      .eq("user_id", user.id)
      .in("connection_id", regionConnectionIds);
    const regionAccountIds = regionAccounts?.map(a => a.id) || [];

    // If no accounts for this region, return empty data
    if (regionAccountIds.length === 0) {
      return NextResponse.json({
        transactions: [],
        pagination: { limit: 50, offset: 0, total: 0, hasMore: false },
        subscription: { tier: "free", historyDaysLimit: 30, isLimited: true },
        noBanksConnected: true,
      });
    }

    // Get user's effective subscription tier (includes family membership check)
    const subscription = await getUserSubscription();
    const tier = subscription?.tier || "free";
    const tierLimits = getTierLimits(tier);
    const historyDaysLimit = tierLimits.transactionHistoryDays; // null = unlimited

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const category = searchParams.get("category");
    const type = searchParams.get("type"); // "credit" or "debit"
    const days = searchParams.get("days");
    const accountId = searchParams.get("account_id"); // Filter by specific account

    // Build query - select only needed columns for better performance
    let query = supabase
      .from("transactions")
      .select(`
        id,
        transaction_id,
        account_id,
        amount,
        currency,
        transaction_type,
        description,
        merchant_name,
        merchant_logo,
        category,
        category_group,
        category_icon,
        provider_id,
        transaction_date
      `)
      .eq("user_id", user.id)
      .in("account_id", regionAccountIds)
      .is("deleted_at", null)
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

    // Get total count for pagination (with same filters as main query)
    let countQuery = supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("account_id", regionAccountIds)
      .is("deleted_at", null);

    // Apply same filters to count query
    if (accountId) {
      countQuery = countQuery.eq("account_id", accountId);
    }
    if (category) {
      countQuery = countQuery.eq("category", category.toLowerCase());
    }
    if (type) {
      countQuery = countQuery.eq("transaction_type", type.toLowerCase());
    }
    if (historyDaysLimit !== null) {
      const countStartDate = new Date();
      countStartDate.setDate(countStartDate.getDate() - historyDaysLimit);
      countQuery = countQuery.gte("transaction_date", countStartDate.toISOString());
    } else if (days) {
      const daysNum = parseInt(days, 10);
      const countStartDate = new Date();
      countStartDate.setDate(countStartDate.getDate() - daysNum);
      countQuery = countQuery.gte("transaction_date", countStartDate.toISOString());
    }

    const { count: totalCount } = await countQuery;

    // Log successful data access (only if we have a consentId)
    if (consentCheck.consentId) {
      await logDataAccessSuccess(user.id, "transaction", consentCheck.consentId, "/api/finance/transactions", {
        transactionCount: transactions?.length || 0,
        filters: { category, type, accountId },
      });
    }

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
