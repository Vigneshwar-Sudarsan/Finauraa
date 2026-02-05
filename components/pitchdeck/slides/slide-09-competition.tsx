"use client";

import { FadeIn, StaggerContainer, StaggerItem } from "../animated";
import { Check, X, Minus } from "@phosphor-icons/react";

const competitors = [
  {
    name: "Mint",
    region: "USA Only",
    features: { ai: false, openBanking: false, bahrain: false, family: false, privacy: false },
    weakness: "No MENA support",
  },
  {
    name: "YNAB",
    region: "Global",
    features: { ai: false, openBanking: false, bahrain: false, family: false, privacy: true },
    weakness: "Manual entry only",
  },
  {
    name: "Emma",
    region: "UK/EU",
    features: { ai: "partial", openBanking: true, bahrain: false, family: false, privacy: false },
    weakness: "No MENA banks",
  },
  {
    name: "Bank Apps",
    region: "Bahrain",
    features: { ai: false, openBanking: false, bahrain: true, family: false, privacy: true },
    weakness: "Single bank only",
  },
  {
    name: "Finauraa",
    region: "Bahrain → GCC",
    features: { ai: true, openBanking: true, bahrain: true, family: true, privacy: true },
    weakness: null,
    highlight: true,
  },
];

const featureLabels = [
  { key: "ai", label: "AI-First Chat" },
  { key: "openBanking", label: "Open Banking" },
  { key: "bahrain", label: "Bahrain Support" },
  { key: "family", label: "Family Sharing" },
  { key: "privacy", label: "Privacy Controls" },
];

const advantages = [
  { title: "Only AI-first finance app for Bahrain", description: "Conversational-first (70% chat) vs dashboard-first" },
  { title: "Native Tarabut Open Banking", description: "Direct bank integration, not screen scraping" },
  { title: "Privacy as architecture, not afterthought", description: "Anonymized by default, enhanced only with consent" },
  { title: "Family finance from day 1", description: "Shared goals, budgets, and spending - not bolted on" },
];

function FeatureIcon({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="w-4 h-4 text-emerald-400" weight="bold" />;
  if (value === "partial") return <Minus className="w-4 h-4 text-amber-400" weight="bold" />;
  return <X className="w-4 h-4 text-zinc-600" weight="bold" />;
}

export function Slide09Competition() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-start overflow-y-auto px-4 sm:px-12 lg:px-20 py-12 pb-24 sm:py-0 sm:pb-0 sm:justify-center">
      <div className="max-w-6xl w-full">
        <FadeIn>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 max-w-12 bg-orange-400/50" />
            <span className="text-xs sm:text-sm font-medium text-orange-400 uppercase tracking-wider">Competition</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6 sm:mb-10">
            White space in{" "}
            <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">every direction</span>
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Key Advantages - shown first on mobile */}
          <FadeIn delay={0.2} className="lg:col-span-2 lg:order-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 h-full">
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
                Our Moat
              </h3>
              <StaggerContainer className="space-y-3" staggerDelay={0.1}>
                {advantages.map((adv, i) => (
                  <StaggerItem key={adv.title}>
                    <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
                      <div className="flex items-start gap-2">
                        <span className="text-blue-400 font-bold text-sm mt-0.5">{i + 1}.</span>
                        <div>
                          <p className="text-sm font-medium text-white mb-1">{adv.title}</p>
                          <p className="text-xs text-zinc-500">{adv.description}</p>
                        </div>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </FadeIn>

          {/* Comparison table */}
          <FadeIn delay={0.4} className="lg:col-span-3 lg:order-1">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left p-3 text-zinc-500 font-medium">App</th>
                      {featureLabels.map((f) => (
                        <th key={f.key} className="p-3 text-zinc-500 font-medium text-center whitespace-nowrap text-xs">
                          {f.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {competitors.map((comp) => (
                      <tr
                        key={comp.name}
                        className={`border-b border-zinc-800/50 last:border-0 ${
                          comp.highlight ? "bg-blue-500/5" : ""
                        }`}
                      >
                        <td className="p-3">
                          <div>
                            <p className={`font-semibold ${comp.highlight ? "text-blue-400" : "text-white"}`}>
                              {comp.name}
                            </p>
                            <p className="text-xs text-zinc-500">{comp.region}</p>
                          </div>
                        </td>
                        {featureLabels.map((f) => (
                          <td key={f.key} className="p-3 text-center">
                            <div className="flex justify-center">
                              <FeatureIcon value={(comp.features as Record<string, boolean | string>)[f.key]} />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
