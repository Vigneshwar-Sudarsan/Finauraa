import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/finance/family/savings-goals
 * Fetches all family savings goals for the user's family group
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
    const hasFamilyFeatures =
      profile.subscription_tier === "pro" ||
      profile.subscription_tier === "family" ||
      !!profile.family_group_id;

    if (!hasFamilyFeatures) {
      return NextResponse.json(
        { error: "Family features require Pro subscription" },
        { status: 403 }
      );
    }

    if (!profile.family_group_id) {
      return NextResponse.json({
        goals: [],
        noFamilyGroup: true,
      });
    }

    // Get family group details
    const { data: familyGroup } = await supabase
      .from("family_groups")
      .select("id, name, owner_id")
      .eq("id", profile.family_group_id)
      .single();

    if (!familyGroup) {
      return NextResponse.json({ error: "Family group not found" }, { status: 404 });
    }

    // Get family goals with assigned members
    const { data: goals, error } = await supabase
      .from("savings_goals")
      .select(`
        id,
        name,
        target_amount,
        current_amount,
        currency,
        target_date,
        category,
        is_completed,
        auto_contribute,
        auto_contribute_percentage,
        created_at,
        created_by,
        family_goal_members (
          id,
          user_id,
          is_whole_family,
          contribution_amount
        )
      `)
      .eq("family_group_id", profile.family_group_id)
      .eq("scope", "family")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch family goals:", error);
      return NextResponse.json(
        { error: "Failed to fetch family goals" },
        { status: 500 }
      );
    }

    // Get all family members for member lookup
    const { data: members } = await supabase
      .from("family_members")
      .select("user_id, role")
      .eq("group_id", profile.family_group_id)
      .eq("status", "active");

    const memberIds = [...new Set([
      ...(members?.map(m => m.user_id).filter(Boolean) || []),
      familyGroup.owner_id
    ])];

    // Get profiles for member names
    const { data: memberProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", memberIds);

    const profileLookup = new Map(
      (memberProfiles || []).map(p => [p.id, p])
    );

    // Calculate additional fields for each goal
    const goalsWithProgress = (goals || []).map((goal) => {
      const progress_percentage =
        goal.target_amount > 0
          ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
          : 0;

      const remaining = Math.max(0, goal.target_amount - goal.current_amount);

      let days_remaining: number | null = null;
      if (goal.target_date) {
        const targetDate = new Date(goal.target_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = targetDate.getTime() - today.getTime();
        days_remaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      // Enrich assigned members with names
      const assignedMembers = (goal.family_goal_members || []).map((m: {
        id: string;
        user_id: string | null;
        is_whole_family: boolean;
        contribution_amount: number;
      }) => {
        if (m.is_whole_family) {
          return {
            ...m,
            name: "Whole Family",
            isWholeFamily: true,
          };
        }
        const memberProfile = profileLookup.get(m.user_id || "");
        return {
          ...m,
          name: memberProfile?.full_name || memberProfile?.email?.split("@")[0] || "Member",
        };
      });

      // Get creator name
      const creatorProfile = profileLookup.get(goal.created_by);
      const createdByName = creatorProfile?.full_name || creatorProfile?.email?.split("@")[0] || "Unknown";

      return {
        id: goal.id,
        name: goal.name,
        target_amount: goal.target_amount,
        current_amount: goal.current_amount,
        currency: goal.currency,
        target_date: goal.target_date,
        category: goal.category,
        is_completed: goal.is_completed,
        auto_contribute: goal.auto_contribute,
        auto_contribute_percentage: goal.auto_contribute_percentage,
        created_at: goal.created_at,
        created_by: goal.created_by,
        created_by_name: createdByName,
        progress_percentage,
        remaining,
        days_remaining,
        assigned_members: assignedMembers,
      };
    });

    // Get active family members for the response
    const familyMembers = memberIds.map(id => {
      const profile = profileLookup.get(id);
      const member = members?.find(m => m.user_id === id);
      return {
        userId: id,
        name: profile?.full_name || profile?.email?.split("@")[0] || "Member",
        role: id === familyGroup.owner_id ? "owner" : (member?.role || "member"),
      };
    });

    return NextResponse.json({
      goals: goalsWithProgress,
      familyGroup: {
        id: familyGroup.id,
        name: familyGroup.name,
      },
      familyMembers,
      isOwner: familyGroup.owner_id === user.id,
      currentUserId: user.id,
    });
  } catch (error) {
    console.error("Family goals fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch family goals" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/family/savings-goals
 * Creates a new family savings goal
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
      name,
      target_amount,
      current_amount = 0,
      currency = "BHD",
      target_date,
      category,
      auto_contribute = false,
      auto_contribute_percentage,
      assigned_members = [], // Array of { userId: string } or { isWholeFamily: true }
    } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Goal name is required" },
        { status: 400 }
      );
    }

    if (typeof target_amount !== "number" || target_amount <= 0) {
      return NextResponse.json(
        { error: "Target amount must be a positive number" },
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
    const hasFamilyFeatures =
      profile.subscription_tier === "pro" ||
      profile.subscription_tier === "family" ||
      !!profile.family_group_id;

    if (!hasFamilyFeatures) {
      return NextResponse.json(
        { error: "Family features require Pro subscription" },
        { status: 403 }
      );
    }

    if (!profile.family_group_id) {
      return NextResponse.json(
        { error: "You must be in a family group to create family goals" },
        { status: 400 }
      );
    }

    // Create the family goal
    const { data: goal, error: goalError } = await supabase
      .from("savings_goals")
      .insert({
        user_id: user.id,
        name: name.trim(),
        target_amount,
        current_amount: Math.max(0, current_amount),
        currency,
        target_date: target_date ? new Date(target_date).toISOString().split("T")[0] : null,
        category: category || null,
        is_completed: current_amount >= target_amount,
        auto_contribute,
        auto_contribute_percentage: auto_contribute ? auto_contribute_percentage : null,
        scope: "family",
        family_group_id: profile.family_group_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (goalError) {
      console.error("Failed to create family goal:", goalError);
      return NextResponse.json(
        { error: "Failed to create family goal" },
        { status: 500 }
      );
    }

    // Add assigned members
    if (assigned_members.length > 0) {
      const memberInserts = assigned_members.map((m: { userId?: string; isWholeFamily?: boolean }) => ({
        goal_id: goal.id,
        user_id: m.isWholeFamily ? null : m.userId,
        is_whole_family: m.isWholeFamily || false,
        contribution_amount: 0,
      }));

      const { error: membersError } = await supabase
        .from("family_goal_members")
        .insert(memberInserts);

      if (membersError) {
        console.error("Failed to add goal members:", membersError);
        // Don't fail the whole request, goal is created
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
    console.error("Family goal creation error:", error);
    return NextResponse.json(
      { error: "Failed to create family goal" },
      { status: 500 }
    );
  }
}
