import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/finance/family/budgets/[id]
 * Deletes (deactivates) a family budget
 * Only members of the family group can delete family budgets
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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
      return NextResponse.json(
        { error: "You must be in a family group to manage family budgets" },
        { status: 400 }
      );
    }

    // Verify the budget belongs to user's family group
    const { data: budget } = await supabase
      .from("budgets")
      .select("id, family_group_id")
      .eq("id", id)
      .eq("scope", "family")
      .single();

    if (!budget) {
      return NextResponse.json(
        { error: "Budget not found" },
        { status: 404 }
      );
    }

    if (budget.family_group_id !== profile.family_group_id) {
      return NextResponse.json(
        { error: "You can only delete budgets from your own family group" },
        { status: 403 }
      );
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from("budgets")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("family_group_id", profile.family_group_id);

    if (error) {
      console.error("Failed to delete family budget:", error);
      return NextResponse.json(
        { error: "Failed to delete family budget" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Family budget delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete family budget" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/finance/family/budgets/[id]
 * Updates a family budget
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, currency, period, showMemberBreakdown } = body;

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
        { error: "You must be in a family group to manage family budgets" },
        { status: 400 }
      );
    }

    // Verify the budget belongs to user's family group
    const { data: existingBudget } = await supabase
      .from("budgets")
      .select("id, family_group_id")
      .eq("id", id)
      .eq("scope", "family")
      .single();

    if (!existingBudget) {
      return NextResponse.json(
        { error: "Budget not found" },
        { status: 404 }
      );
    }

    if (existingBudget.family_group_id !== profile.family_group_id) {
      return NextResponse.json(
        { error: "You can only update budgets from your own family group" },
        { status: 403 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (amount !== undefined) {
      if (amount <= 0) {
        return NextResponse.json(
          { error: "Amount must be greater than 0" },
          { status: 400 }
        );
      }
      updates.amount = amount;
    }

    if (currency !== undefined) {
      updates.currency = currency;
    }

    if (period !== undefined) {
      updates.period = period;
    }

    if (showMemberBreakdown !== undefined) {
      updates.show_member_breakdown = showMemberBreakdown;
    }

    // Update budget
    const { data: budget, error } = await supabase
      .from("budgets")
      .update(updates)
      .eq("id", id)
      .eq("family_group_id", profile.family_group_id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update family budget:", error);
      return NextResponse.json(
        { error: "Failed to update family budget" },
        { status: 500 }
      );
    }

    return NextResponse.json({ budget });
  } catch (error) {
    console.error("Family budget update error:", error);
    return NextResponse.json(
      { error: "Failed to update family budget" },
      { status: 500 }
    );
  }
}
