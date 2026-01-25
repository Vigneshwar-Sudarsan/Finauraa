import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getFinanceManagerContext,
} from "@/lib/ai/finance-manager";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the full finance manager context which includes health score
    const context = await getFinanceManagerContext(user.id);

    if (!context) {
      return NextResponse.json(
        { error: "Failed to calculate financial health" },
        { status: 500 }
      );
    }

    // Return the financial health data
    return NextResponse.json(context.financialHealth);
  } catch (error) {
    console.error("Financial health API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch financial health" },
      { status: 500 }
    );
  }
}
