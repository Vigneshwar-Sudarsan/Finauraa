import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { PrivacyContent } from "@/components/dashboard/privacy-content";
import { DashboardBottomNav } from "@/components/dashboard/dashboard-bottom-nav";

export const dynamic = "force-dynamic";

function PrivacyLoading() {
  return (
    <div className="h-dvh w-full flex items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="size-2 bg-foreground/40 rounded-full animate-pulse" />
        <div
          className="size-2 bg-foreground/40 rounded-full animate-pulse"
          style={{ animationDelay: "150ms" }}
        />
        <div
          className="size-2 bg-foreground/40 rounded-full animate-pulse"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar className="hidden md:flex" />
      <SidebarInset>
        <main className="h-dvh w-full flex flex-col overflow-hidden pb-16 md:pb-0">
          <Suspense fallback={<PrivacyLoading />}>
            <PrivacyContent />
          </Suspense>
        </main>
        <DashboardBottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
