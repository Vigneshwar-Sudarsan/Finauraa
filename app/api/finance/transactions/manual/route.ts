import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/finance/transactions/manual
 * Creates a manual transaction (cash, untracked spending)
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

    const body = await request.json();
    const {
      amount,
      transaction_type,
      category,
      description,
      merchant_name,
      transaction_date,
      currency = "BHD",
      account_id, // Optional - can link to existing account
    } = body;

    // Validate required fields
    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    if (!transaction_type || !["credit", "debit"].includes(transaction_type)) {
      return NextResponse.json(
        { error: "Transaction type must be 'credit' or 'debit'" },
        { status: 400 }
      );
    }

    if (!category || typeof category !== "string") {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }

    if (!transaction_date) {
      return NextResponse.json(
        { error: "Transaction date is required" },
        { status: 400 }
      );
    }

    // If account_id is provided, verify it belongs to the user
    if (account_id) {
      const { data: account, error: accountError } = await supabase
        .from("bank_accounts")
        .select("id")
        .eq("id", account_id)
        .eq("user_id", user.id)
        .single();

      if (accountError || !account) {
        return NextResponse.json(
          { error: "Invalid account" },
          { status: 400 }
        );
      }
    }

    // Create the manual transaction
    const { data: transaction, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        account_id: account_id || null,
        amount: transaction_type === "debit" ? -Math.abs(amount) : Math.abs(amount),
        currency,
        transaction_type,
        description: description || null,
        merchant_name: merchant_name || null,
        category: category.toLowerCase(),
        transaction_date: new Date(transaction_date).toISOString(),
        booking_date: new Date(transaction_date).toISOString(),
        is_manual: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create manual transaction:", error);
      return NextResponse.json(
        { error: "Failed to create transaction" },
        { status: 500 }
      );
    }

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error("Manual transaction error:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}
