"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { SlideWrapper } from "./slide-wrapper";
import { Slide01Title } from "./slides/slide-01-title";
import { Slide02Problem } from "./slides/slide-02-problem";
import { Slide03Solution } from "./slides/slide-03-solution";
import { Slide04Product } from "./slides/slide-04-product";
import { Slide05WhyNow } from "./slides/slide-05-why-now";
import { Slide06Market } from "./slides/slide-06-market";
import { Slide07BusinessModel } from "./slides/slide-07-business-model";
import { Slide08Technology } from "./slides/slide-08-technology";
import { Slide09Competition } from "./slides/slide-09-competition";
import { Slide10Compliance } from "./slides/slide-10-compliance";
import { Slide11GTM } from "./slides/slide-11-gtm";
import { Slide12Financials } from "./slides/slide-12-financials";
import { Slide13Roadmap } from "./slides/slide-13-roadmap";
import { Slide14CTA } from "./slides/slide-14-cta";
import {
  CaretLeft,
  CaretRight,
  CornersOut,
  CornersIn,
  List,
  X,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";

const slides = [
  { id: 1, component: Slide01Title, label: "Title" },
  { id: 2, component: Slide02Problem, label: "Problem" },
  { id: 3, component: Slide03Solution, label: "Solution" },
  { id: 4, component: Slide04Product, label: "Product" },
  { id: 5, component: Slide05WhyNow, label: "Why Now" },
  { id: 6, component: Slide06Market, label: "Market" },
  { id: 7, component: Slide07BusinessModel, label: "Business Model" },
  { id: 8, component: Slide08Technology, label: "Technology & AI" },
  { id: 9, component: Slide09Competition, label: "Competition" },
  { id: 10, component: Slide10Compliance, label: "Compliance" },
  { id: 11, component: Slide11GTM, label: "Go-to-Market" },
  { id: 12, component: Slide12Financials, label: "Financials" },
  { id: 13, component: Slide13Roadmap, label: "Roadmap" },
  { id: 14, component: Slide14CTA, label: "Let's Talk" },
];

export function PitchDeck() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const goToSlide = useCallback(
    (index: number) => {
      if (index < 0 || index >= slides.length || index === currentSlide) return;
      setDirection(index > currentSlide ? 1 : -1);
      setCurrentSlide(index);
      setShowOverview(false);
    },
    [currentSlide]
  );

  const next = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide((prev) => prev + 1);
    }
  }, [currentSlide]);

  const prev = useCallback(() => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide((prev) => prev - 1);
    }
  }, [currentSlide]);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Auto-hide controls (longer timeout on mobile, controls always visible initially)
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    // Don't auto-hide on mobile (touch devices)
    const isTouchDevice = "ontouchstart" in window;
    if (!isTouchDevice) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case " ":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          prev();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "Escape":
          if (showOverview) {
            setShowOverview(false);
          }
          break;
        case "o":
          e.preventDefault();
          setShowOverview((prev) => !prev);
          break;
        case "Home":
          e.preventDefault();
          goToSlide(0);
          break;
        case "End":
          e.preventDefault();
          goToSlide(slides.length - 1);
          break;
      }
      resetControlsTimeout();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, toggleFullscreen, showOverview, goToSlide, resetControlsTimeout]);

  // Mouse movement shows controls
  useEffect(() => {
    const handler = () => resetControlsTimeout();
    window.addEventListener("mousemove", handler);
    resetControlsTimeout();
    return () => window.removeEventListener("mousemove", handler);
  }, [resetControlsTimeout]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Touch/swipe support - only trigger on horizontal swipes, not vertical scrolls
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const diffX = touchStartRef.current.x - e.changedTouches[0].clientX;
    const diffY = touchStartRef.current.y - e.changedTouches[0].clientY;

    // Only trigger swipe if horizontal movement is greater than vertical
    // and horizontal movement exceeds threshold
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX > 0) next();
      else prev();
    }
    touchStartRef.current = null;
  };

  const SlideComponent = slides[currentSlide].component;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-[#09090b] overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseMove={resetControlsTimeout}
    >
      {/* Slide content */}
      <SlideWrapper direction={direction} slideKey={currentSlide}>
        <div className="w-full h-full">
          <SlideComponent />
        </div>
      </SlideWrapper>

      {/* Controls overlay */}
      <AnimatePresence>
        {showControls && !showOverview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Mobile navigation arrows - large touch targets on sides */}
            <button
              onClick={prev}
              disabled={currentSlide === 0}
              className="sm:hidden absolute left-0 top-1/2 -translate-y-1/2 h-32 w-16 flex items-center justify-start pl-2 text-zinc-500 active:text-white disabled:opacity-0 transition-all z-10"
              aria-label="Previous slide"
            >
              <CaretLeft className="w-8 h-8" weight="bold" />
            </button>
            <button
              onClick={next}
              disabled={currentSlide === slides.length - 1}
              className="sm:hidden absolute right-0 top-1/2 -translate-y-1/2 h-32 w-16 flex items-center justify-end pr-2 text-zinc-500 active:text-white disabled:opacity-0 transition-all z-10"
              aria-label="Next slide"
            >
              <CaretRight className="w-8 h-8" weight="bold" />
            </button>

            {/* Bottom bar - with safe area for mobile browser nav */}
            <div className="absolute bottom-0 left-0 right-0 px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-3 flex items-center justify-between bg-gradient-to-t from-black/80 sm:from-black/60 to-transparent">
              {/* Progress bar for mobile / dots for desktop */}
              <div className="flex-1 sm:flex-none flex items-center gap-1.5">
                {/* Mobile: Progress bar */}
                <div className="sm:hidden flex-1 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
                    />
                  </div>
                </div>
                {/* Desktop: Progress dots */}
                <div className="hidden sm:flex items-center gap-1.5">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToSlide(i)}
                      className={`transition-all rounded-full ${
                        i === currentSlide
                          ? "w-6 h-2 bg-blue-500"
                          : "w-2 h-2 bg-zinc-600 hover:bg-zinc-400"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Slide counter & controls */}
              <div className="flex items-center gap-2 sm:gap-2 ml-3">
                <span className="text-xs text-zinc-400 sm:text-zinc-500 font-mono">
                  {currentSlide + 1}/{slides.length}
                </span>

                {/* Desktop nav buttons */}
                <button
                  onClick={prev}
                  disabled={currentSlide === 0}
                  className="hidden sm:flex p-2 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <CaretLeft className="w-4 h-4" weight="bold" />
                </button>
                <button
                  onClick={next}
                  disabled={currentSlide === slides.length - 1}
                  className="hidden sm:flex p-2 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <CaretRight className="w-4 h-4" weight="bold" />
                </button>
                <button
                  onClick={() => setShowOverview(true)}
                  className="p-2.5 sm:p-2 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700/80 transition-all"
                >
                  <List className="w-5 h-5 sm:w-4 sm:h-4" weight="bold" />
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="hidden sm:flex p-2 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700/80 transition-all"
                >
                  {isFullscreen ? (
                    <CornersIn className="w-4 h-4" weight="bold" />
                  ) : (
                    <CornersOut className="w-4 h-4" weight="bold" />
                  )}
                </button>
              </div>
            </div>

            {/* Mobile swipe hint - only on first slide */}
            {currentSlide === 0 && (
              <div className="sm:hidden absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/80 text-xs text-zinc-400">
                <CaretLeft className="w-3 h-3" />
                <span>Swipe or tap arrows</span>
                <CaretRight className="w-3 h-3" />
              </div>
            )}

            {/* Keyboard hint - desktop only */}
            <div className="absolute top-4 right-4 hidden sm:flex items-center gap-2 text-[10px] text-zinc-600">
              <kbd className="px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-500">
                ←→
              </kbd>
              <span>navigate</span>
              <kbd className="px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-500">
                F
              </kbd>
              <span>fullscreen</span>
              <kbd className="px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-500">
                O
              </kbd>
              <span>overview</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overview panel */}
      <AnimatePresence>
        {showOverview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#09090b]/95 backdrop-blur-xl overflow-y-auto"
          >
            <div className="max-w-5xl mx-auto px-6 py-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-white">Slides Overview</h3>
                <button
                  onClick={() => setShowOverview(false)}
                  className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" weight="bold" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {slides.map((slide, i) => (
                  <button
                    key={slide.id}
                    onClick={() => goToSlide(i)}
                    className={`text-left rounded-xl border p-4 transition-all hover:border-blue-500/50 hover:bg-blue-500/5 ${
                      i === currentSlide
                        ? "border-blue-500/50 bg-blue-500/10"
                        : "border-zinc-800 bg-zinc-900/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-mono ${i === currentSlide ? "text-blue-400" : "text-zinc-500"}`}>
                        {String(slide.id).padStart(2, "0")}
                      </span>
                    </div>
                    <p className={`text-sm font-medium ${i === currentSlide ? "text-white" : "text-zinc-400"}`}>
                      {slide.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
