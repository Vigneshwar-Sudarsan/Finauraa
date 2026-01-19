import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTarabutClient } from "@/lib/tarabut/client";

/**
 * POST /api/tarabut/connect
 * Initiates bank connection using Tarabut Intent flow
 *
 * Flow:
 * 1. Get access token from Tarabut
 * 2. Create Intent (returns connectUrl)
 * 3. Store intent info in database
 * 4. Return connectUrl - user selects their bank in Tarabut Connect UI
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Tarabut credentials are configured
    if (!process.env.TARABUT_CLIENT_ID || !process.env.TARABUT_CLIENT_SECRET) {
      return NextResponse.json(
        { error: "Tarabut credentials not configured. Please add TARABUT_CLIENT_ID and TARABUT_CLIENT_SECRET to .env.local" },
        { status: 500 }
      );
    }

    // Create Tarabut client
    const client = createTarabutClient();

    // Get user profile for intent creation
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    // Parse user name
    const nameParts = (profile?.full_name || "User").split(" ");
    const firstName = nameParts[0] || "User";
    const lastName = nameParts.slice(1).join(" ") || "Account";

    // Step 1: Get access token
    console.log("Getting Tarabut access token...");
    const tokenResponse = await client.getAccessToken(user.id);
    console.log("Got access token");

    // Step 2: Create Intent
    console.log("Creating Tarabut intent...");
    const intentResponse = await client.createIntent(tokenResponse.accessToken, {
      id: user.id,
      firstName,
      lastName,
      email: profile?.email || user.email,
    });
    console.log("Created intent:", intentResponse.intentId);

    // Store intent info in database
    // Bank info will be populated after user selects their bank in Tarabut Connect
    const { error: insertError } = await supabase.from("bank_connections").insert({
      user_id: user.id,
      bank_id: "pending", // Will be updated after user selects bank
      bank_name: "Pending Selection",
      consent_id: intentResponse.intentId,
      status: "pending",
      consent_expires_at: intentResponse.expiry,
    });

    if (insertError) {
      console.error("Failed to store intent:", insertError);
      // Continue anyway - the intent was created successfully
    }

    // Return the Tarabut Connect URL
    // User will select their bank in Tarabut's hosted UI
    return NextResponse.json({
      authorizationUrl: intentResponse.connectUrl,
      intentId: intentResponse.intentId,
    });
  } catch (error) {
    console.error("Bank connection error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to initiate bank connection";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
