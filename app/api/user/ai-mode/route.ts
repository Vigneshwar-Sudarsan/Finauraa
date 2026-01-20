import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Update user's AI data mode
 * POST /api/user/ai-mode
 *
 * Body: {
 *   mode: 'privacy-first' | 'enhanced',
 *   consentGiven?: boolean  // Required when enabling enhanced mode
 * }
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
    const { mode, consentGiven } = body as {
      mode: 'privacy-first' | 'enhanced';
      consentGiven?: boolean;
    };

    // Validate mode
    if (!mode || !['privacy-first', 'enhanced'].includes(mode)) {
      return NextResponse.json(
        { error: "Invalid mode. Must be 'privacy-first' or 'enhanced'" },
        { status: 400 }
      );
    }

    // Get user's Pro status
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_pro")
      .eq("id", user.id)
      .single();

    const isPro = profile?.is_pro ?? false;

    // Enhanced mode requires Pro tier
    if (mode === 'enhanced' && !isPro) {
      return NextResponse.json(
        {
          error: "Enhanced AI is a Pro feature. Upgrade to Pro to access full AI capabilities.",
          requiresUpgrade: true
        },
        { status: 403 }
      );
    }

    // Enhanced mode requires explicit consent
    if (mode === 'enhanced' && !consentGiven) {
      return NextResponse.json(
        {
          error: "Consent required to enable Enhanced AI",
          requiresConsent: true
        },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: {
      ai_data_mode: string;
      enhanced_ai_consent_given_at?: string;
      enhanced_ai_consent_ip?: string;
    } = {
      ai_data_mode: mode
    };

    // If enabling enhanced mode, record consent
    if (mode === 'enhanced') {
      updateData.enhanced_ai_consent_given_at = new Date().toISOString();
      // Get IP from request (for audit trail)
      const forwardedFor = request.headers.get('x-forwarded-for');
      const ip = forwardedFor ? forwardedFor.split(',')[0] :
                  request.headers.get('x-real-ip') || 'unknown';
      updateData.enhanced_ai_consent_ip = ip;
    }

    // Update user's AI mode
    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (error) {
      console.error("Error updating AI mode:", error);
      return NextResponse.json(
        { error: "Failed to update AI mode" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mode,
      message: mode === 'enhanced'
        ? "Enhanced AI enabled. You'll now receive specific financial insights with exact amounts."
        : "Privacy-first mode enabled. Your financial data will be anonymized before AI processing."
    });

  } catch (error) {
    console.error("AI mode update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get user's current AI mode
 * GET /api/user/ai-mode
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("ai_data_mode, is_pro, enhanced_ai_consent_given_at")
      .eq("id", user.id)
      .single();

    const mode = profile?.ai_data_mode || 'privacy-first';
    const isPro = profile?.is_pro ?? false;
    const hasConsent = !!profile?.enhanced_ai_consent_given_at;
    const canUseEnhanced = isPro && hasConsent;

    return NextResponse.json({
      mode,
      isPro,
      hasConsent,
      canUseEnhanced,
      consentGivenAt: profile?.enhanced_ai_consent_given_at || null
    });

  } catch (error) {
    console.error("Get AI mode error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
