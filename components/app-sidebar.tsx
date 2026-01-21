"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Sparkle,
  House,
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
    if (url === "/dashboard") return pathname === "/dashboard";
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
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {footerItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton tooltip={item.title} asChild>
                <a href={item.url}>
                  <item.icon size={20} />
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
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
