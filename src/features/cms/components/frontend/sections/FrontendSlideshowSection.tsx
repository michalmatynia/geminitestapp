"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { BlockInstance } from "../../../types/page-builder";
import { FrontendBlockRenderer } from "./FrontendBlockRenderer";
import { getSectionContainerClass, getSectionStyles, type ColorSchemeColors } from "../theme-styles";

interface FrontendSlideshowSectionProps {
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
  colorSchemes?: Record<string, ColorSchemeColors>;
  layout?: { fullWidth?: boolean };
}

export function FrontendSlideshowSection({ settings, blocks, colorSchemes, layout }: FrontendSlideshowSectionProps): React.ReactNode {
  const sectionStyles = getSectionStyles(settings, colorSchemes);
  const transition = (settings["transition"] as string) || "fade";
  const autoplaySpeed = (settings["autoplaySpeed"] as number) || 5000;
  const showDots = (settings["showDots"] as string) !== "no";
  const [activeIndex, setActiveIndex] = useState(0);

  const slideCount = blocks.length;

  const goToNext = useCallback((): void => {
    if (slideCount <= 1) return;
    setActiveIndex((prev: number) => (prev + 1) % slideCount);
  }, [slideCount]);

  useEffect((): (() => void) | undefined => {
    if (slideCount <= 1 || autoplaySpeed <= 0) return undefined;
    const interval = setInterval(goToNext, autoplaySpeed);
    return (): void => clearInterval(interval);
  }, [goToNext, autoplaySpeed, slideCount]);

  if (blocks.length === 0) {
    return (
      <section style={sectionStyles}>
        <div className="container mx-auto px-4 md:px-6">
          <p className="text-gray-500 text-center py-12">Add blocks to create slideshow slides</p>
        </div>
      </section>
    );
  }

  return (
    <section style={sectionStyles}>
      <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth })}>
        <div className="relative overflow-hidden rounded-lg min-h-[300px]">
          {blocks.map((block: BlockInstance, idx: number) => (
            <div
              key={block.id}
              className={`${transition === "fade" ? "absolute inset-0 transition-opacity duration-700" : "absolute inset-0 transition-transform duration-700"} flex items-center justify-center`}
              style={
                transition === "fade"
                  ? { opacity: idx === activeIndex ? 1 : 0, pointerEvents: idx === activeIndex ? "auto" : "none" }
                  : { transform: `translateX(${(idx - activeIndex) * 100}%)` }
              }
            >
              <div className="w-full p-6">
                <FrontendBlockRenderer block={block} />
              </div>
            </div>
          ))}
        </div>

        {/* Navigation arrows */}
        {slideCount > 1 && (
          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setActiveIndex((prev: number) => (prev - 1 + slideCount) % slideCount)}
              className="rounded-full border border-gray-600 p-2 text-gray-400 hover:text-white transition"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>

            {showDots && (
              <div className="flex gap-2">
                {blocks.map((_: BlockInstance, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className={`size-2 rounded-full transition ${idx === activeIndex ? "bg-white" : "bg-gray-600"}`}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={goToNext}
              className="rounded-full border border-gray-600 p-2 text-gray-400 hover:text-white transition"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
