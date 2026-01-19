import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AccountDetailContent } from "@/components/dashboard/account-detail-content";
import { DashboardBottomNav } from "@/components/dashboard/dashboard-bottom-nav";

export const dynamic = "force-dynamic";

function AccountDetailLoading() {
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

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar className="hidden md:flex" />
      <SidebarInset>
        <main className="h-dvh w-full flex flex-col overflow-hidden pb-16 md:pb-0">
          <Suspense fallback={<AccountDetailLoading />}>
            <AccountDetailContent accountId={id} />
          </Suspense>
        </main>
        <DashboardBottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
