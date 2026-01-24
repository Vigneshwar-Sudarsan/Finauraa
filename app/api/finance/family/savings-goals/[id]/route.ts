import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/finance/family/savings-goals/[id]
 * Get a specific family goal with member details
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

    // Get user's family group
    const { data: profile } = await supabase
      .from("profiles")
      .select("family_group_id")
      .eq("id", user.id)
      .single();

    if (!profile?.family_group_id) {
      return NextResponse.json({ error: "Not in a family group" }, { status: 403 });
    }

    // Get the goal with members
    const { data: goal, error } = await supabase
      .from("savings_goals")
      .select(`
        *,
        family_goal_members (
          id,
          user_id,
          is_whole_family,
          contribution_amount
        )
      `)
      .eq("id", id)
      .eq("family_group_id", profile.family_group_id)
      .eq("scope", "family")
      .single();

    if (error || !goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    return NextResponse.json({ goal });
  } catch (error) {
    console.error("Failed to fetch family goal:", error);
    return NextResponse.json(
      { error: "Failed to fetch family goal" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/finance/family/savings-goals/[id]
 * Update a family goal
 */
export async function PATCH(
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

    // Get user's family group
    const { data: profile } = await supabase
      .from("profiles")
      .select("family_group_id")
      .eq("id", user.id)
      .single();

    if (!profile?.family_group_id) {
      return NextResponse.json({ error: "Not in a family group" }, { status: 403 });
    }

    // Verify goal belongs to user's family group
    const { data: existingGoal } = await supabase
      .from("savings_goals")
      .select("id, family_group_id")
      .eq("id", id)
      .eq("family_group_id", profile.family_group_id)
      .eq("scope", "family")
      .single();

    if (!existingGoal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      target_amount,
      current_amount,
      target_date,
      category,
      auto_contribute,
      auto_contribute_percentage,
      is_completed,
      assigned_members,
    } = body;

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name.trim();
    if (target_amount !== undefined) updates.target_amount = target_amount;
    if (current_amount !== undefined) updates.current_amount = current_amount;
    if (target_date !== undefined) {
      updates.target_date = target_date
        ? new Date(target_date).toISOString().split("T")[0]
        : null;
    }
    if (category !== undefined) updates.category = category;
    if (auto_contribute !== undefined) updates.auto_contribute = auto_contribute;
    if (auto_contribute_percentage !== undefined) {
      updates.auto_contribute_percentage = auto_contribute ? auto_contribute_percentage : null;
    }
    if (is_completed !== undefined) updates.is_completed = is_completed;

    // Check if goal should be marked complete
    if (current_amount !== undefined && target_amount !== undefined) {
      updates.is_completed = current_amount >= target_amount;
    }

    const { data: goal, error } = await supabase
      .from("savings_goals")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update family goal:", error);
      return NextResponse.json(
        { error: "Failed to update family goal" },
        { status: 500 }
      );
    }

    // Update assigned members if provided
    if (assigned_members !== undefined) {
      // Delete existing assignments
      await supabase
        .from("family_goal_members")
        .delete()
        .eq("goal_id", id);

      // Add new assignments
      if (assigned_members.length > 0) {
        const memberInserts = assigned_members.map((m: { userId?: string; isWholeFamily?: boolean }) => ({
          goal_id: id,
          user_id: m.isWholeFamily ? null : m.userId,
          is_whole_family: m.isWholeFamily || false,
          contribution_amount: 0,
        }));

        await supabase
          .from("family_goal_members")
          .insert(memberInserts);
      }
    }

    // Calculate progress fields
    const progress_percentage = Math.min(
      100,
      Math.round((goal.current_amount / goal.target_amount) * 100)
    );
    const remaining = Math.max(0, goal.target_amount - goal.current_amount);

    let days_remaining: number | null = null;
    if (goal.target_date) {
      const targetDate = new Date(goal.target_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = targetDate.getTime() - today.getTime();
      days_remaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({
      goal: {
        ...goal,
        progress_percentage,
        remaining,
        days_remaining,
      },
    });
  } catch (error) {
    console.error("Failed to update family goal:", error);
    return NextResponse.json(
      { error: "Failed to update family goal" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/finance/family/savings-goals/[id]
 * Delete a family goal
 */
export async function DELETE(
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

    // Get user's family group and check if owner
    const { data: profile } = await supabase
      .from("profiles")
      .select("family_group_id")
      .eq("id", user.id)
      .single();

    if (!profile?.family_group_id) {
      return NextResponse.json({ error: "Not in a family group" }, { status: 403 });
    }

    // Check if user is owner of the family group
    const { data: familyGroup } = await supabase
      .from("family_groups")
      .select("owner_id")
      .eq("id", profile.family_group_id)
      .single();

    // Verify goal exists and belongs to family group
    const { data: goal } = await supabase
      .from("savings_goals")
      .select("id, created_by")
      .eq("id", id)
      .eq("family_group_id", profile.family_group_id)
      .eq("scope", "family")
      .single();

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Only owner or goal creator can delete
    const canDelete = familyGroup?.owner_id === user.id || goal.created_by === user.id;
    if (!canDelete) {
      return NextResponse.json(
        { error: "Only the family owner or goal creator can delete this goal" },
        { status: 403 }
      );
    }

    // Delete the goal (cascade will delete family_goal_members)
    const { error } = await supabase
      .from("savings_goals")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Failed to delete family goal:", error);
      return NextResponse.json(
        { error: "Failed to delete family goal" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete family goal:", error);
    return NextResponse.json(
      { error: "Failed to delete family goal" },
      { status: 500 }
    );
  }
}
