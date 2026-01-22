import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/ratelimit";
import { dataExportRequestSchema, formatZodError, validateRequestBody } from "@/lib/validations/consent";

/**
 * GET /api/user/data-export
 * Get status of data export requests
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

    const { data: requests, error } = await supabase
      .from("data_export_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("requested_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error fetching export requests:", error);
      return NextResponse.json(
        { error: "Failed to fetch export requests" },
        { status: 500 }
      );
    }

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Data export GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/data-export
 * Request a data export (PDPL right to data portability)
 * Generates a JSON export of all user data
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

    // Rate limit check (strict - 3 requests per hour for data export)
    const rateLimitResponse = await checkRateLimit("dataExport", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Parse and validate options from request body with Zod
    let options = dataExportRequestSchema.parse({});

    try {
      const body = await request.json();
      const validation = validateRequestBody(dataExportRequestSchema, body);
      if (validation.success) {
        options = validation.data;
      }
    } catch {
      // Use defaults if no body provided
    }

    // Get client IP for audit
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      null;
    const userAgent = headersList.get("user-agent");

    // Check for recent pending request (prevent spam)
    const { data: recentRequest } = await supabase
      .from("data_export_requests")
      .select("id, status, requested_at")
      .eq("user_id", user.id)
      .in("status", ["pending", "processing"])
      .single();

    if (recentRequest) {
      return NextResponse.json(
        {
          error: "Export request already in progress",
          request_id: recentRequest.id,
          status: recentRequest.status,
        },
        { status: 429 }
      );
    }

    // Create export request record
    const { data: exportRequest, error: createError } = await supabase
      .from("data_export_requests")
      .insert({
        user_id: user.id,
        status: "processing",
        format: options.format,
        include_profile: options.include_profile,
        include_transactions: options.include_transactions,
        include_accounts: options.include_accounts,
        include_consents: options.include_consents,
        include_messages: options.include_messages,
        ip_address: ipAddress,
        user_agent: userAgent,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating export request:", createError);
      return NextResponse.json(
        { error: "Failed to create export request" },
        { status: 500 }
      );
    }

    // Log the export request
    await logAuditEvent({
      userId: user.id,
      actionType: "export_requested",
      resourceType: "export",
      resourceId: exportRequest.id,
      requestDetails: options,
    });

    // Generate the export data
    const exportData = await generateExportData(supabase, user.id, options);

    // Update the request with completed status
    // In production, you would upload to storage and provide a download URL
    const { error: updateError } = await supabase
      .from("data_export_requests")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        file_size_bytes: JSON.stringify(exportData).length,
      })
      .eq("id", exportRequest.id);

    if (updateError) {
      console.error("Error updating export request:", updateError);
    }

    // Log completion
    await logAuditEvent({
      userId: user.id,
      actionType: "export_completed",
      resourceType: "export",
      resourceId: exportRequest.id,
      responseDetails: {
        record_counts: {
          profile: exportData.profile ? 1 : 0,
          bank_connections: exportData.bank_connections?.length || 0,
          bank_accounts: exportData.bank_accounts?.length || 0,
          transactions: exportData.transactions?.length || 0,
          consents: exportData.consents?.length || 0,
          conversations: exportData.conversations?.length || 0,
        },
      },
    });

    return NextResponse.json({
      message: "Data export completed",
      request_id: exportRequest.id,
      data: exportData,
      exported_at: new Date().toISOString(),
      format: options.format,
    });
  } catch (error) {
    console.error("Data export POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Generate export data based on options
 */
async function generateExportData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  options: {
    include_profile: boolean;
    include_transactions: boolean;
    include_accounts: boolean;
    include_consents: boolean;
    include_messages: boolean;
  }
) {
  const exportData: {
    export_metadata: {
      user_id: string;
      exported_at: string;
      format: string;
      pdpl_reference: string;
    };
    profile?: unknown;
    bank_connections?: unknown[];
    bank_accounts?: unknown[];
    transactions?: unknown[];
    budgets?: unknown[];
    savings_goals?: unknown[];
    consents?: unknown[];
    conversations?: unknown[];
  } = {
    export_metadata: {
      user_id: userId,
      exported_at: new Date().toISOString(),
      format: "json",
      pdpl_reference: "Bahrain Personal Data Protection Law - Right to Data Portability",
    },
  };

  // Profile data
  if (options.include_profile) {
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "id, email, full_name, avatar_url, ai_data_mode, subscription_tier, created_at, updated_at"
      )
      .eq("id", userId)
      .single();

    exportData.profile = profile;
  }

  // Bank connections and accounts
  if (options.include_accounts) {
    const { data: connections } = await supabase
      .from("bank_connections")
      .select(
        "id, bank_id, bank_name, status, consent_id, consent_expires_at, created_at, updated_at"
      )
      .eq("user_id", userId)
      .is("deleted_at", null);

    exportData.bank_connections = connections || [];

    const { data: accounts } = await supabase
      .from("bank_accounts")
      .select(
        "id, connection_id, account_name, account_type, account_number, balance, available_balance, currency, last_synced_at, created_at"
      )
      .eq("user_id", userId)
      .is("deleted_at", null);

    exportData.bank_accounts = accounts || [];
  }

  // Transactions
  if (options.include_transactions) {
    const { data: transactions } = await supabase
      .from("transactions")
      .select(
        "id, account_id, transaction_type, amount, currency, transaction_date, description, merchant_name, category, category_group, created_at"
      )
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("transaction_date", { ascending: false })
      .limit(10000); // Limit to prevent huge exports

    exportData.transactions = transactions || [];

    // Also include budgets and savings goals
    const { data: budgets } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", userId);

    exportData.budgets = budgets || [];

    const { data: goals } = await supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", userId);

    exportData.savings_goals = goals || [];
  }

  // Consents
  if (options.include_consents) {
    const { data: consents } = await supabase
      .from("user_consents")
      .select("*")
      .eq("user_id", userId)
      .order("consent_given_at", { ascending: false });

    exportData.consents = consents || [];
  }

  // Chat messages
  if (options.include_messages) {
    const { data: conversations } = await supabase
      .from("conversations")
      .select(
        `
        id,
        title,
        created_at,
        messages (
          id,
          role,
          content,
          created_at
        )
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    exportData.conversations = conversations || [];
  }

  return exportData;
}
