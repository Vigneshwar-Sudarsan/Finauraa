import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/finance/transactions
 * Fetches transactions with optional filtering
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

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const category = searchParams.get("category");
    const type = searchParams.get("type"); // "credit" or "debit"
    const days = searchParams.get("days");
    const accountId = searchParams.get("account_id"); // Filter by specific account

    // Build query
    let query = supabase
      .from("transactions")
      .select(
        `
        id,
        transaction_id,
        amount,
        currency,
        transaction_type,
        description,
        merchant_name,
        category,
        transaction_date,
        booking_date,
        account_id
      `
      )
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

    if (days) {
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

    return NextResponse.json({
      transactions: transactions || [],
      pagination: {
        limit,
        offset,
        total: totalCount || 0,
        hasMore: (offset + limit) < (totalCount || 0),
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
