import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

/**
 * GET /api/finance/family/consent
 * Get current user's family spending consent status
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

    // Get user's profile and family membership
    const { data: profile } = await supabase
      .from("profiles")
      .select("family_group_id")
      .eq("id", user.id)
      .single();

    if (!profile?.family_group_id) {
      return NextResponse.json({
        hasConsent: false,
        inFamilyGroup: false,
      });
    }

    // Get family membership with consent status
    const { data: membership } = await supabase
      .from("family_members")
      .select("spending_consent_given, spending_consent_at")
      .eq("group_id", profile.family_group_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!membership) {
      return NextResponse.json({
        hasConsent: false,
        inFamilyGroup: false,
      });
    }

    // Get family group name
    const { data: familyGroup } = await supabase
      .from("family_groups")
      .select("name")
      .eq("id", profile.family_group_id)
      .single();

    return NextResponse.json({
      hasConsent: membership.spending_consent_given || false,
      consentGivenAt: membership.spending_consent_at,
      inFamilyGroup: true,
      familyGroupName: familyGroup?.name || "My Family",
    });
  } catch (error) {
    console.error("Failed to get consent status:", error);
    return NextResponse.json(
      { error: "Failed to get consent status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/family/consent
 * Give consent for family spending sharing
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

    // Get IP for audit trail
    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

    // Get user's family group
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
        { error: "You are not in a family group" },
        { status: 400 }
      );
    }

    // Update consent in family_members table
    const { error: updateError } = await supabase
      .from("family_members")
      .update({
        spending_consent_given: true,
        spending_consent_at: new Date().toISOString(),
        spending_consent_ip: ip,
      })
      .eq("group_id", profile.family_group_id)
      .eq("user_id", user.id)
      .eq("status", "active");

    if (updateError) {
      console.error("Failed to update consent:", updateError);
      return NextResponse.json(
        { error: "Failed to save consent" },
        { status: 500 }
      );
    }

    // Log the consent for audit
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      performed_by: "user",
      action_type: "consent_given",
      resource_type: "family_spending",
      resource_id: profile.family_group_id,
      ip_address: ip,
      request_details: {
        consent_type: "family_spending_sharing",
        family_group_id: profile.family_group_id,
      },
    });

    return NextResponse.json({
      success: true,
      consentGivenAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to save consent:", error);
    return NextResponse.json(
      { error: "Failed to save consent" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/finance/family/consent
 * Revoke consent for family spending sharing
 */
export async function DELETE() {
  try {
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
      return NextResponse.json(
        { error: "You are not in a family group" },
        { status: 400 }
      );
    }

    // Revoke consent
    const { error: updateError } = await supabase
      .from("family_members")
      .update({
        spending_consent_given: false,
        spending_consent_at: null,
        spending_consent_ip: null,
      })
      .eq("group_id", profile.family_group_id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Failed to revoke consent:", updateError);
      return NextResponse.json(
        { error: "Failed to revoke consent" },
        { status: 500 }
      );
    }

    // Log the revocation
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      performed_by: "user",
      action_type: "consent_revoked",
      resource_type: "family_spending",
      resource_id: profile.family_group_id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to revoke consent:", error);
    return NextResponse.json(
      { error: "Failed to revoke consent" },
      { status: 500 }
    );
  }
}
