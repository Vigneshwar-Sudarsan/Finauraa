import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireBankConsent, logDataAccessSuccess } from "@/lib/consent-middleware";

/**
 * GET /api/finance/accounts/[id]
 * Get account details with recent transactions
 * BOBF/PDPL: Requires active bank_access consent
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // BOBF/PDPL: Verify active consent before data access
    const consentCheck = await requireBankConsent(supabase, user.id, `/api/finance/accounts/${id}`);
    if (!consentCheck.allowed) {
      return consentCheck.response;
    }

    // Get account with connection info
    const { data: account, error } = await supabase
      .from("bank_accounts")
      .select(`
        *,
        bank_connections (
          id,
          bank_id,
          bank_name,
          status
        )
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Get recent transactions for this account
    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("account_id", id)
      .order("transaction_date", { ascending: false })
      .limit(50);

    // Get spending summary for this account
    const { data: spendingData } = await supabase
      .from("transactions")
      .select("amount, category")
      .eq("account_id", id)
      .eq("transaction_type", "debit");

    const totalSpent = (spendingData || []).reduce(
      (sum, t) => sum + Math.abs(Number(t.amount)),
      0
    );

    // Group by category
    const categoryTotals: Record<string, number> = {};
    (spendingData || []).forEach((t) => {
      const cat = t.category || "Other";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(Number(t.amount));
    });

    const spendingByCategory = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0,
      }));

    // Get income for this account
    const { data: incomeData } = await supabase
      .from("transactions")
      .select("amount")
      .eq("account_id", id)
      .eq("transaction_type", "credit");

    const totalIncome = (incomeData || []).reduce(
      (sum, t) => sum + Math.abs(Number(t.amount)),
      0
    );

    return NextResponse.json({
      account,
      transactions: transactions || [],
      summary: {
        totalSpent,
        totalIncome,
        spendingByCategory,
        transactionCount: transactions?.length || 0,
      },
    });
  } catch (error) {
    console.error("Account fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch account" }, { status: 500 });
  }
}
