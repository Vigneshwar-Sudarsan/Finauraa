import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/finance/family/budgets
 * Get family-scoped budgets (shared spending limits)
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

    // Get user's profile and family group
    const { data: profile } = await supabase
      .from("profiles")
      .select("family_group_id, subscription_tier")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check if user has family features
    // User has family features if they have Pro/Family tier OR are a member of a family group
    // (family members inherit the family tier from the group owner)
    const hasFamilyFeatures =
      profile.subscription_tier === "pro" ||
      profile.subscription_tier === "family" ||
      !!profile.family_group_id; // Family members inherit access
    if (!hasFamilyFeatures) {
      return NextResponse.json(
        { error: "Family features require Pro subscription" },
        { status: 403 }
      );
    }

    if (!profile.family_group_id) {
      return NextResponse.json({
        budgets: [],
        noFamilyGroup: true,
      });
    }

    // Get family budgets
    const { data: budgets, error } = await supabase
      .from("budgets")
      .select(`
        id,
        category,
        amount,
        currency,
        period,
        is_active,
        show_member_breakdown,
        created_by,
        created_at
      `)
      .eq("family_group_id", profile.family_group_id)
      .eq("scope", "family")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch family budgets:", error);
      return NextResponse.json(
        { error: "Failed to fetch family budgets" },
        { status: 500 }
      );
    }

    // Calculate spent amounts for each budget
    // Get all family members with spending consent
    const { data: members } = await supabase
      .from("family_members")
      .select("user_id")
      .eq("group_id", profile.family_group_id)
      .eq("status", "active")
      .eq("spending_consent_given", true);

    const memberIds = members?.map((m) => m.user_id) || [];

    // Get current month's start date
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Get transactions for all consented members (all transactions, not just family-scoped)
    const { data: transactions } = await supabase
      .from("transactions")
      .select("category, amount, transaction_type")
      .in("user_id", memberIds)
      .eq("transaction_type", "debit")
      .gte("transaction_date", startOfMonth)
      .is("deleted_at", null);

    // Calculate spent per category
    const spentByCategory: Record<string, number> = {};
    (transactions || []).forEach((t) => {
      const cat = (t.category || "other").toLowerCase();
      if (!spentByCategory[cat]) {
        spentByCategory[cat] = 0;
      }
      spentByCategory[cat] += Math.abs(Number(t.amount));
    });

    // Enrich budgets with spent data
    const enrichedBudgets = (budgets || []).map((budget) => {
      const spent = spentByCategory[budget.category.toLowerCase()] || 0;
      const remaining = Math.max(0, budget.amount - spent);
      const percentage = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;

      return {
        ...budget,
        spent,
        remaining,
        percentage,
      };
    });

    return NextResponse.json({ budgets: enrichedBudgets });
  } catch (error) {
    console.error("Failed to fetch family budgets:", error);
    return NextResponse.json(
      { error: "Failed to fetch family budgets" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/family/budgets
 * Create a new family budget (shared spending limit)
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
    const { category, amount, currency = "BHD", period = "monthly", showMemberBreakdown = false } = body;

    // Validate input
    if (!category || !amount) {
      return NextResponse.json(
        { error: "Category and amount are required" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Get user's profile and family group
    const { data: profile } = await supabase
      .from("profiles")
      .select("family_group_id, subscription_tier")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check if user has family features
    // User has family features if they have Pro/Family tier OR are a member of a family group
    // (family members inherit the family tier from the group owner)
    const hasFamilyFeatures =
      profile.subscription_tier === "pro" ||
      profile.subscription_tier === "family" ||
      !!profile.family_group_id; // Family members inherit access
    if (!hasFamilyFeatures) {
      return NextResponse.json(
        { error: "Family features require Pro subscription" },
        { status: 403 }
      );
    }

    if (!profile.family_group_id) {
      return NextResponse.json(
        { error: "You must be in a family group to create family budgets" },
        { status: 400 }
      );
    }

    // Check if budget already exists for this category
    const { data: existingBudget } = await supabase
      .from("budgets")
      .select("id")
      .eq("family_group_id", profile.family_group_id)
      .eq("scope", "family")
      .eq("category", category.toLowerCase())
      .eq("is_active", true)
      .single();

    if (existingBudget) {
      // Update existing budget
      const { data: updated, error: updateError } = await supabase
        .from("budgets")
        .update({
          amount,
          currency,
          period,
          show_member_breakdown: showMemberBreakdown,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingBudget.id)
        .select()
        .single();

      if (updateError) {
        console.error("Failed to update family budget:", updateError);
        return NextResponse.json(
          { error: "Failed to update family budget" },
          { status: 500 }
        );
      }

      return NextResponse.json({ budget: updated });
    }

    // Create new budget
    const startDate = new Date();
    startDate.setDate(1); // Start of current month

    const { data: budget, error: insertError } = await supabase
      .from("budgets")
      .insert({
        user_id: user.id, // Creator
        family_group_id: profile.family_group_id,
        scope: "family",
        category: category.toLowerCase(),
        amount,
        currency,
        period,
        start_date: startDate.toISOString().split("T")[0],
        is_active: true,
        created_by: user.id,
        show_member_breakdown: showMemberBreakdown,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create family budget:", insertError);
      return NextResponse.json(
        { error: "Failed to create family budget" },
        { status: 500 }
      );
    }

    return NextResponse.json({ budget }, { status: 201 });
  } catch (error) {
    console.error("Failed to create family budget:", error);
    return NextResponse.json(
      { error: "Failed to create family budget" },
      { status: 500 }
    );
  }
}
