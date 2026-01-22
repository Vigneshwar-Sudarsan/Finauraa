import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { transferOwnershipSchema } from "@/lib/validations/family";
import { validateRequestBody, formatZodError } from "@/lib/validations/consent";

/**
 * POST /api/family/group/transfer-ownership
 * Transfers group ownership to another active member
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

    // Get user's owned group
    const { data: group } = await supabase
      .from("family_groups")
      .select("id, name")
      .eq("owner_id", user.id)
      .single();

    if (!group) {
      return NextResponse.json(
        { error: "You do not own a family group" },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = validateRequestBody(transferOwnershipSchema, body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { new_owner_id, confirm } = validation.data;

    if (!confirm) {
      return NextResponse.json(
        { error: "You must confirm the ownership transfer" },
        { status: 400 }
      );
    }

    // Verify new owner is an active member of the group
    const { data: newOwnerMembership } = await supabase
      .from("family_members")
      .select("id, user_id, role")
      .eq("group_id", group.id)
      .eq("user_id", new_owner_id)
      .eq("status", "active")
      .single();

    if (!newOwnerMembership) {
      return NextResponse.json(
        { error: "The selected user is not an active member of your family group" },
        { status: 400 }
      );
    }

    // Cannot transfer to yourself
    if (new_owner_id === user.id) {
      return NextResponse.json(
        { error: "You cannot transfer ownership to yourself" },
        { status: 400 }
      );
    }

    // Get current owner's membership record
    const { data: currentOwnerMembership } = await supabase
      .from("family_members")
      .select("id")
      .eq("group_id", group.id)
      .eq("user_id", user.id)
      .eq("role", "owner")
      .single();

    // Begin transfer: Update group owner
    const { error: groupUpdateError } = await supabase
      .from("family_groups")
      .update({
        owner_id: new_owner_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", group.id);

    if (groupUpdateError) {
      console.error("Failed to transfer group ownership:", groupUpdateError);
      return NextResponse.json(
        { error: "Failed to transfer ownership" },
        { status: 500 }
      );
    }

    // Update new owner's role to "owner"
    await supabase
      .from("family_members")
      .update({ role: "owner" })
      .eq("id", newOwnerMembership.id);

    // Update current owner's role to "admin"
    if (currentOwnerMembership) {
      await supabase
        .from("family_members")
        .update({ role: "admin" })
        .eq("id", currentOwnerMembership.id);
    }

    // Fetch new owner's profile for response
    const { data: newOwnerProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", new_owner_id)
      .single();

    const newOwnerName = newOwnerProfile?.full_name || newOwnerProfile?.email || "the new owner";

    return NextResponse.json({
      message: `Ownership of "${group.name}" has been transferred to ${newOwnerName}`,
      newOwnerId: new_owner_id,
    });
  } catch (error) {
    console.error("Ownership transfer error:", error);
    return NextResponse.json(
      { error: "Failed to transfer ownership" },
      { status: 500 }
    );
  }
}
