import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/conversations/[id]/messages
 * Adds a message to a conversation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify conversation belongs to user
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single();

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { role, content, rich_content } = body;

    if (!role || !content) {
      return NextResponse.json(
        { error: "Role and content are required" },
        { status: 400 }
      );
    }

    if (!["user", "assistant"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be 'user' or 'assistant'" },
        { status: 400 }
      );
    }

    // Insert message
    const { data: message, error: msgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role,
        content,
        rich_content: rich_content || null,
      })
      .select()
      .single();

    if (msgError) {
      console.error("Failed to create message:", msgError);
      return NextResponse.json(
        { error: "Failed to create message" },
        { status: 500 }
      );
    }

    // Update conversation's updated_at and optionally set title from first user message
    const updateData: { updated_at: string; title?: string } = {
      updated_at: new Date().toISOString(),
    };

    // If this is the first user message and no title set, use it as title
    if (role === "user") {
      const { data: conv } = await supabase
        .from("conversations")
        .select("title")
        .eq("id", conversationId)
        .single();

      if (!conv?.title) {
        updateData.title = content.slice(0, 100);
      }
    }

    await supabase
      .from("conversations")
      .update(updateData)
      .eq("id", conversationId);

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Message creation error:", error);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
