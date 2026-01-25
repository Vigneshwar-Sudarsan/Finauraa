"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Sparkle,
  Wallet,
  PaperPlaneTilt,
  ChartPie,
  Gear,
  Question,
  SignOut,
  Receipt,
  Target,
} from "@phosphor-icons/react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/client";
import { GuideSpot } from "@/components/chat/feature-guide";

// Map of sidebar items to their guide step IDs
type GuideStepId = "nav-accounts" | "nav-transactions" | "nav-spending" | "nav-goals" | "nav-settings";

const guideStepMap: Record<string, GuideStepId> = {
  Accounts: "nav-accounts",
  Transactions: "nav-transactions",
  Spending: "nav-spending",
  Goals: "nav-goals",
  Settings: "nav-settings",
};

// Main navigation items
const navItems = [
  {
    title: "AI",
    icon: Sparkle,
    url: "/",
  },
];

// Dashboard navigation items
const dashboardItems = [
  {
    title: "Accounts",
    icon: Wallet,
    url: "/dashboard/accounts",
  },
  {
    title: "Transactions",
    icon: Receipt,
    url: "/dashboard/transactions",
  },
  {
    title: "Spending",
    icon: ChartPie,
    url: "/dashboard/spending",
  },
  {
    title: "Goals",
    icon: Target,
    url: "/dashboard/goals",
  },
  {
    title: "Payments",
    icon: PaperPlaneTilt,
    url: "/dashboard/payments",
  },
];

const footerItems = [
  {
    title: "Settings",
    icon: Gear,
    url: "/dashboard/settings",
  },
  {
    title: "Help",
    icon: Question,
    url: "#",
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isActive = (url: string) => {
    if (url === "/") return pathname === "/";
    // Accounts should be active on both /dashboard and /dashboard/accounts
    if (url === "/dashboard/accounts") {
      return pathname === "/dashboard" || pathname.startsWith("/dashboard/accounts");
    }
    return pathname.startsWith(url);
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="finauraa"
              className="hover:bg-transparent active:bg-transparent cursor-default"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-foreground text-background">
                <Sparkle size={16} weight="fill" />
              </div>
              <span className="font-semibold">finauraa</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map((item) => {
              const active = isActive(item.url);
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={active}
                    asChild
                  >
                    <a href={item.url}>
                      <item.icon size={20} weight={active ? "fill" : "regular"} />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarMenu>
            {dashboardItems.map((item) => {
              const active = isActive(item.url);
              const guideId = guideStepMap[item.title];

              const menuItem = (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={active}
                    asChild
                  >
                    <a href={item.url}>
                      <item.icon size={20} weight={active ? "fill" : "regular"} />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );

              // Wrap with GuideSpot if this item has a guide step
              if (guideId) {
                return (
                  <GuideSpot key={item.title} id={guideId} side="right" align="center">
                    {menuItem}
                  </GuideSpot>
                );
              }

              return menuItem;
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {footerItems.map((item) => {
            const guideId = guideStepMap[item.title];

            const menuItem = (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton tooltip={item.title} asChild>
                  <a href={item.url}>
                    <item.icon size={20} />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );

            // Wrap Settings with GuideSpot
            if (guideId) {
              return (
                <GuideSpot key={item.title} id={guideId} side="right" align="center">
                  {menuItem}
                </GuideSpot>
              );
            }

            return menuItem;
          })}
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Log out" onClick={handleLogout}>
              <SignOut size={20} />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
