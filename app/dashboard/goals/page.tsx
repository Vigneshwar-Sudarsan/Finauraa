import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { GoalsContent } from "@/components/dashboard/goals-content";
import { DashboardBottomNav } from "@/components/dashboard/dashboard-bottom-nav";

export const dynamic = "force-dynamic";

export default function GoalsPage() {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar className="hidden md:flex" />
      <SidebarInset>
        <main className="h-dvh w-full flex flex-col overflow-hidden pb-16 md:pb-0">
          <GoalsContent />
        </main>
        <DashboardBottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
