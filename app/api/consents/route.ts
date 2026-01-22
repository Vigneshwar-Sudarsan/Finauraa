import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logConsentEvent } from "@/lib/audit";
import { headers } from "next/headers";

/**
 * GET /api/consents
 * List all consents for the authenticated user
 * PDPL Requirement: Users must be able to view their consents
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // active, revoked, expired, all
    const type = searchParams.get("type"); // bank_access, ai_data, etc.

    let query = supabase
      .from("user_consents")
      .select("*")
      .eq("user_id", user.id)
      .order("consent_given_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("consent_status", status);
    }

    if (type) {
      query = query.eq("consent_type", type);
    }

    const { data: consents, error } = await query;

    if (error) {
      console.error("Error fetching consents:", error);
      return NextResponse.json(
        { error: "Failed to fetch consents" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      consents,
      count: consents?.length || 0,
    });
  } catch (error) {
    console.error("Consents GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/consents
 * Create a new consent record
 * BOBF/PDPL Requirement: Explicit consent must be recorded with full audit trail
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
      consent_type,
      provider_id,
      provider_name,
      permissions_granted,
      purpose,
      scope,
      expires_in_days = 90, // Default 90 days per BOBF
      consent_version = "1.0",
      metadata,
    } = body;

    // Validate required fields
    if (!consent_type || !permissions_granted || !purpose) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["consent_type", "permissions_granted", "purpose"],
        },
        { status: 400 }
      );
    }

    // Validate consent type
    const validTypes = ["bank_access", "ai_data", "marketing", "terms_of_service", "privacy_policy"];
    if (!validTypes.includes(consent_type)) {
      return NextResponse.json(
        { error: `Invalid consent_type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Get client IP and user agent for audit trail
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      null;
    const userAgent = headersList.get("user-agent");

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expires_in_days);

    // Check for existing active consent of same type/provider
    const { data: existingConsent } = await supabase
      .from("user_consents")
      .select("id")
      .eq("user_id", user.id)
      .eq("consent_type", consent_type)
      .eq("consent_status", "active")
      .eq("provider_id", provider_id || "")
      .single();

    if (existingConsent) {
      // Update existing consent instead of creating duplicate
      const { data: updatedConsent, error: updateError } = await supabase
        .from("user_consents")
        .update({
          permissions_granted,
          purpose,
          scope,
          consent_expires_at: expiresAt.toISOString(),
          consent_version,
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: metadata || {},
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConsent.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating consent:", updateError);
        return NextResponse.json(
          { error: "Failed to update consent" },
          { status: 500 }
        );
      }

      // Log consent update
      await logConsentEvent(user.id, "consent_given", updatedConsent.id, {
        action: "updated",
        consent_type,
        provider_id,
        permissions_granted,
      });

      return NextResponse.json({
        consent: updatedConsent,
        message: "Consent updated successfully",
      });
    }

    // Create new consent
    const { data: consent, error } = await supabase
      .from("user_consents")
      .insert({
        user_id: user.id,
        consent_type,
        provider_id: provider_id || null,
        provider_name: provider_name || null,
        permissions_granted,
        purpose,
        scope: scope || null,
        consent_expires_at: expiresAt.toISOString(),
        consent_status: "active",
        consent_version,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating consent:", error);
      return NextResponse.json(
        { error: "Failed to create consent" },
        { status: 500 }
      );
    }

    // Log consent creation
    await logConsentEvent(user.id, "consent_given", consent.id, {
      action: "created",
      consent_type,
      provider_id,
      permissions_granted,
      expires_at: expiresAt.toISOString(),
    });

    return NextResponse.json(
      {
        consent,
        message: "Consent recorded successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Consents POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
