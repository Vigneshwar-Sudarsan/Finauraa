import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireBankConsent } from "@/lib/consent-middleware";

/**
 * POST /api/finance/transactions/manual
 * Creates a manual transaction (cash, untracked spending)
 * BOBF/PDPL: Requires active bank_access consent to add to financial data
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

    // BOBF/PDPL: Verify active consent before creating financial data
    // Note: Manual transactions can be created even without bank connections
    // since users may want to track cash spending before connecting a bank
    const consentCheck = await requireBankConsent(supabase, user.id, "/api/finance/transactions/manual");
    if (!consentCheck.allowed) {
      return consentCheck.response;
    }
    // If noBanksConnected, we still allow manual transaction creation
    // (user can track cash spending without connecting a bank)

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
