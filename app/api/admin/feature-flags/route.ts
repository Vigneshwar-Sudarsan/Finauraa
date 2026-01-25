import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { invalidateFeatureFlagsCache } from "@/lib/features-db";
import { requireAdmin } from "@/lib/admin/access-control";
import { logAdminAction } from "@/lib/audit";

/**
 * Admin API for Feature Flags Management
 *
 * GET /api/admin/feature-flags - List all feature flags
 * PUT /api/admin/feature-flags - Update a feature flag
 * POST /api/admin/feature-flags - Create a new feature flag
 */

/**
 * GET /api/admin/feature-flags
 * Fetch all feature flags for the admin panel
 */
export async function GET() {
  try {
    const adminCheck = await requireAdmin("/api/admin/feature-flags");
    if (!adminCheck.isAdmin) {
      return adminCheck.response!;
    }

    const supabase = await createClient();

    const { data: flags, error } = await supabase
      .from("feature_flags")
      .select("*")
      .order("category", { ascending: true })
      .order("feature_name", { ascending: true });

    if (error) {
      console.error("Error fetching feature flags:", error);
      return NextResponse.json(
        { error: "Failed to fetch feature flags" },
        { status: 500 }
      );
    }

    // Group by category for easier display
    const grouped: Record<string, typeof flags> = {};
    flags?.forEach((flag) => {
      const category = flag.category || "general";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(flag);
    });

    return NextResponse.json({
      flags,
      grouped,
      categories: Object.keys(grouped),
    });
  } catch (error) {
    console.error("Feature flags fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feature flags" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/feature-flags
 * Update an existing feature flag
 */
export async function PUT(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin("/api/admin/feature-flags");
    if (!adminCheck.isAdmin) {
      return adminCheck.response!;
    }

    const supabase = await createClient();
    const body = await request.json();
    const { id, free_value, pro_value, family_value, is_active, description } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Feature flag ID is required" },
        { status: 400 }
      );
    }

    // Fetch existing flag for audit logging (before state)
    const { data: beforeFlag } = await supabase
      .from("feature_flags")
      .select("*")
      .eq("id", id)
      .single();

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: adminCheck.userId,
    };

    if (free_value !== undefined) updateData.free_value = free_value;
    if (pro_value !== undefined) updateData.pro_value = pro_value;
    if (family_value !== undefined) updateData.family_value = family_value;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (description !== undefined) updateData.description = description;

    const { data: updatedFlag, error } = await supabase
      .from("feature_flags")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating feature flag:", error);
      return NextResponse.json(
        { error: "Failed to update feature flag" },
        { status: 500 }
      );
    }

    // Log admin action with before/after state
    await logAdminAction(
      adminCheck.userId!,
      "admin_action",
      "feature_flag",
      id,
      {
        action: "update_feature_flag",
        before: beforeFlag,
        after: updatedFlag,
        changes: updateData,
      }
    );

    // Invalidate cache so changes take effect immediately
    invalidateFeatureFlagsCache();

    return NextResponse.json({
      success: true,
      flag: updatedFlag,
      message: `Feature flag "${updatedFlag.feature_name}" updated successfully`,
    });
  } catch (error) {
    console.error("Feature flag update error:", error);
    return NextResponse.json(
      { error: "Failed to update feature flag" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/feature-flags
 * Create a new feature flag
 */
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin("/api/admin/feature-flags");
    if (!adminCheck.isAdmin) {
      return adminCheck.response!;
    }

    const supabase = await createClient();
    const body = await request.json();
    const {
      feature_key,
      feature_name,
      description,
      category,
      free_value,
      pro_value,
      family_value,
      value_type,
    } = body;

    if (!feature_key || !feature_name) {
      return NextResponse.json(
        { error: "feature_key and feature_name are required" },
        { status: 400 }
      );
    }

    // Check if feature_key already exists
    const { data: existing } = await supabase
      .from("feature_flags")
      .select("id")
      .eq("feature_key", feature_key)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Feature key already exists" },
        { status: 409 }
      );
    }

    const { data: newFlag, error } = await supabase
      .from("feature_flags")
      .insert({
        feature_key,
        feature_name,
        description: description || null,
        category: category || "general",
        free_value: free_value ?? null,
        pro_value: pro_value ?? null,
        family_value: family_value ?? null,
        value_type: value_type || "boolean",
        is_active: true,
        updated_by: adminCheck.userId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating feature flag:", error);
      return NextResponse.json(
        { error: "Failed to create feature flag" },
        { status: 500 }
      );
    }

    // Log admin action
    await logAdminAction(
      adminCheck.userId!,
      "admin_action",
      "feature_flag",
      newFlag.id,
      {
        action: "create_feature_flag",
        flag: newFlag,
      }
    );

    // Invalidate cache
    invalidateFeatureFlagsCache();

    return NextResponse.json({
      success: true,
      flag: newFlag,
      message: `Feature flag "${feature_name}" created successfully`,
    });
  } catch (error) {
    console.error("Feature flag create error:", error);
    return NextResponse.json(
      { error: "Failed to create feature flag" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/feature-flags?id=xxx
 * Delete a feature flag (soft delete by setting is_active = false)
 */
export async function DELETE(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin("/api/admin/feature-flags");
    if (!adminCheck.isAdmin) {
      return adminCheck.response!;
    }

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Feature flag ID is required" },
        { status: 400 }
      );
    }

    // Fetch existing flag for audit logging (before state)
    const { data: beforeFlag } = await supabase
      .from("feature_flags")
      .select("*")
      .eq("id", id)
      .single();

    // Soft delete - just deactivate
    const { data: flag, error } = await supabase
      .from("feature_flags")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error deleting feature flag:", error);
      return NextResponse.json(
        { error: "Failed to delete feature flag" },
        { status: 500 }
      );
    }

    // Log admin action with before/after state
    await logAdminAction(
      adminCheck.userId!,
      "admin_action",
      "feature_flag",
      id,
      {
        action: "delete_feature_flag",
        before: beforeFlag,
        after: flag,
      }
    );

    // Invalidate cache
    invalidateFeatureFlagsCache();

    return NextResponse.json({
      success: true,
      message: `Feature flag "${flag.feature_name}" deactivated`,
    });
  } catch (error) {
    console.error("Feature flag delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete feature flag" },
      { status: 500 }
    );
  }
}
