"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Wallet,
  Receipt,
  ChartPie,
  Target,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { DashboardGuideSpot } from "./dashboard-feature-guide";

// Guide step mapping
type DashboardGuideStepId =
  | "dash-accounts"
  | "dash-transactions"
  | "dash-spending"
  | "dash-goals";

const guideStepMap: Record<string, DashboardGuideStepId> = {
  Accounts: "dash-accounts",
  Transactions: "dash-transactions",
  Spending: "dash-spending",
  Goals: "dash-goals",
};

// Bottom navigation items
const navItems = [
  {
    title: "Accounts",
    icon: Wallet,
    href: "/dashboard/accounts",
  },
  {
    title: "Transactions",
    icon: Receipt,
    href: "/dashboard/transactions",
  },
  {
    title: "Spending",
    icon: ChartPie,
    href: "/dashboard/spending",
  },
  {
    title: "Goals",
    icon: Target,
    href: "/dashboard/goals",
  },
];

export function DashboardBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    // Accounts should be active on both /dashboard and /dashboard/accounts
    if (href === "/dashboard/accounts") {
      return pathname === "/dashboard" || pathname.startsWith("/dashboard/accounts");
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const guideId = guideStepMap[item.title];

          const navLink = (
            <Link
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon size={22} weight={active ? "fill" : "regular"} />
              <span className="text-[10px] font-medium">{item.title}</span>
            </Link>
          );

          if (guideId) {
            return (
              <DashboardGuideSpot key={item.title} id={guideId} side="top" align="center">
                {navLink}
              </DashboardGuideSpot>
            );
          }

          return <div key={item.title}>{navLink}</div>;
        })}
      </div>
    </nav>
  );
}
