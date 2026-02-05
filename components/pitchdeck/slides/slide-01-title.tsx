"use client";

import { FadeIn, ScaleIn } from "../animated";

export function Slide01Title() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden px-6">
      {/* Background gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl" />

      <div className="relative z-10 text-center max-w-4xl">
        <ScaleIn delay={0.1}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-zinc-700/50 bg-zinc-900/50 backdrop-blur-sm mb-8">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-zinc-400">AI-Powered Personal Finance</span>
          </div>
        </ScaleIn>

        <FadeIn delay={0.3}>
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tighter mb-6">
            <span className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
              Fin
            </span>
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              auraa
            </span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.5}>
          <p className="text-xl sm:text-2xl md:text-3xl text-zinc-400 font-light max-w-2xl mx-auto leading-relaxed">
            Your AI financial assistant for{" "}
            <span className="text-white font-medium">Bahrain</span>
          </p>
        </FadeIn>

        <FadeIn delay={0.7}>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
            {["Open Banking", "AI Chat", "Multi-Bank", "Family Sharing"].map((tag) => (
              <span
                key={tag}
                className="px-4 py-2 rounded-full text-sm font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/50"
              >
                {tag}
              </span>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.9}>
          <p className="mt-12 text-base text-zinc-500">
            Making personal finance as easy as having a conversation
          </p>
        </FadeIn>
      </div>
    </div>
  );
}
