"use client";

import { FadeIn, StaggerContainer, StaggerItem } from "../animated";
import { Check, Spinner, Clock, Rocket, CreditCard, DeviceMobile, GlobeHemisphereWest } from "@phosphor-icons/react";

const milestones = [
  {
    quarter: "Q1 2026",
    title: "Foundation",
    status: "done",
    icon: Check,
    color: "text-emerald-400",
    borderColor: "border-emerald-400/20",
    bgColor: "bg-emerald-400/5",
    items: [
      "Full MVP with 110+ components",
      "68+ API endpoints",
      "Tarabut sandbox integration",
      "BOBF/PDPL compliance",
      "Family sharing features",
      "Email notifications",
      "PWA support",
    ],
  },
  {
    quarter: "Q2 2026",
    title: "Launch",
    status: "current",
    icon: Rocket,
    color: "text-blue-400",
    borderColor: "border-blue-400/20",
    bgColor: "bg-blue-400/5",
    items: [
      "Beta launch (100 users)",
      "Public launch",
      "1,000 users milestone",
      "First paying customers",
      "Payment Initiation (PIS)",
    ],
  },
  {
    quarter: "Q3 2026",
    title: "Growth",
    status: "planned",
    icon: CreditCard,
    color: "text-violet-400",
    borderColor: "border-violet-400/20",
    bgColor: "bg-violet-400/5",
    items: [
      "5,000 users milestone",
      "Native mobile app",
      "Break-even operations",
      "Advanced analytics",
      "Business tier consideration",
    ],
  },
  {
    quarter: "Q4 2026",
    title: "Scale",
    status: "future",
    icon: DeviceMobile,
    color: "text-amber-400",
    borderColor: "border-amber-400/20",
    bgColor: "bg-amber-400/5",
    items: [
      "10,000 users milestone",
      "B2B white-label offering",
      "UAE expansion planning",
      "Advanced AI features",
      "Investment-grade analytics",
    ],
  },
];

const futureVision = [
  { year: "2027", title: "GCC Expansion", description: "UAE, Saudi Arabia, Kuwait - 50K+ users across region", icon: GlobeHemisphereWest },
  { year: "2028", title: "Platform Play", description: "White-label for banks, API marketplace, wealth management", icon: Rocket },
];

export function Slide13Roadmap() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-start overflow-y-auto px-4 sm:px-12 lg:px-20 py-12 sm:py-0 sm:justify-center">
      <div className="max-w-6xl w-full">
        <FadeIn>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 max-w-12 bg-blue-400/50" />
            <span className="text-xs sm:text-sm font-medium text-blue-400 uppercase tracking-wider">Roadmap</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6 sm:mb-10">
            Built today,{" "}
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">scaling tomorrow</span>
          </h2>
        </FadeIn>

        {/* Timeline */}
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" staggerDelay={0.12}>
          {milestones.map((m) => (
            <StaggerItem key={m.quarter}>
              <div className={`rounded-xl border ${m.borderColor} ${m.bgColor} p-4 h-full`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-1.5 rounded-lg ${m.bgColor} border ${m.borderColor}`}>
                    {m.status === "done" ? (
                      <Check className={`w-4 h-4 ${m.color}`} weight="bold" />
                    ) : m.status === "current" ? (
                      <Spinner className={`w-4 h-4 ${m.color} animate-spin`} weight="bold" />
                    ) : (
                      <Clock className={`w-4 h-4 ${m.color}`} weight="duotone" />
                    )}
                  </div>
                  <div>
                    <p className={`text-xs font-medium ${m.color} uppercase`}>{m.quarter}</p>
                    <p className="text-sm font-semibold text-white">{m.title}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {m.items.map((item) => (
                    <div key={item} className="flex items-start gap-1.5">
                      {m.status === "done" ? (
                        <Check className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" weight="bold" />
                      ) : (
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${m.color.replace("text-", "bg-")}`} />
                      )}
                      <span className={`text-xs ${m.status === "done" ? "text-zinc-400" : "text-zinc-500"}`}>
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Future vision */}
        <FadeIn delay={0.6}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {futureVision.map((v) => (
              <div key={v.year} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-700">
                  <v.icon className="w-6 h-6 text-zinc-300" weight="duotone" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-500">{v.year}</span>
                    <span className="text-sm font-semibold text-white">{v.title}</span>
                  </div>
                  <p className="text-xs text-zinc-500">{v.description}</p>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
