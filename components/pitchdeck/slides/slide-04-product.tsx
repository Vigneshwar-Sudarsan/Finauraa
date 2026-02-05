"use client";

import { FadeIn, StaggerContainer, StaggerItem } from "../animated";
import {
  ChatCircleDots,
  Wallet,
  ChartDonut,
  Target,
  Lightning,
  HeartHalf,
  CurrencyDollar,
  Bell,
} from "@phosphor-icons/react";

const features = [
  {
    icon: ChatCircleDots,
    title: "AI Financial Assistant",
    description: "Natural language queries about spending, budgets, goals, and cash flow",
    badge: "Core",
  },
  {
    icon: Wallet,
    title: "Multi-Bank Aggregation",
    description: "Connect 7 Bahraini banks, see all accounts and balances in one view",
    badge: "Core",
  },
  {
    icon: ChartDonut,
    title: "Spending Analysis",
    description: "Auto-categorized transactions with trends, anomaly detection, and comparisons",
    badge: "Insights",
  },
  {
    icon: Target,
    title: "Budgets & Goals",
    description: "Category budgets with alerts at 85% and 100%, savings goals with projections",
    badge: "Planning",
  },
  {
    icon: HeartHalf,
    title: "Aura Score",
    description: "Financial health score (0-100, A-F grades) based on savings rate, stability, and more",
    badge: "Unique",
  },
  {
    icon: Lightning,
    title: "Cash Flow Predictions",
    description: "Project future balances, detect recurring bills, warn about low balance dates",
    badge: "AI",
  },
  {
    icon: CurrencyDollar,
    title: "Family Finance",
    description: "Up to 5 members, shared budgets, shared goals, individual consent controls",
    badge: "Pro",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "Budget alerts, consent expiry, goal progress, payment failures - all automated",
    badge: "Pro",
  },
];

const chatMessages = [
  { role: "user", text: "How much did I spend on dining out?" },
  { role: "ai", text: "You spent BHD 142.350 on dining this month - that's 23% more than last month. Your top 3 restaurants accounted for 65% of dining spend." },
  { role: "user", text: "Can I afford a BHD 500 vacation?" },
  { role: "ai", text: "Based on your cash flow, you'll have BHD 1,234 surplus this month. A BHD 500 vacation is affordable without touching your emergency fund (3.2 months covered)." },
];

export function Slide04Product() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-start overflow-y-auto px-4 sm:px-12 lg:px-20 py-12 pb-32 sm:py-0 sm:pb-0 sm:justify-center">
      <div className="max-w-6xl w-full">
        <FadeIn>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 max-w-12 bg-violet-400/50" />
            <span className="text-xs sm:text-sm font-medium text-violet-400 uppercase tracking-wider">Product</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6 sm:mb-10">
            Everything you need,{" "}
            <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">nothing you don&apos;t</span>
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-8">
          {/* Features grid */}
          <StaggerContainer className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3" staggerDelay={0.08}>
            {features.map((f) => (
              <StaggerItem key={f.title}>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <f.icon className="w-5 h-5 text-zinc-400" weight="duotone" />
                    <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-800">
                      {f.badge}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1">{f.title}</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">{f.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* AI Chat preview */}
          <FadeIn delay={0.5} direction="left" className="lg:col-span-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-5 h-full">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-xs font-medium text-zinc-400">AI Chat Preview</span>
              </div>
              <div className="space-y-3">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-blue-600/20 text-blue-200 border border-blue-500/20"
                          : "bg-zinc-800/80 text-zinc-300 border border-zinc-700/50"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
