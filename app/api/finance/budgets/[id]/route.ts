import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/finance/budgets/[id]
 * Deletes (deactivates) a budget
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from("budgets")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to delete budget:", error);
      return NextResponse.json(
        { error: "Failed to delete budget" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Budget delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete budget" },
      { status: 500 }
    );
  }
}
