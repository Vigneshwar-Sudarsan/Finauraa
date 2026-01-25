import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/finance/family/savings-goals/[id]/contribute
 * Contribute to a family goal
 */
export async function POST(
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

    const body = await request.json();
    const { amount, on_behalf_of } = body; // on_behalf_of is optional userId

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
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

    // Determine the contributor (current user or on behalf of someone)
    let contributorId = user.id;
    let contributorName = "";

    if (on_behalf_of && on_behalf_of !== user.id) {
      // Check if user is family owner (can contribute on behalf of others)
      const { data: familyGroup } = await supabase
        .from("family_groups")
        .select("owner_id")
        .eq("id", profile.family_group_id)
        .single();

      if (familyGroup?.owner_id !== user.id) {
        return NextResponse.json(
          { error: "Only family owner can contribute on behalf of others" },
          { status: 403 }
        );
      }

      // Verify the target user is in the family
      const { data: targetMember } = await supabase
        .from("family_members")
        .select("user_id")
        .eq("group_id", profile.family_group_id)
        .eq("user_id", on_behalf_of)
        .eq("status", "active")
        .single();

      if (!targetMember) {
        return NextResponse.json(
          { error: "Target member is not in your family group" },
          { status: 400 }
        );
      }

      contributorId = on_behalf_of;

      // Get contributor name
      const { data: contributorProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", on_behalf_of)
        .single();

      contributorName = contributorProfile?.full_name || contributorProfile?.email?.split("@")[0] || "Member";
    }

    // Get the goal
    const { data: goal, error: goalError } = await supabase
      .from("savings_goals")
      .select("*")
      .eq("id", id)
      .eq("family_group_id", profile.family_group_id)
      .eq("scope", "family")
      .single();

    if (goalError || !goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    if (goal.is_completed) {
      return NextResponse.json(
        { error: "Goal is already completed" },
        { status: 400 }
      );
    }

    // Update the goal
    const newAmount = Number(goal.current_amount) + amount;
    const isCompleted = newAmount >= goal.target_amount;

    const { data: updatedGoal, error: updateError } = await supabase
      .from("savings_goals")
      .update({
        current_amount: newAmount,
        is_completed: isCompleted,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to update goal:", updateError);
      return NextResponse.json(
        { error: "Failed to contribute to goal" },
        { status: 500 }
      );
    }

    // Track the contributor's contribution (cumulative total)
    const { data: existingMember } = await supabase
      .from("family_goal_members")
      .select("id, contribution_amount")
      .eq("goal_id", id)
      .eq("user_id", contributorId)
      .single();

    if (existingMember) {
      // Update existing contribution
      await supabase
        .from("family_goal_members")
        .update({
          contribution_amount: Number(existingMember.contribution_amount) + amount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingMember.id);
    } else {
      // Add new contribution record
      await supabase
        .from("family_goal_members")
        .insert({
          goal_id: id,
          user_id: contributorId,
          is_whole_family: false,
          contribution_amount: amount,
        });
    }

    // Record contribution history entry
    await supabase
      .from("contribution_history")
      .insert({
        goal_id: id,
        contributor_id: contributorId,
        recorded_by_id: user.id,
        amount,
        currency: goal.currency || "BHD",
      });

    // Calculate progress fields
    const progress_percentage = Math.min(
      100,
      Math.round((updatedGoal.current_amount / updatedGoal.target_amount) * 100)
    );
    const remaining = Math.max(0, updatedGoal.target_amount - updatedGoal.current_amount);

    let days_remaining: number | null = null;
    if (updatedGoal.target_date) {
      const targetDate = new Date(updatedGoal.target_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = targetDate.getTime() - today.getTime();
      days_remaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({
      goal: {
        ...updatedGoal,
        progress_percentage,
        remaining,
        days_remaining,
      },
      contribution: {
        amount,
        by: contributorId,
        by_name: contributorName || undefined,
        on_behalf: on_behalf_of ? true : false,
        just_completed: isCompleted,
      },
    });
  } catch (error) {
    console.error("Failed to contribute to family goal:", error);
    return NextResponse.json(
      { error: "Failed to contribute to goal" },
      { status: 500 }
    );
  }
}
