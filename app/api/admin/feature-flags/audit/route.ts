import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/access-control";

/**
 * GET /api/admin/feature-flags/audit
 * Fetch feature flag audit log history
 */
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin("/api/admin/feature-flags/audit");
    if (!adminCheck.isAdmin) {
      return adminCheck.response!;
    }

    const supabase = await createClient();

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const featureKey = searchParams.get("feature_key");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build query
    let query = supabase
      .from("feature_flag_audit_log")
      .select(`
        *,
        changed_by_profile:profiles!feature_flag_audit_log_changed_by_fkey(email, full_name)
      `)
      .order("changed_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (featureKey) {
      query = query.eq("feature_key", featureKey);
    }

    const { data: auditLogs, error } = await query;

    if (error) {
      console.error("Error fetching audit logs:", error);
      return NextResponse.json(
        { error: "Failed to fetch audit logs" },
        { status: 500 }
      );
    }

    // Get total count
    let countQuery = supabase
      .from("feature_flag_audit_log")
      .select("id", { count: "exact", head: true });

    if (featureKey) {
      countQuery = countQuery.eq("feature_key", featureKey);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      logs: auditLogs || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (offset + limit) < (count || 0),
      },
    });
  } catch (error) {
    console.error("Audit log fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
