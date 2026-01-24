import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type GuideType = "chat" | "dashboard";

// GET - Check if user has seen the feature guide
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get guide type from query params (default to "chat" for backward compatibility)
    const { searchParams } = new URL(request.url);
    const guideType: GuideType = (searchParams.get("type") as GuideType) || "chat";

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("has_seen_feature_guide, has_seen_dashboard_guide")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching feature guide status:", error);
      return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
    }

    const hasSeenGuide = guideType === "dashboard"
      ? (profile?.has_seen_dashboard_guide as boolean) ?? false
      : (profile?.has_seen_feature_guide as boolean) ?? false;

    return NextResponse.json({ hasSeenGuide });
  } catch (error) {
    console.error("Feature guide GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Mark feature guide as seen or reset it
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { seen, type = "chat" }: { seen: boolean; type?: GuideType } = body;

    // Validate input
    if (typeof seen !== "boolean") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const column = type === "dashboard"
      ? "has_seen_dashboard_guide"
      : "has_seen_feature_guide";

    const { error } = await supabase
      .from("profiles")
      .update({ [column]: seen })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating feature guide status:", error);
      return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
    }

    return NextResponse.json({ success: true, hasSeenGuide: seen });
  } catch (error) {
    console.error("Feature guide POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
