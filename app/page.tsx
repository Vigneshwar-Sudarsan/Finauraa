import { Suspense } from "react";
import { ChatContainer } from "@/components/chat/chat-container";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";

// Force dynamic rendering - this page uses Supabase which requires env vars
export const dynamic = "force-dynamic";

function ChatLoading() {
  return (
    <div className="h-dvh w-full flex items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="size-2 bg-foreground/40 rounded-full animate-pulse" />
        <div className="size-2 bg-foreground/40 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
        <div className="size-2 bg-foreground/40 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar className="hidden md:flex" />
      <SidebarInset>
        <main className="h-dvh w-full flex flex-col">
          <Suspense fallback={<ChatLoading />}>
            <ChatContainer />
          </Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
