"use client";

import { FadeIn, StaggerContainer, StaggerItem, ScaleIn } from "../animated";
import { GlobeHemisphereWest } from "@phosphor-icons/react";

const tamData = [
  {
    label: "TAM",
    sublabel: "MENA Fintech Revenue",
    value: "$4.5B",
    color: "bg-blue-500/20 border-blue-500/30 text-blue-400",
    size: "w-64 h-64 sm:w-72 sm:h-72",
  },
  {
    label: "SAM",
    sublabel: "GCC Personal Finance",
    value: "$800M",
    color: "bg-violet-500/20 border-violet-500/30 text-violet-400",
    size: "w-48 h-48 sm:w-52 sm:h-52",
  },
  {
    label: "SOM",
    sublabel: "Bahrain Year 1",
    value: "$350K",
    color: "bg-emerald-500/20 border-emerald-500/30 text-emerald-400",
    size: "w-32 h-32 sm:w-36 sm:h-36",
  },
];

const stats = [
  { value: "1.5M", label: "Population", sub: "Bahrain" },
  { value: "85%", label: "Banked", sub: "population" },
  { value: "95%", label: "Smartphone", sub: "penetration" },
  { value: "500K", label: "Addressable", sub: "users" },
  { value: "7", label: "Partner", sub: "banks" },
  { value: "0", label: "AI Finance", sub: "competitors" },
];

const expansion = [
  { region: "Bahrain", timeline: "2026", users: "10K", status: "active" },
  { region: "UAE", timeline: "2027", users: "50K", status: "planned" },
  { region: "Saudi Arabia", timeline: "2027", users: "100K", status: "planned" },
  { region: "Kuwait", timeline: "2028", users: "30K", status: "future" },
];

export function Slide06Market() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-start overflow-y-auto px-4 sm:px-12 lg:px-20 py-12 pb-32 sm:py-0 sm:pb-0 sm:justify-center">
      <div className="max-w-6xl w-full">
        <FadeIn>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 max-w-12 bg-emerald-400/50" />
            <span className="text-xs sm:text-sm font-medium text-emerald-400 uppercase tracking-wider">Market</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6 sm:mb-10">
            A{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">$4.5B</span>
            {" "}opportunity
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* TAM/SAM/SOM circles */}
          <FadeIn delay={0.2} className="lg:col-span-2">
            <div className="flex items-center justify-center h-64 sm:h-72 relative">
              {/* TAM - outer circle */}
              <ScaleIn delay={0.3}>
                <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-full border bg-blue-500/20 border-blue-500/30 flex items-center justify-center">
                  {/* SAM - middle circle */}
                  <ScaleIn delay={0.5}>
                    <div className="w-40 h-40 sm:w-52 sm:h-52 rounded-full border bg-violet-500/20 border-violet-500/30 flex items-center justify-center">
                      {/* SOM - inner circle */}
                      <ScaleIn delay={0.7}>
                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border bg-emerald-500/20 border-emerald-500/30 flex flex-col items-center justify-center">
                          <span className="text-xs font-medium uppercase tracking-wider text-emerald-400 opacity-80">SOM</span>
                          <span className="text-lg sm:text-xl font-bold text-emerald-400">$350K</span>
                          <span className="text-[10px] text-emerald-400 opacity-60">Bahrain Year 1</span>
                        </div>
                      </ScaleIn>
                    </div>
                  </ScaleIn>
                </div>
              </ScaleIn>

              {/* Labels positioned outside circles */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 text-center">
                <span className="text-xs font-medium uppercase tracking-wider text-blue-400">TAM</span>
                <p className="text-lg font-bold text-blue-400">$4.5B</p>
                <span className="text-xs text-blue-400 opacity-60">MENA Fintech</span>
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                <span className="text-xs font-medium uppercase tracking-wider text-violet-400">SAM</span>
                <p className="text-base font-bold text-violet-400">$800M</p>
                <span className="text-xs text-violet-400 opacity-60">GCC Personal Finance</span>
              </div>
            </div>
          </FadeIn>

          {/* Stats + Expansion */}
          <div className="lg:col-span-3 space-y-4">
            {/* Key stats */}
            <StaggerContainer className="grid grid-cols-3 gap-3" staggerDelay={0.08}>
              {stats.map((stat) => (
                <StaggerItem key={stat.label}>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-center">
                    <p className="text-xl sm:text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-zinc-400">{stat.label}</p>
                    <p className="text-xs text-zinc-600">{stat.sub}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>

            {/* Expansion roadmap */}
            <FadeIn delay={0.6}>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <GlobeHemisphereWest className="w-5 h-5 text-zinc-400" weight="duotone" />
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">GCC Expansion</span>
                </div>
                <div className="space-y-2">
                  {expansion.map((item) => (
                    <div key={item.region} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${item.status === "active" ? "bg-emerald-400" : item.status === "planned" ? "bg-blue-400" : "bg-zinc-600"}`} />
                        <span className="text-sm text-white font-medium">{item.region}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-zinc-500">{item.timeline}</span>
                        <span className="text-xs font-medium text-zinc-400">{item.users} users</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </div>
  );
}
