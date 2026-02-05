"use client";

import { FadeIn, StaggerContainer, StaggerItem } from "../animated";
import { TrendUp, Bank, Brain, ShieldCheck } from "@phosphor-icons/react";

const forces = [
  {
    icon: Bank,
    title: "Open Banking is Live",
    description: "Bahrain became the first MENA country with a full open banking framework (2020). Tarabut Gateway is operational with 7 banks.",
    year: "2020",
    color: "text-blue-400",
    borderColor: "border-blue-400/30",
    bgColor: "bg-blue-400/10",
  },
  {
    icon: Brain,
    title: "AI Reached Consumer Grade",
    description: "Claude and GPT-4 made conversational AI practical for personal finance. Cost per query dropped 90% in 18 months.",
    year: "2023-24",
    color: "text-violet-400",
    borderColor: "border-violet-400/30",
    bgColor: "bg-violet-400/10",
  },
  {
    icon: ShieldCheck,
    title: "Regulatory Clarity",
    description: "CBB single-regulator model + PDPL data protection law provides clear compliance framework. No regulatory ambiguity.",
    year: "2024",
    color: "text-emerald-400",
    borderColor: "border-emerald-400/30",
    bgColor: "bg-emerald-400/10",
  },
  {
    icon: TrendUp,
    title: "Market is Ready",
    description: "95% smartphone penetration, 85% banked, $4.5B MENA fintech revenue projected. Zero local AI finance apps exist.",
    year: "2026",
    color: "text-amber-400",
    borderColor: "border-amber-400/30",
    bgColor: "bg-amber-400/10",
  },
];

export function Slide05WhyNow() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-start overflow-y-auto px-4 sm:px-12 lg:px-20 py-12 pb-32 sm:py-0 sm:pb-0 sm:justify-center">
      <div className="max-w-6xl w-full">
        <FadeIn>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 max-w-12 bg-amber-400/50" />
            <span className="text-xs sm:text-sm font-medium text-amber-400 uppercase tracking-wider">Timing</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-3 sm:mb-4">
            Four forces{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">converging now</span>
          </h2>
          <p className="text-sm sm:text-lg text-zinc-400 max-w-2xl mb-6 sm:mb-12">
            Open Banking + AI maturity + regulatory clarity + market readiness create a once-in-a-decade window.
          </p>
        </FadeIn>

        {/* Timeline */}
        <StaggerContainer className="relative" staggerDelay={0.15}>
          {/* Connecting line */}
          <div className="absolute left-[23px] sm:left-[39px] top-0 bottom-0 w-px bg-gradient-to-b from-blue-400/50 via-violet-400/50 to-amber-400/50" />

          <div className="space-y-4">
            {forces.map((force) => (
              <StaggerItem key={force.title}>
                <div className="flex gap-4 items-start">
                  {/* Year marker */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-12 h-12 rounded-full ${force.bgColor} border ${force.borderColor} flex items-center justify-center relative z-10`}>
                      <force.icon className={`w-6 h-6 ${force.color}`} weight="duotone" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className={`flex-1 rounded-xl border ${force.borderColor} bg-zinc-900/50 p-4`}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-xs font-mono font-bold ${force.color}`}>{force.year}</span>
                      <h3 className="text-base font-semibold text-white">{force.title}</h3>
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed">{force.description}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </div>
        </StaggerContainer>
      </div>
    </div>
  );
}
