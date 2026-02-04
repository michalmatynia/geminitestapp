"use client";

import React, { useMemo, useRef, useEffect, type ReactNode } from "react";
import type { GsapAnimationConfig, AnimationPreset, AnimationEasing } from "@/features/gsap";
import { DEFAULT_ANIMATION_CONFIG } from "@/features/gsap";
import { getGsapFromVars } from "@/features/gsap/utils/presets";

interface GsapAnimationWrapperProps {
  config?: Partial<GsapAnimationConfig> | undefined;
  children: ReactNode;
  className?: string | undefined;
}

const buildTargets = (root: HTMLElement, selector?: string): Element[] => {
  const normalized = (selector ?? "").trim();
  if (!normalized || normalized === ":scope") return [root];
  if (normalized === ":scope > *") return Array.from(root.children);
  if (normalized === ":scope *") return Array.from(root.querySelectorAll("*"));
  try {
    const matches = Array.from(root.querySelectorAll(normalized));
    return matches.length ? matches : [root];
  } catch {
    return [root];
  }
};

const buildStagger = (
  config: GsapAnimationConfig,
  targetCount: number
): GSAPStaggerVars | undefined => {
  if (targetCount <= 1) return undefined;
  const hasStagger =
    config.preset === "stagger" ||
    (config.staggerEach ?? 0) > 0 ||
    (config.staggerAmount ?? 0) > 0;
  if (!hasStagger) return undefined;
  const from = config.staggerFrom ?? DEFAULT_ANIMATION_CONFIG.staggerFrom;
  const amount = config.staggerAmount ?? 0;
  if (amount > 0) {
    return { amount, from };
  }
  const each = config.staggerEach ?? DEFAULT_ANIMATION_CONFIG.staggerEach;
  return { each, from };
};

const buildEase = (
  config: GsapAnimationConfig,
  CustomEase: typeof import("gsap/CustomEase").CustomEase
): AnimationEasing | string => {
  if (config.easing !== "custom") {
    return config.easing ?? DEFAULT_ANIMATION_CONFIG.easing;
  }
  const value = (config.customEase ?? "").trim();
  if (!value) return DEFAULT_ANIMATION_CONFIG.easing;
  const hash = value.split("").reduce((acc: number, char: string) => {
    return (acc << 5) - acc + char.charCodeAt(0);
  }, 0);
  const name = `custom-${Math.abs(hash)}`;
  try {
    CustomEase.create(name, value);
  } catch {
    return DEFAULT_ANIMATION_CONFIG.easing;
  }
  return name;
};

const buildScrollTrigger = (
  config: GsapAnimationConfig,
  root: HTMLElement,
  targetCount: number
): ScrollTrigger.Vars | undefined => {
  const scrollMode = config.scrollMode ?? "none";
  const isScroll = config.trigger === "scroll" || scrollMode !== "none";
  if (!isScroll) return undefined;
  const scrub =
    scrollMode === "scrub" || scrollMode === "pin" || scrollMode === "story"
      ? config.scrollScrub ?? DEFAULT_ANIMATION_CONFIG.scrollScrub
      : false;
  const pin =
    scrollMode === "pin" || scrollMode === "story"
      ? true
      : config.scrollPin ?? false;
  const snap = config.scrollSnap
    ? {
      snapTo: Math.max(1, targetCount - 1) ? 1 / Math.max(1, targetCount - 1) : 1,
      duration: config.scrollSnapDuration ?? DEFAULT_ANIMATION_CONFIG.scrollSnapDuration,
    }
    : undefined;
  return {
    trigger: root,
    start: config.scrollStart ?? DEFAULT_ANIMATION_CONFIG.scrollStart,
    end: config.scrollEnd ?? DEFAULT_ANIMATION_CONFIG.scrollEnd,
    scrub,
    pin,
    snap,
    toggleActions: "play none none reverse",
  };
};

const buildKeyframes = (preset: AnimationPreset): GSAPTweenVars | null => {
  if (preset === "shake") {
    return {
      keyframes: [
        { x: -6 },
        { x: 6 },
        { x: -4 },
        { x: 4 },
        { x: -2 },
        { x: 2 },
        { x: 0 },
      ],
    };
  }
  if (preset === "wiggle") {
    return {
      keyframes: [
        { rotation: -4 },
        { rotation: 4 },
        { rotation: -3 },
        { rotation: 3 },
        { rotation: 0 },
      ],
    };
  }
  if (preset === "wobble") {
    return {
      keyframes: [
        { rotation: -6, scale: 0.98 },
        { rotation: 6, scale: 1.02 },
        { rotation: -4, scale: 0.99 },
        { rotation: 4, scale: 1.01 },
        { rotation: 0, scale: 1 },
      ],
    };
  }
  return null;
};

export function GsapAnimationWrapper({
  config,
  children,
  className,
}: GsapAnimationWrapperProps): React.ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const configSignature = useMemo(() => JSON.stringify(config ?? null), [config]);
  const mergedConfig: GsapAnimationConfig | null = useMemo(() => {
    if (!config) return null;
    return { ...DEFAULT_ANIMATION_CONFIG, ...config };
  }, [configSignature]);

  useEffect(() => {
    if (!mergedConfig || mergedConfig.preset === "none") return;
    if (!ref.current) return;
    let ctx: ReturnType<typeof import("gsap").gsap.context> | null = null;
    let cancelled = false;

    const loadGsap = async (): Promise<void> => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      const { CustomEase } = await import("gsap/CustomEase");
      gsap.registerPlugin(ScrollTrigger, CustomEase);

      if (cancelled || !ref.current) return;
      const root = ref.current;

      ctx = gsap.context(() => {
        const targets = buildTargets(root, mergedConfig.selector);
        if (!targets.length) return;
        const ease = buildEase(mergedConfig, CustomEase);
        const stagger = buildStagger(mergedConfig, targets.length);
        const scrollTrigger = buildScrollTrigger(mergedConfig, root, targets.length);
        const baseVars: GSAPTweenVars = {
          duration: mergedConfig.duration ?? DEFAULT_ANIMATION_CONFIG.duration,
          delay: mergedConfig.delay ?? DEFAULT_ANIMATION_CONFIG.delay,
          ease,
          stagger,
          scrollTrigger,
        };

        if (mergedConfig.preset === "fadeOut") {
          gsap.to(targets, { ...baseVars, opacity: 0 });
          return;
        }

        const keyframes = buildKeyframes(mergedConfig.preset);
        if (keyframes) {
          gsap.to(targets, { ...baseVars, ...keyframes });
          return;
        }

        const fromVars = getGsapFromVars(mergedConfig.preset);
        gsap.from(targets, { ...fromVars, ...baseVars });
      }, root);

      ScrollTrigger.refresh();
    };

    void loadGsap();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [mergedConfig, configSignature]);

  if (!mergedConfig || mergedConfig.preset === "none") {
    return <>{children}</>;
  }

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
