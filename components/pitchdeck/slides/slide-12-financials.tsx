"use client";

import React from "react";
import { FadeIn, StaggerContainer, StaggerItem } from "../animated";
import { TrendUp, CurrencyDollar, Users, ChartBar } from "@phosphor-icons/react";

const year1 = [
  { month: "Month 1", users: "500", pro: "25", revenue: "$200" },
  { month: "Month 3", users: "1,000", pro: "75", revenue: "$600" },
  { month: "Month 6", users: "2,500", pro: "250", revenue: "$2,000" },
  { month: "Month 12", users: "8,000", pro: "800", revenue: "$6,400" },
];

const year2 = [
  { month: "Month 18", users: "20,000", pro: "2,000", revenue: "$16,000" },
  { month: "Month 24", users: "50,000", pro: "5,000", revenue: "$40,000" },
];

const keyMetrics = [
  { label: "Year 1 Revenue", value: "$25-35K", icon: CurrencyDollar, color: "text-emerald-400" },
  { label: "Year 2 Revenue", value: "$250-350K", icon: TrendUp, color: "text-blue-400" },
  { label: "Conversion Rate", value: "5-10%", icon: ChartBar, color: "text-violet-400" },
  { label: "User Retention", value: "6 months", icon: Users, color: "text-amber-400" },
];

const barData = [
  { label: "M1", value: 200, max: 40000 },
  { label: "M3", value: 600, max: 40000 },
  { label: "M6", value: 2000, max: 40000 },
  { label: "M12", value: 6400, max: 40000 },
  { label: "M18", value: 16000, max: 40000 },
  { label: "M24", value: 40000, max: 40000 },
];

export function Slide12Financials() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-start overflow-y-auto px-4 sm:px-12 lg:px-20 py-12 sm:py-0 sm:justify-center">
      <div className="max-w-6xl w-full">
        <FadeIn>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 max-w-12 bg-emerald-400/50" />
            <span className="text-xs sm:text-sm font-medium text-emerald-400 uppercase tracking-wider">Financials</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6 sm:mb-10">
            Path to{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">$40K MRR</span>
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Revenue chart */}
          <FadeIn delay={0.2} className="lg:col-span-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 h-full">
              <h3 className="text-sm font-medium text-zinc-400 mb-6">Monthly Recurring Revenue</h3>

              {/* Bar chart */}
              <div className="flex items-end gap-3 h-40 mb-4">
                {barData.map((bar, i) => (
                  <div key={bar.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-zinc-500 font-mono">
                      ${bar.value >= 1000 ? `${(bar.value / 1000).toFixed(0)}K` : bar.value}
                    </span>
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        i >= 4 ? "bg-gradient-to-t from-emerald-600 to-emerald-400" : "bg-gradient-to-t from-blue-600 to-blue-400"
                      }`}
                      style={{ height: `${(bar.value / bar.max) * 100}%`, minHeight: "4px" }}
                    />
                    <span className="text-xs text-zinc-500">{bar.label}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-blue-500" />
                  Year 1
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                  Year 2
                </div>
              </div>

              {/* Projection tables */}
              <div className="mt-5 space-y-3">
                <div className="rounded-lg bg-zinc-800/30 p-3">
                  <p className="text-xs text-blue-400 font-medium mb-2">Year 1 Projections</p>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <span className="text-zinc-500">Month</span>
                    <span className="text-zinc-500">Users</span>
                    <span className="text-zinc-500">Pro</span>
                    <span className="text-zinc-500">MRR</span>
                    {year1.map((r) => (
                      <React.Fragment key={r.month}>
                        <span className="text-zinc-400">{r.month}</span>
                        <span className="text-zinc-300">{r.users}</span>
                        <span className="text-zinc-300">{r.pro}</span>
                        <span className="text-emerald-400 font-medium">{r.revenue}</span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg bg-zinc-800/30 p-3">
                  <p className="text-xs text-emerald-400 font-medium mb-2">Year 2 Projections</p>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <span className="text-zinc-500">Month</span>
                    <span className="text-zinc-500">Users</span>
                    <span className="text-zinc-500">Pro</span>
                    <span className="text-zinc-500">MRR</span>
                    {year2.map((r) => (
                      <React.Fragment key={r.month}>
                        <span className="text-zinc-400">{r.month}</span>
                        <span className="text-zinc-300">{r.users}</span>
                        <span className="text-zinc-300">{r.pro}</span>
                        <span className="text-emerald-400 font-medium">{r.revenue}</span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Key metrics */}
          <FadeIn delay={0.4} className="lg:col-span-2">
            <div className="space-y-4">
              <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3" staggerDelay={0.1}>
                {keyMetrics.map((m) => (
                  <StaggerItem key={m.label}>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-zinc-800">
                        <m.icon className={`w-5 h-5 ${m.color}`} weight="duotone" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-zinc-500">{m.label}</p>
                        <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>

              <FadeIn delay={0.8}>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <h4 className="text-xs font-medium text-zinc-400 mb-3">Key Assumptions</h4>
                  <div className="space-y-1.5 text-xs text-zinc-500">
                    <p>&#8226; 20% MoM growth after launch</p>
                    <p>&#8226; 5-10% free-to-Pro conversion</p>
                    <p>&#8226; 6 month avg Pro retention</p>
                    <p>&#8226; $67/mo fixed infrastructure</p>
                    <p>&#8226; Break-even at 12 Pro users</p>
                  </div>
                </div>
              </FadeIn>
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
