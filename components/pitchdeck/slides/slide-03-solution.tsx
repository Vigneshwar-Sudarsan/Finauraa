"use client";

import { FadeIn, StaggerContainer, StaggerItem, GlowingBorder } from "../animated";
import { ChatCircleDots, Bank, ShieldCheck, Users } from "@phosphor-icons/react";

const pillars = [
  {
    icon: ChatCircleDots,
    title: "Conversational-First",
    description: "70% of the experience is through AI chat. Ask anything about your finances in natural language.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Bank,
    title: "Multi-Bank Connected",
    description: "Connect all 7 Bahraini banks in one place via Tarabut Open Banking Gateway.",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    icon: ShieldCheck,
    title: "Privacy by Default",
    description: "AI sees only anonymized data by default. Users choose exactly what to share.",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: Users,
    title: "Built for Families",
    description: "Share goals, budgets, and spending visibility with up to 5 family members.",
    gradient: "from-amber-500 to-orange-500",
  },
];

export function Slide03Solution() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-start overflow-y-auto px-4 sm:px-12 lg:px-20 py-12 pb-32 sm:py-0 sm:pb-0 sm:justify-center">
      <div className="max-w-6xl w-full">
        <FadeIn>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 max-w-12 bg-blue-400/50" />
            <span className="text-xs sm:text-sm font-medium text-blue-400 uppercase tracking-wider">The Solution</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-3 sm:mb-4">
            Finance as easy as a{" "}
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">conversation</span>
          </h2>
          <p className="text-sm sm:text-lg text-zinc-400 max-w-2xl mb-6 sm:mb-12">
            Finauraa replaces complex dashboards with an AI assistant that understands your money. Connect your banks, ask questions, get insights.
          </p>
        </FadeIn>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5" staggerDelay={0.15}>
          {pillars.map((pillar) => (
            <StaggerItem key={pillar.title}>
              <GlowingBorder>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-6 h-full backdrop-blur-sm">
                  <div className={`inline-flex p-2 sm:p-2.5 rounded-xl bg-gradient-to-br ${pillar.gradient} mb-3 sm:mb-4`}>
                    <pillar.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" weight="duotone" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-white mb-1 sm:mb-2">{pillar.title}</h3>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">{pillar.description}</p>
                </div>
              </GlowingBorder>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <FadeIn delay={0.8}>
          <div className="mt-6 sm:mt-10 text-center">
            <p className="text-xs sm:text-sm text-zinc-500">
              &ldquo;How much did I spend on groceries this month?&rdquo; &mdash; That&apos;s it. That&apos;s the entire UX.
            </p>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
