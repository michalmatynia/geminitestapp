"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { BlockInstance } from "../../../types/page-builder";
import { FrontendBlockRenderer } from "./FrontendBlockRenderer";
import { MediaStylesProvider } from "../media-styles-context";
import { getSectionContainerClass, getSectionStyles, type ColorSchemeColors } from "../theme-styles";

interface FrontendSlideshowSectionProps {
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
  colorSchemes?: Record<string, ColorSchemeColors> | undefined;
  layout?: { fullWidth?: boolean | undefined } | undefined;
}

export function FrontendSlideshowSection({ settings, blocks, colorSchemes, layout }: FrontendSlideshowSectionProps): React.ReactNode {
  const sectionStyles = getSectionStyles(settings, colorSchemes);
  const transition = (settings["transition"] as string) || "fade";
  const transitionDuration = (settings["transitionDuration"] as number) || 700;
  const autoplay = (settings["autoplay"] as string) !== "no";
  const autoplaySpeed = (settings["autoplaySpeed"] as number) || 5000;
  const pauseOnHover = (settings["pauseOnHover"] as string) !== "no";
  const loop = (settings["loop"] as string) !== "no";
  const showArrows = (settings["showArrows"] as string) !== "no";
  const showDots = (settings["showDots"] as string) !== "no";
  const heightMode = (settings["heightMode"] as string) || "auto";
  const height = (settings["height"] as number) || 360;
  // Default element animation settings from Slideshow
  const elementAnimationType = (settings["elementAnimationType"] as string) || "fade-in";
  const elementAnimationDuration = (settings["elementAnimationDuration"] as number) || 400;
  const elementAnimationDelay = (settings["elementAnimationDelay"] as number) || 0;
  const elementAnimationEasing = (settings["elementAnimationEasing"] as string) || "ease-out";
  const elementAnimationStagger = (settings["elementAnimationStagger"] as number) || 100;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  // Track animation trigger count per frame to re-trigger animations on frame change
  const [animTrigger, setAnimTrigger] = useState<Record<number, number>>({});
  const prevActiveIndexRef = React.useRef<number | null>(null);

  const normalizeAnimationType = useCallback((value: string): string => {
    if (value === "fade-in") return "fade";
    return value;
  }, []);

  // Increment trigger when active frame changes (skip initial mount)
  useEffect(() => {
    if (prevActiveIndexRef.current === null) {
      prevActiveIndexRef.current = activeIndex;
      return;
    }
    if (prevActiveIndexRef.current === activeIndex) return;
    prevActiveIndexRef.current = activeIndex;
    setAnimTrigger((prev) => ({
      ...prev,
      [activeIndex]: (prev[activeIndex] ?? 0) + 1,
    }));
  }, [activeIndex]);

  const frames = useMemo((): BlockInstance[] => {
    const frameBlocks = blocks.filter((block: BlockInstance) => block.type === "SlideshowFrame");
    const legacyBlocks = blocks.filter((block: BlockInstance) => block.type !== "SlideshowFrame");
    if (frameBlocks.length > 0) {
      if (legacyBlocks.length === 0) return frameBlocks;
      const legacyFrames = legacyBlocks.map((block: BlockInstance) => ({
        id: block.id,
        type: "SlideshowFrame",
        settings: {},
        blocks: [block],
      }));
      return [...frameBlocks, ...legacyFrames];
    }
    return legacyBlocks.map((block: BlockInstance) => ({
      id: block.id,
      type: "SlideshowFrame",
      settings: {},
      blocks: [block],
    }));
  }, [blocks]);

  const slideCount = frames.length;
  const currentActiveIndex = activeIndex >= slideCount ? 0 : activeIndex;

  const goToNext = useCallback((): void => {
    if (slideCount <= 1) return;
    if (!loop && currentActiveIndex >= slideCount - 1) return;
    setActiveIndex((prev: number) => (prev + 1) % slideCount);
  }, [slideCount, loop, currentActiveIndex]);

  const goToPrev = useCallback((): void => {
    if (slideCount <= 1) return;
    if (!loop && currentActiveIndex <= 0) return;
    setActiveIndex((prev: number) => (prev - 1 + slideCount) % slideCount);
  }, [slideCount, loop, currentActiveIndex]);

  useEffect((): (() => void) | undefined => {
    if (!autoplay || isPaused || slideCount <= 1 || autoplaySpeed <= 0) return undefined;
    const interval = setInterval(goToNext, autoplaySpeed);
    return (): void => clearInterval(interval);
  }, [goToNext, autoplaySpeed, slideCount, autoplay, isPaused]);

  const slideHeightStyle: React.CSSProperties | undefined =
    heightMode === "fixed" && height > 0 ? { height: `${height}px` } : undefined;

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
      <div className={getSectionContainerClass({ fullWidth: true, paddingClass: "px-0" })}>
        <div
          className="relative overflow-hidden min-h-[300px]"
          style={slideHeightStyle}
          onMouseEnter={pauseOnHover ? (): void => setIsPaused(true) : undefined}
          onMouseLeave={pauseOnHover ? (): void => setIsPaused(false) : undefined}
        >
          {frames.map((frame: BlockInstance, idx: number) => {
            const frameSettings = frame.settings ?? {};
            const backgroundColor = (frameSettings["backgroundColor"] as string) || "";
            const contentAlignment = (frameSettings["contentAlignment"] as string) || "center";
            const verticalAlignment = (frameSettings["verticalAlignment"] as string) || "center";
            const fillContent = frameSettings["fillContent"] === true || frameSettings["fillContent"] === "yes";
            const paddingTop = (frameSettings["paddingTop"] as number) || 0;
            const paddingBottom = (frameSettings["paddingBottom"] as number) || 0;
            const paddingLeft = (frameSettings["paddingLeft"] as number) || 0;
            const paddingRight = (frameSettings["paddingRight"] as number) || 0;
            const alignItems =
              contentAlignment === "center"
                ? "center"
                : contentAlignment === "right"
                  ? "flex-end"
                  : "flex-start";
            const justifyContent =
              verticalAlignment === "center"
                ? "center"
                : verticalAlignment === "bottom"
                  ? "flex-end"
                  : "flex-start";
            const frameStyle: React.CSSProperties = {
              backgroundColor: backgroundColor || undefined,
              padding: `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`,
              alignItems,
              justifyContent,
            };

            // Get animation settings with inheritance from Slideshow defaults
            const frameAnimType = frameSettings["animationType"] as string | undefined;
            const animationTypeRaw = frameAnimType === "inherit" || !frameAnimType
              ? elementAnimationType
              : frameAnimType;
            const animationType = normalizeAnimationType(animationTypeRaw);
            const animationDuration = (frameSettings["animationDuration"] as number) ?? elementAnimationDuration;
            const animationDelay = (frameSettings["animationDelay"] as number) ?? elementAnimationDelay;
            const frameAnimEasing = frameSettings["animationEasing"] as string | undefined;
            const animationEasing = frameAnimEasing === "inherit" || !frameAnimEasing
              ? elementAnimationEasing
              : frameAnimEasing;
            const stagger = elementAnimationStagger;
            const isActiveFrame = idx === currentActiveIndex;

            const frameBlocks = frame.blocks ?? [];

            return (
            <div
              key={frame.id}
              className={`${transition === "fade" ? "absolute inset-0 transition-opacity" : "absolute inset-0 transition-transform"} flex flex-col`}
              style={
                transition === "fade"
                  ? {
                      opacity: idx === currentActiveIndex ? 1 : 0,
                      pointerEvents: idx === currentActiveIndex ? "auto" : "none",
                      transitionDuration: `${transitionDuration}ms`,
                    }
                  : {
                      transform: `translateX(${(idx - currentActiveIndex) * 100}%)`,
                      transitionDuration: `${transitionDuration}ms`,
                    }
              }
            >
              <MediaStylesProvider value={null}>
                <div className="flex h-full w-full flex-col" style={frameStyle}>
                {frameBlocks.length > 0 ? (
                  frameBlocks.map((block: BlockInstance, blockIdx: number) => {
                    const blockDelay = animationDelay + (blockIdx * stagger);
                    const animationStyle: React.CSSProperties = isActiveFrame && animationType !== "none"
                      ? {
                          animation: `cms-anim-${animationType} ${animationDuration}ms ${animationEasing} ${blockDelay}ms both`,
                        }
                      : {};
                    const shouldFillBlock = fillContent && (block.type === "Image" || block.type === "ImageElement");
                    const wrapperStyle: React.CSSProperties = shouldFillBlock
                      ? { ...animationStyle, width: "100%", height: "100%", alignSelf: "stretch" }
                      : animationStyle;
                    // Use trigger count in key to re-mount and re-trigger animation
                    const triggerKey = `${block.id}-${animTrigger[idx] ?? 0}`;
                    return (
                      <div key={triggerKey} style={wrapperStyle}>
                        <FrontendBlockRenderer block={block} stretch={shouldFillBlock} />
                      </div>
                    );
                  })
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                    Empty slide
                  </div>
                )}
                </div>
              </MediaStylesProvider>
            </div>
          );
          })}
        </div>

        {/* Navigation arrows */}
        {slideCount > 1 && (showArrows || showDots) && (
          <div className="mt-4 flex items-center justify-center gap-4">
            {showArrows && (
              <button
                type="button"
                onClick={goToPrev}
                disabled={!loop && currentActiveIndex === 0}
                className="rounded-full border border-gray-600 p-2 text-gray-400 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
            )}

            {showDots && (
              <div className="flex gap-2">
                {frames.map((_: BlockInstance, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(): void => setActiveIndex(idx)}
                    className={`size-2 rounded-full transition ${idx === currentActiveIndex ? "bg-white" : "bg-gray-600"}`}
                  />
                ))}
              </div>
            )}

            {showArrows && (
              <button
                type="button"
                onClick={goToNext}
                disabled={!loop && currentActiveIndex === slideCount - 1}
                className="rounded-full border border-gray-600 p-2 text-gray-400 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
