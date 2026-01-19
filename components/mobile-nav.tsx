"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Sparkle, ChartPieSlice } from "@phosphor-icons/react";

export function MobileNavButton() {
  const pathname = usePathname();

  const isAiView = pathname === "/";
  const targetUrl = isAiView ? "/dashboard" : "/";
  const Icon = isAiView ? ChartPieSlice : Sparkle;

  return (
    <Link
      href={targetUrl}
      className="flex items-center justify-center size-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none"
    >
      <Icon size={18} />
    </Link>
  );
}
