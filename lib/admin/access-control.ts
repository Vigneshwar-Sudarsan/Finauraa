/**
 * Admin Access Control Library
 * Database-controlled admin access with full audit trail
 */

import { createClient } from "@/lib/supabase/server";
import { logAdminAction, logAdminAccessDenied } from "@/lib/audit";
import { NextResponse } from "next/server";

export interface AdminCheckResult {
  isAdmin: boolean;
  userId: string | null;
  response?: NextResponse;
}

/**
 * Check if a user has admin access via admin_users table
 * @param userId - The user ID to check
 * @returns Promise<boolean> - True if user is an admin
 */
export async function checkAdminAccess(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("admin_users")
      .select("id, revoked_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error checking admin access:", error);
      return false;
    }

    // User is admin if they exist in admin_users table and access is not revoked
    return !!data && !data.revoked_at;
  } catch (error) {
    console.error("Admin access check error:", error);
    return false;
  }
}

/**
 * Require admin access for a route handler
 * Returns a result indicating if user is admin, or a response to return
 *
 * Usage:
 * ```ts
 * const adminCheck = await requireAdmin("/api/admin/feature-flags");
 * if (!adminCheck.isAdmin) {
 *   return adminCheck.response!;
 * }
 * // Continue with admin-only logic
 * ```
 *
 * @param requestPath - The API path being accessed (for audit logging)
 * @returns AdminCheckResult with isAdmin flag and optional response
 */
export async function requireAdmin(requestPath: string): Promise<AdminCheckResult> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        isAdmin: false,
        userId: null,
        response: NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        ),
      };
    }

    // Check admin access via database
    const isAdmin = await checkAdminAccess(user.id);

    if (!isAdmin) {
      // Log denied access attempt
      await logAdminAccessDenied(user.id, requestPath, {
        request_path: requestPath,
      });

      return {
        isAdmin: false,
        userId: user.id,
        response: NextResponse.json(
          { error: "Admin access required" },
          { status: 403 }
        ),
      };
    }

    return {
      isAdmin: true,
      userId: user.id,
    };
  } catch (error) {
    console.error("requireAdmin error:", error);
    return {
      isAdmin: false,
      userId: null,
      response: NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      ),
    };
  }
}

/**
 * Grant admin access to a user
 * @param grantedByAdminId - The admin user ID performing the grant
 * @param targetUserId - The user ID to grant admin access to
 * @param reason - Reason for granting admin access
 * @returns Promise<{ success: boolean; error?: string }>
 */
export async function grantAdminAccess(
  grantedByAdminId: string,
  targetUserId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Verify granter is admin
    const isGranterAdmin = await checkAdminAccess(grantedByAdminId);
    if (!isGranterAdmin) {
      await logAdminAccessDenied(grantedByAdminId, "grant_admin_access", {
        target_user_id: targetUserId,
        reason,
      });
      return { success: false, error: "Granter is not an admin" };
    }

    // Check if user already has admin access (and not revoked)
    const { data: existing } = await supabase
      .from("admin_users")
      .select("id, revoked_at")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (existing && !existing.revoked_at) {
      return { success: false, error: "User already has admin access" };
    }

    // If previously revoked, update the existing record
    if (existing?.revoked_at) {
      const { error: updateError } = await supabase
        .from("admin_users")
        .update({
          granted_by: grantedByAdminId,
          granted_at: new Date().toISOString(),
          revoked_at: null,
          revoked_by: null,
          notes: reason,
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Error re-granting admin access:", updateError);
        return { success: false, error: "Failed to re-grant admin access" };
      }
    } else {
      // Insert new admin user record
      const { error: insertError } = await supabase
        .from("admin_users")
        .insert({
          user_id: targetUserId,
          granted_by: grantedByAdminId,
          granted_at: new Date().toISOString(),
          notes: reason,
        });

      if (insertError) {
        console.error("Error granting admin access:", insertError);
        return { success: false, error: "Failed to grant admin access" };
      }
    }

    // Log the admin grant action
    await logAdminAction(grantedByAdminId, "admin_grant", "admin", targetUserId, {
      target_user_id: targetUserId,
      reason,
    });

    return { success: true };
  } catch (error) {
    console.error("grantAdminAccess error:", error);
    return { success: false, error: "Internal server error" };
  }
}

/**
 * Revoke admin access from a user
 * @param revokedByAdminId - The admin user ID performing the revocation
 * @param targetUserId - The user ID to revoke admin access from
 * @param reason - Reason for revoking admin access
 * @returns Promise<{ success: boolean; error?: string }>
 */
export async function revokeAdminAccess(
  revokedByAdminId: string,
  targetUserId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Verify revoker is admin
    const isRevokerAdmin = await checkAdminAccess(revokedByAdminId);
    if (!isRevokerAdmin) {
      await logAdminAccessDenied(revokedByAdminId, "revoke_admin_access", {
        target_user_id: targetUserId,
        reason,
      });
      return { success: false, error: "Revoker is not an admin" };
    }

    // Don't allow self-revocation
    if (revokedByAdminId === targetUserId) {
      return { success: false, error: "Cannot revoke your own admin access" };
    }

    // Check if user has admin access
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("id, revoked_at")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!adminUser) {
      return { success: false, error: "User does not have admin access" };
    }

    if (adminUser.revoked_at) {
      return { success: false, error: "Admin access already revoked" };
    }

    // Revoke admin access
    const { error: updateError } = await supabase
      .from("admin_users")
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: revokedByAdminId,
        notes: reason,
      })
      .eq("id", adminUser.id);

    if (updateError) {
      console.error("Error revoking admin access:", updateError);
      return { success: false, error: "Failed to revoke admin access" };
    }

    // Log the admin revoke action
    await logAdminAction(revokedByAdminId, "admin_revoke", "admin", targetUserId, {
      target_user_id: targetUserId,
      reason,
    });

    return { success: true };
  } catch (error) {
    console.error("revokeAdminAccess error:", error);
    return { success: false, error: "Internal server error" };
  }
}
