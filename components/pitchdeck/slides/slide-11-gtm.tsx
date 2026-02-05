"use client";

import { FadeIn, StaggerContainer, StaggerItem } from "../animated";
import {
  Rocket,
  Megaphone,
  TrendUp,
  GlobeHemisphereWest,
  Users,
  Handshake,
  DeviceMobile,
  Sparkle,
} from "@phosphor-icons/react";

const phases = [
  {
    icon: Rocket,
    phase: "Phase 1",
    title: "Soft Launch",
    timeline: "Month 1-2",
    target: "100-200 users",
    strategies: ["Invite-only beta", "Word of mouth", "Bug fixes & UX polish", "Core metric tracking"],
    color: "text-blue-400",
    borderColor: "border-blue-400/20",
    bgColor: "bg-blue-400/5",
  },
  {
    icon: Megaphone,
    phase: "Phase 2",
    title: "Public Launch",
    timeline: "Month 3-4",
    target: "1,000 users",
    strategies: ["Open registration", "Social media campaigns", "Bahrain fintech community", "Tech blogs & PR"],
    color: "text-violet-400",
    borderColor: "border-violet-400/20",
    bgColor: "bg-violet-400/5",
  },
  {
    icon: TrendUp,
    phase: "Phase 3",
    title: "Growth",
    timeline: "Month 5-12",
    target: "10,000 users",
    strategies: ["Paid social ads", "Influencer partnerships", "Referral program (1mo free)", "App Store optimization"],
    color: "text-emerald-400",
    borderColor: "border-emerald-400/20",
    bgColor: "bg-emerald-400/5",
  },
  {
    icon: GlobeHemisphereWest,
    phase: "Phase 4",
    title: "Expansion",
    timeline: "Year 2+",
    target: "50,000+ users",
    strategies: ["UAE & Saudi Arabia", "Bank partnerships", "B2B white-label", "Regional pricing"],
    color: "text-amber-400",
    borderColor: "border-amber-400/20",
    bgColor: "bg-amber-400/5",
  },
];

const channels = [
  { icon: DeviceMobile, name: "PWA + App Stores", description: "Installable from day 1" },
  { icon: Users, name: "Referral Program", description: "1 month Pro free per referral" },
  { icon: Handshake, name: "Bank Partnerships", description: "Co-marketing with Bahraini banks" },
  { icon: Sparkle, name: "Content Marketing", description: "Financial literacy content" },
];

export function Slide11GTM() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-start overflow-y-auto px-4 sm:px-12 lg:px-20 py-12 pb-32 sm:py-0 sm:pb-0 sm:justify-center">
      <div className="max-w-6xl w-full">
        <FadeIn>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 max-w-12 bg-rose-400/50" />
            <span className="text-xs sm:text-sm font-medium text-rose-400 uppercase tracking-wider">Go-to-Market</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6 sm:mb-10">
            From beta to{" "}
            <span className="bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent">50,000 users</span>
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Phases */}
          <StaggerContainer className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3" staggerDelay={0.12}>
            {phases.map((p) => (
              <StaggerItem key={p.phase}>
                <div className={`rounded-xl border ${p.borderColor} ${p.bgColor} p-4 h-full`}>
                  <div className="flex items-center gap-2 mb-3">
                    <p.icon className={`w-5 h-5 ${p.color}`} weight="duotone" />
                    <div>
                      <p className={`text-xs font-medium ${p.color} uppercase`}>{p.phase}</p>
                      <p className="text-sm font-semibold text-white">{p.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-zinc-500">{p.timeline}</span>
                    <span className="text-xs text-zinc-600">|</span>
                    <span className={`text-xs font-medium ${p.color}`}>{p.target}</span>
                  </div>
                  <div className="space-y-1.5">
                    {p.strategies.map((s) => (
                      <div key={s} className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${p.color.replace("text-", "bg-")}`} />
                        <span className="text-xs text-zinc-400">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Channels */}
          <FadeIn delay={0.5} className="lg:col-span-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 h-full">
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
                Growth Channels
              </h3>
              <div className="space-y-3">
                {channels.map((ch) => (
                  <div key={ch.name} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30">
                    <ch.icon className="w-5 h-5 text-zinc-400 shrink-0" weight="duotone" />
                    <div>
                      <p className="text-sm font-medium text-white">{ch.name}</p>
                      <p className="text-xs text-zinc-500">{ch.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 rounded-lg bg-emerald-400/5 border border-emerald-400/20">
                <p className="text-xs font-medium text-emerald-400 mb-1">Growth Flywheel</p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  More users → More data → Better AI insights → Higher engagement → More referrals → More users
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
