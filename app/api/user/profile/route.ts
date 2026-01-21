import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Get user's profile data
 * GET /api/user/profile
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

    // Get profile data
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return NextResponse.json(
        { error: "Failed to fetch profile" },
        { status: 500 }
      );
    }

    // Get account stats
    const [
      { count: bankCount },
      { count: accountCount },
      { count: transactionCount },
      { data: oldestTx },
      { count: budgetCount },
    ] = await Promise.all([
      supabase.from("bank_connections").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("bank_accounts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("transactions").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("transactions").select("transaction_date").eq("user_id", user.id).order("transaction_date", { ascending: true }).limit(1),
      supabase.from("budgets").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    return NextResponse.json({
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email || user.email,
        avatar_url: profile.avatar_url,
        is_pro: profile.is_pro,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      },
      stats: {
        connectedBanks: bankCount || 0,
        totalAccounts: accountCount || 0,
        transactionCount: transactionCount || 0,
        oldestTransaction: oldestTx?.[0]?.transaction_date || null,
        budgetCount: budgetCount || 0,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Update user's profile
 * PATCH /api/user/profile
 *
 * Body: {
 *   full_name?: string
 *   avatar_url?: string
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, avatar_url } = body as {
      full_name?: string;
      avatar_url?: string;
    };

    // Build update object with only provided fields
    const updateData: {
      full_name?: string;
      avatar_url?: string;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (full_name !== undefined) {
      // Sanitize name input
      const sanitizedName = full_name.trim().slice(0, 100);
      if (sanitizedName.length === 0) {
        return NextResponse.json(
          { error: "Name cannot be empty" },
          { status: 400 }
        );
      }
      updateData.full_name = sanitizedName;
    }

    if (avatar_url !== undefined) {
      // Validate avatar URL (should be from our storage or null)
      if (avatar_url !== null && avatar_url !== "") {
        try {
          const url = new URL(avatar_url);
          // Only allow URLs from Supabase storage
          if (!url.hostname.includes("supabase")) {
            return NextResponse.json(
              { error: "Invalid avatar URL" },
              { status: 400 }
            );
          }
          updateData.avatar_url = avatar_url;
        } catch {
          return NextResponse.json(
            { error: "Invalid avatar URL format" },
            { status: 400 }
          );
        }
      } else {
        updateData.avatar_url = undefined;
      }
    }

    // Update profile
    const { data: updatedProfile, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating profile:", error);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
