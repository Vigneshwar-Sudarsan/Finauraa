"use client";

import { FadeIn, StaggerContainer, StaggerItem } from "../animated";
import { WarningCircle, Bank, ChartLineDown, UsersFour } from "@phosphor-icons/react";

const problems = [
  {
    icon: Bank,
    title: "Fragmented Banking",
    description: "People in Bahrain juggle 2-4 bank accounts with no unified view of their finances",
    stat: "85%",
    statLabel: "banked population, zero unified tools",
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    borderColor: "border-red-400/20",
  },
  {
    icon: ChartLineDown,
    title: "Zero Spending Visibility",
    description: "Bank apps show transactions, not insights. Users have no idea where their money goes",
    stat: "0",
    statLabel: "local apps with AI insights",
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    borderColor: "border-amber-400/20",
  },
  {
    icon: WarningCircle,
    title: "Complex Financial Tools",
    description: "Global budgeting apps like YNAB require manual entry and don't support Bahraini banks",
    stat: "70%",
    statLabel: "abandon complex finance apps in 30 days",
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
    borderColor: "border-orange-400/20",
  },
  {
    icon: UsersFour,
    title: "Families Left Behind",
    description: "No shared finance tools exist for families to track collective spending and save together",
    stat: "45%",
    statLabel: "of households share finances",
    color: "text-rose-400",
    bgColor: "bg-rose-400/10",
    borderColor: "border-rose-400/20",
  },
];

export function Slide02Problem() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-start overflow-y-auto px-4 sm:px-12 lg:px-20 py-12 pb-24 sm:py-0 sm:pb-0 sm:justify-center">
      <div className="max-w-6xl w-full">
        <FadeIn>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 max-w-12 bg-red-400/50" />
            <span className="text-xs sm:text-sm font-medium text-red-400 uppercase tracking-wider">The Problem</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-3 sm:mb-4">
            Personal finance in Bahrain is{" "}
            <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">broken</span>
          </h2>
          <p className="text-sm sm:text-lg text-zinc-400 max-w-2xl mb-6 sm:mb-12">
            1.5M people, 95% smartphone penetration, 7 major banks - yet not a single AI-powered finance tool built for them.
          </p>
        </FadeIn>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5" staggerDelay={0.15}>
          {problems.map((problem) => (
            <StaggerItem key={problem.title}>
              <div className={`rounded-2xl border ${problem.borderColor} bg-zinc-900/50 p-4 sm:p-6 h-full`}>
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className={`p-2 sm:p-2.5 rounded-xl ${problem.bgColor}`}>
                    <problem.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${problem.color}`} weight="duotone" />
                  </div>
                  <div className="text-right">
                    <p className={`text-xl sm:text-2xl font-bold ${problem.color}`}>{problem.stat}</p>
                    <p className="text-[10px] sm:text-xs text-zinc-500 max-w-[120px] sm:max-w-[140px]">{problem.statLabel}</p>
                  </div>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">{problem.title}</h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">{problem.description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </div>
  );
}
