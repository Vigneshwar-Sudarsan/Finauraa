"use client";

import { FadeIn, StaggerContainer, StaggerItem } from "../animated";
import { Check, X } from "@phosphor-icons/react";

const freeFeatures = [
  { name: "3 Bank Connections", included: true },
  { name: "5 AI Queries/Month", included: true },
  { name: "30-Day History", included: true },
  { name: "3 Savings Goals", included: true },
  { name: "2 Budget Limits", included: true },
  { name: "Basic Insights", included: true },
  { name: "Enhanced AI", included: false },
  { name: "Data Export", included: false },
  { name: "Family Sharing", included: false },
];

const proFeatures = [
  { name: "Unlimited Banks", included: true },
  { name: "Unlimited AI Queries", included: true },
  { name: "Full Transaction History", included: true },
  { name: "Unlimited Goals", included: true },
  { name: "Unlimited Budgets", included: true },
  { name: "Advanced Insights", included: true },
  { name: "Enhanced AI + Consent", included: true },
  { name: "CSV & PDF Export", included: true },
  { name: "Up to 5 Family Members", included: true },
];

const unitEconomics = [
  { label: "Pro Revenue", value: "$7.99", sub: "/month" },
  { label: "AI Cost", value: "$0.75", sub: "/user" },
  { label: "Stripe Fee", value: "$0.53", sub: "/txn" },
  { label: "Net Profit", value: "$5.61", sub: "/user", highlight: true },
  { label: "Margin", value: "70%", sub: "monthly", highlight: true },
  { label: "Annual Margin", value: "84%", sub: "$79.99/yr", highlight: true },
];

export function Slide07BusinessModel() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-start overflow-y-auto px-4 sm:px-12 lg:px-20 py-12 pb-32 sm:py-0 sm:pb-0 sm:justify-center">
      <div className="max-w-6xl w-full">
        <FadeIn>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 max-w-12 bg-cyan-400/50" />
            <span className="text-xs sm:text-sm font-medium text-cyan-400 uppercase tracking-wider">Business Model</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6 sm:mb-10">
            Freemium with{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">70% margins</span>
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Pricing cards */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Free plan */}
            <FadeIn delay={0.2}>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 h-full">
                <div className="mb-4">
                  <p className="text-sm text-zinc-500 font-medium mb-1">Free</p>
                  <p className="text-3xl font-bold text-white">$0</p>
                  <p className="text-xs text-zinc-500">Forever free</p>
                </div>
                <div className="space-y-2">
                  {freeFeatures.map((f) => (
                    <div key={f.name} className="flex items-center gap-2">
                      {f.included ? (
                        <Check className="w-4 h-4 text-zinc-400 shrink-0" weight="bold" />
                      ) : (
                        <X className="w-4 h-4 text-zinc-600 shrink-0" weight="bold" />
                      )}
                      <span className={`text-sm ${f.included ? "text-zinc-300" : "text-zinc-600"}`}>
                        {f.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            {/* Pro plan */}
            <FadeIn delay={0.3}>
              <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5 h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  POPULAR
                </div>
                <div className="mb-4">
                  <p className="text-sm text-blue-400 font-medium mb-1">Pro</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-3xl font-bold text-white">$7.99</p>
                    <p className="text-xs text-zinc-500">/mo</p>
                  </div>
                  <p className="text-xs text-zinc-500">or $79.99/yr (17% off)</p>
                </div>
                <div className="space-y-2">
                  {proFeatures.map((f) => (
                    <div key={f.name} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-blue-400 shrink-0" weight="bold" />
                      <span className="text-sm text-zinc-300">{f.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Unit Economics */}
          <FadeIn delay={0.5} className="lg:col-span-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 h-full">
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Unit Economics</h3>
              <StaggerContainer className="space-y-3" staggerDelay={0.1}>
                {unitEconomics.map((item) => (
                  <StaggerItem key={item.label}>
                    <div className={`flex items-center justify-between p-3 rounded-lg ${item.highlight ? "bg-emerald-400/5 border border-emerald-400/20" : "bg-zinc-800/50"}`}>
                      <div>
                        <p className="text-sm text-zinc-400">{item.label}</p>
                        <p className="text-xs text-zinc-600">{item.sub}</p>
                      </div>
                      <p className={`text-lg font-bold ${item.highlight ? "text-emerald-400" : "text-white"}`}>
                        {item.value}
                      </p>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>

              <div className="mt-4 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/50">
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Infrastructure: ~$67/mo fixed (Supabase $25 + Vercel $20 + Resend $20 + Domain $2). Break-even at just 12 Pro users.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
