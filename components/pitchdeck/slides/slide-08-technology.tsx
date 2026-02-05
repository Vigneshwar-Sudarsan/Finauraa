"use client";

import { FadeIn, StaggerContainer, StaggerItem } from "../animated";
import { Brain, Eye, EyeSlash, Database, ShieldCheck, Lightning } from "@phosphor-icons/react";

const techStack = [
  { category: "Frontend", items: ["Next.js 16", "React 19", "Tailwind CSS 4", "shadcn/ui"] },
  { category: "Backend", items: ["Next.js API (68+ endpoints)", "Supabase PostgreSQL", "Row Level Security", "Vercel Cron"] },
  { category: "AI", items: ["Claude Sonnet 4", "Anthropic SDK", "13 Rich Content Cards", "Prompt Injection Detection"] },
  { category: "Services", items: ["Tarabut Gateway", "Stripe Billing", "Resend Email", "Sentry Monitoring"] },
];

export function Slide08Technology() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-start overflow-y-auto px-4 sm:px-12 lg:px-20 py-12 sm:py-0 sm:justify-center">
      <div className="max-w-6xl w-full">
        <FadeIn>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 max-w-12 bg-purple-400/50" />
            <span className="text-xs sm:text-sm font-medium text-purple-400 uppercase tracking-wider">Technology</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6 sm:mb-10">
            AI that{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">respects privacy</span>
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* AI Privacy Modes - Main Feature */}
          <FadeIn delay={0.2} className="lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
              {/* Privacy-First Mode */}
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-emerald-400/10">
                    <EyeSlash className="w-5 h-5 text-emerald-400" weight="duotone" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Privacy-First</p>
                    <p className="text-xs text-emerald-400">Default Mode</p>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" weight="fill" />
                    <span className="text-sm text-zinc-300">Anonymized data only</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" weight="fill" />
                    <span className="text-sm text-zinc-300">No amounts sent to AI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" weight="fill" />
                    <span className="text-sm text-zinc-300">Available to all users</span>
                  </div>
                </div>
                <div className="rounded-lg bg-zinc-900/50 p-3 border border-zinc-800">
                  <p className="text-xs text-zinc-500 font-mono">
                    AI sees: &ldquo;balance: high, trend: above_average&rdquo;
                  </p>
                </div>
              </div>

              {/* Enhanced Mode */}
              <div className="rounded-2xl border border-blue-400/20 bg-blue-400/5 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-blue-400/10">
                    <Eye className="w-5 h-5 text-blue-400" weight="duotone" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Enhanced AI</p>
                    <p className="text-xs text-blue-400">Pro + Consent</p>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-blue-400 shrink-0" weight="fill" />
                    <span className="text-sm text-zinc-300">Full financial data</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-blue-400 shrink-0" weight="fill" />
                    <span className="text-sm text-zinc-300">Exact amounts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-blue-400 shrink-0" weight="fill" />
                    <span className="text-sm text-zinc-300">2-checkbox consent</span>
                  </div>
                </div>
                <div className="rounded-lg bg-zinc-900/50 p-3 border border-zinc-800">
                  <p className="text-xs text-zinc-500 font-mono">
                    AI sees: &ldquo;BHD 2,450 at NBB, BHD 142 on dining&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Tech Stack */}
          <FadeIn delay={0.4} className="lg:col-span-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 h-full">
              <div className="flex items-center gap-2 mb-4">
                <Lightning className="w-5 h-5 text-zinc-400" weight="duotone" />
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Tech Stack</h3>
              </div>

              <StaggerContainer className="space-y-4" staggerDelay={0.1}>
                {techStack.map((group) => (
                  <StaggerItem key={group.category}>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 mb-2">{group.category}</p>
                      <div className="flex flex-wrap gap-2">
                        {group.items.map((item) => (
                          <span key={item} className="text-xs px-2 py-1 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/50">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>

              <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30">
                <Database className="w-5 h-5 text-zinc-500 shrink-0" weight="duotone" />
                <p className="text-xs text-zinc-500">
                  21 tables with RLS, 110+ components, PWA installable
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
