import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/conversations
 * Fetches all conversations for the user
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

    const { data: conversations, error } = await supabase
      .from("conversations")
      .select(`
        id,
        title,
        created_at,
        updated_at,
        messages (
          id,
          content,
          created_at
        )
      `)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch conversations:", error);
      return NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: 500 }
      );
    }

    // Get first message preview for each conversation
    const conversationsWithPreview = (conversations || []).map((conv) => {
      const messages = conv.messages || [];
      // Get the first user message as preview, or first message
      const userMessage = messages.find((m: { content: string }) =>
        m.content && !m.content.startsWith("Hey!") && !m.content.startsWith("Welcome")
      );
      const preview = userMessage?.content?.slice(0, 100) || conv.title || "New conversation";

      return {
        id: conv.id,
        title: conv.title || preview.slice(0, 50) + (preview.length > 50 ? "..." : ""),
        preview: preview.slice(0, 100) + (preview.length > 100 ? "..." : ""),
        messageCount: messages.length,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
      };
    });

    return NextResponse.json({ conversations: conversationsWithPreview });
  } catch (error) {
    console.error("Conversations fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversations
 * Creates a new conversation
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

    const body = await request.json().catch(() => ({}));
    const { title } = body;

    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        title: title || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create conversation:", error);
      return NextResponse.json(
        { error: "Failed to create conversation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Conversation creation error:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
