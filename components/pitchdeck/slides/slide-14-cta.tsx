"use client";

import { FadeIn, ScaleIn } from "../animated";
import { EnvelopeSimple, Globe, ArrowRight } from "@phosphor-icons/react";

export function Slide14CTA() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-start overflow-y-auto px-4 py-12 pb-24 sm:py-0 sm:pb-0 sm:justify-center">
      {/* Background effects */}
      <div className="absolute top-1/3 -left-48 w-[500px] h-[500px] bg-blue-500/8 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 -right-48 w-[500px] h-[500px] bg-violet-500/8 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-blue-600/5 to-transparent rounded-full" />

      <div className="relative z-10 text-center max-w-3xl">
        <ScaleIn delay={0.1}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/5 mb-8">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-emerald-400">Ready to Launch</span>
          </div>
        </ScaleIn>

        <FadeIn delay={0.2}>
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter mb-4">
            <span className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
              Let&apos;s build the future
            </span>
          </h2>
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter mb-8">
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              of finance in Bahrain
            </span>
          </h2>
        </FadeIn>

        <FadeIn delay={0.4}>
          <p className="text-base sm:text-lg md:text-xl text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Finauraa is production-ready with 110+ components, 68+ APIs, full compliance, and the only AI-first finance experience for the region.
          </p>
        </FadeIn>

        <FadeIn delay={0.6}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <a
              href="https://dev.finauraa.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 text-white font-medium hover:from-blue-500 hover:to-violet-500 transition-all"
            >
              <Globe className="w-5 h-5" weight="duotone" />
              Try Finauraa
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="mailto:dev@finauraa.com"
              className="flex items-center gap-2 px-8 py-3.5 rounded-full border border-zinc-700 text-zinc-300 font-medium hover:border-zinc-500 hover:text-white transition-all"
            >
              <EnvelopeSimple className="w-5 h-5" weight="duotone" />
              Get in Touch
            </a>
          </div>
        </FadeIn>

        <FadeIn delay={0.8}>
          <div className="grid grid-cols-3 gap-6 max-w-md mx-auto">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">110+</p>
              <p className="text-xs text-zinc-500">Components</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">68+</p>
              <p className="text-xs text-zinc-500">API Endpoints</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">21</p>
              <p className="text-xs text-zinc-500">DB Tables</p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={1.0}>
          <p className="mt-10 text-sm text-zinc-600">
            finauraa.com &middot; dev@finauraa.com
          </p>
        </FadeIn>
      </div>
    </div>
  );
}
