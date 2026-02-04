"use client";

import React, { useMemo, useRef, useEffect, type ReactNode } from "react";
import type { GsapAnimationConfig, AnimationPreset, AnimationEasing } from "@/features/gsap";
import { DEFAULT_ANIMATION_CONFIG, PARALLAX_DEFAULTS } from "@/features/gsap";
import { getGsapFromVars } from "@/features/gsap/utils/presets";
import { vectorShapesToPathWithBounds } from "@/shared/ui";

type GSAPTweenVars = Record<string, unknown>;
type GSAPStaggerVars = Record<string, unknown>;

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
  const from = config.staggerFrom ?? DEFAULT_ANIMATION_CONFIG.staggerFrom ?? "start";
  const amount = config.staggerAmount ?? 0;
  if (amount > 0) {
    return { amount, from };
  }
  const each = config.staggerEach ?? 0.12;
  return { each, from };
};

const buildEase = (
  config: GsapAnimationConfig,
  CustomEase: typeof import("gsap/CustomEase").CustomEase
): string => {
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

const buildEaseValue = (
  easing: AnimationEasing | undefined,
  customEase: string | undefined,
  CustomEase: typeof import("gsap/CustomEase").CustomEase
): string => {
  if (easing && easing !== "custom") return easing;
  if (!customEase) return DEFAULT_ANIMATION_CONFIG.easing;
  const hash = customEase.split("").reduce((acc: number, char: string) => {
    return (acc << 5) - acc + char.charCodeAt(0);
  }, 0);
  const name = `custom-${Math.abs(hash)}`;
  try {
    CustomEase.create(name, customEase);
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
      ? config.scrollScrub ?? DEFAULT_ANIMATION_CONFIG.scrollScrub ?? 0.6
      : false;
  const pin =
    scrollMode === "pin" || scrollMode === "story"
      ? true
      : config.scrollPin ?? false;
  const snap = config.scrollSnap
    ? {
      snapTo: Math.max(1, targetCount - 1) ? 1 / Math.max(1, targetCount - 1) : 1,
      duration: config.scrollSnapDuration ?? DEFAULT_ANIMATION_CONFIG.scrollSnapDuration ?? 0.3,
    }
    : undefined;
  return {
    trigger: root,
    start: config.scrollStart ?? DEFAULT_ANIMATION_CONFIG.scrollStart ?? "top 80%",
    end: config.scrollEnd ?? DEFAULT_ANIMATION_CONFIG.scrollEnd ?? "bottom top",
    scrub,
    pin,
    ...(snap ? { snap } : {}),
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

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const resolveMotionPath = (config: GsapAnimationConfig, root: HTMLElement): string => {
  const configuredPath = (config.motionPathPath ?? "").trim();
  if (configuredPath) return configuredPath;
  const shapes = config.motionPathShapes ?? [];
  if (!shapes.length) return "";
  const rect = root.getBoundingClientRect();
  return vectorShapesToPathWithBounds(shapes, rect.width, rect.height);
};

const buildMotionPathVars = (
  config: GsapAnimationConfig,
  path: string
): GSAPTweenVars => {
  const autoRotate = config.motionPathAutoRotate ? config.motionPathRotateOffset ?? 0 : false;
  return {
    path,
    align: config.motionPathAlign ? path : false,
    autoRotate,
    start: clamp01(config.motionPathStart ?? 0),
    end: clamp01(config.motionPathEnd ?? 1),
  };
};

const resolveParallaxOffset = (config: GsapAnimationConfig): number => {
  const raw = config.parallaxOffset ?? 0;
  if (raw !== 0) return raw;
  const preset = config.parallaxPreset ?? "none";
  return PARALLAX_DEFAULTS[preset]?.offset ?? 0;
};

const seededRandom = (seed: number): number => {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
};

const computeParallaxOffset = (
  config: GsapAnimationConfig,
  index: number,
  total: number
): number => {
  const base = resolveParallaxOffset(config);
  if (base === 0) return 0;
  const pattern = config.parallaxPattern ?? "uniform";
  const reverse = config.parallaxReverse ? -1 : 1;
  if (pattern === "alternate") {
    const sign = index % 2 === 0 ? 1 : -1;
    return base * sign * reverse;
  }
  if (pattern === "increment") {
    const step = config.parallaxChildStep ?? DEFAULT_ANIMATION_CONFIG.parallaxChildStep ?? 16;
    return (base + step * index) * reverse;
  }
  if (pattern === "layers") {
    const strength = config.parallaxLayerStrength ?? DEFAULT_ANIMATION_CONFIG.parallaxLayerStrength ?? 0.35;
    const t = total > 1 ? index / (total - 1) : 0;
    return base * (1 + strength * t) * reverse;
  }
  if (pattern === "random") {
    const seed = config.parallaxRandomSeed ?? DEFAULT_ANIMATION_CONFIG.parallaxRandomSeed ?? 7;
    const rand = seededRandom(seed + index * 17);
    const sign = rand > 0.5 ? 1 : -1;
    return base * sign * reverse;
  }
  return base * reverse;
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
  }, [config]);
  const hasMotionPathConfig = Boolean(
    mergedConfig?.motionPathEnabled &&
      ((mergedConfig.motionPathPath ?? "").trim() || (mergedConfig.motionPathShapes?.length ?? 0) > 0)
  );
  const hasParallaxConfig = Boolean(
    mergedConfig &&
      (mergedConfig.parallaxPreset !== "none" ||
        (mergedConfig.parallaxOffset ?? 0) !== 0 ||
        (mergedConfig.parallaxScaleFrom ?? 1) !== 1 ||
        (mergedConfig.parallaxScaleTo ?? 1) !== 1 ||
        (mergedConfig.parallaxRotateFrom ?? 0) !== 0 ||
        (mergedConfig.parallaxRotateTo ?? 0) !== 0 ||
        (mergedConfig.parallaxOpacityFrom ?? 1) !== 1 ||
        (mergedConfig.parallaxOpacityTo ?? 1) !== 1 ||
        (mergedConfig.parallaxBlurFrom ?? 0) !== 0 ||
        (mergedConfig.parallaxBlurTo ?? 0) !== 0)
  );

  useEffect(() => {
    if (!mergedConfig || (mergedConfig.preset === "none" && !hasMotionPathConfig && !hasParallaxConfig)) return;
    if (!ref.current) return;
    let ctx: ReturnType<typeof import("gsap").gsap.context> | null = null;
    let cancelled = false;

    const loadGsap = async (): Promise<void> => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      const { CustomEase } = await import("gsap/CustomEase");
      const { MotionPathPlugin } = await import("gsap/MotionPathPlugin");
      if (ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);
      }
      if (CustomEase) {
        gsap.registerPlugin(CustomEase);
      }
      if (MotionPathPlugin) {
        gsap.registerPlugin(MotionPathPlugin);
      }

      if (cancelled || !ref.current) return;
      const root = ref.current;

      ctx = gsap.context(() => {
        const targets = buildTargets(root, mergedConfig.selector);
        if (!targets.length) return;
        const ease = buildEase(mergedConfig, CustomEase);
        const stagger = buildStagger(mergedConfig, targets.length);
        const canUseScrollTrigger = Boolean(ScrollTrigger);
        const scrollTrigger = canUseScrollTrigger
          ? buildScrollTrigger(mergedConfig, root, targets.length)
          : undefined;
        const baseVars: GSAPTweenVars = {
          duration: mergedConfig.duration ?? DEFAULT_ANIMATION_CONFIG.duration ?? 0.6,
          delay: mergedConfig.delay ?? DEFAULT_ANIMATION_CONFIG.delay ?? 0,
          ease,
          ...(stagger ? { stagger } : {}),
          ...(scrollTrigger ? { scrollTrigger } : {}),
        };

        const motionPathPath = mergedConfig.motionPathEnabled ? resolveMotionPath(mergedConfig, root) : "";
        const hasMotionPath = Boolean(mergedConfig.motionPathEnabled && motionPathPath);
        if (hasMotionPath) {
          const motionPathVars = buildMotionPathVars(mergedConfig, motionPathPath);
          if (mergedConfig.motionPathFollow && targets.length > 1) {
            const spacing = mergedConfig.motionPathSpacing ?? DEFAULT_ANIMATION_CONFIG.motionPathSpacing ?? 0.08;
            targets.forEach((target: Element, index: number) => {
              const offset = spacing * index;
              const start = clamp01((mergedConfig.motionPathStart ?? 0) + offset);
              const end = clamp01((mergedConfig.motionPathEnd ?? 1) + offset);
              gsap.to(target, {
                ...baseVars,
                motionPath: { ...motionPathVars, start, end },
              });
            });
          } else {
            gsap.to(targets, { ...baseVars, motionPath: motionPathVars });
          }
          if (mergedConfig.preset === "none") {
            return;
          }
        }

        if (hasParallaxConfig && canUseScrollTrigger) {
          const parallaxSelector = (mergedConfig.parallaxSelector ?? "").trim();
          const parallaxTargets = buildTargets(root, parallaxSelector || mergedConfig.selector);
          if (parallaxTargets.length > 0) {
            const axis = mergedConfig.parallaxAxis ?? "y";
            const start = mergedConfig.parallaxStart ?? DEFAULT_ANIMATION_CONFIG.parallaxStart ?? "top bottom";
            const end = mergedConfig.parallaxEnd ?? DEFAULT_ANIMATION_CONFIG.parallaxEnd ?? "bottom top";
            const scrub = mergedConfig.parallaxScrub ?? DEFAULT_ANIMATION_CONFIG.parallaxScrub ?? 0.6;
            const easeValue = buildEaseValue(
              mergedConfig.parallaxEase ?? mergedConfig.easing,
              mergedConfig.customEase,
              CustomEase
            );
            const baseScaleFrom = mergedConfig.parallaxScaleFrom ?? 1;
            const baseScaleTo = mergedConfig.parallaxScaleTo ?? 1;
            const depthScale = mergedConfig.parallaxPreset === "depth" ? PARALLAX_DEFAULTS.depth?.scale : undefined;
            const scaleFromSeed = baseScaleFrom !== 1 || baseScaleTo !== 1 ? baseScaleFrom : (depthScale ?? baseScaleFrom);
            const scaleToSeed = baseScaleFrom !== 1 || baseScaleTo !== 1 ? baseScaleTo : 1;
            const rotateFromSeed = mergedConfig.parallaxRotateFrom ?? 0;
            const rotateToSeed = mergedConfig.parallaxRotateTo ?? 0;
            const opacityFromSeed = mergedConfig.parallaxOpacityFrom ?? 1;
            const opacityToSeed = mergedConfig.parallaxOpacityTo ?? 1;
            const blurFromSeed = mergedConfig.parallaxBlurFrom ?? 0;
            const blurToSeed = mergedConfig.parallaxBlurTo ?? 0;
            const scaleStep =
              mergedConfig.parallaxPattern === "layers"
                ? mergedConfig.parallaxLayerScaleStep ?? DEFAULT_ANIMATION_CONFIG.parallaxLayerScaleStep ?? 0
                : 0;

            parallaxTargets.forEach((target: Element, index: number) => {
              const offset = computeParallaxOffset(mergedConfig, index, parallaxTargets.length);
              const scaleFrom = scaleFromSeed + scaleStep * index;
              const scaleTo = scaleToSeed + scaleStep * index;
              const fromVars: GSAPTweenVars = {};
              const toVars: GSAPTweenVars = {};

              if (offset !== 0) {
                fromVars[axis] = -offset;
                toVars[axis] = offset;
              }
              if (scaleFrom !== scaleTo) {
                fromVars.scale = scaleFrom;
                toVars.scale = scaleTo;
              }
              if (rotateFromSeed !== rotateToSeed) {
                fromVars.rotation = rotateFromSeed;
                toVars.rotation = rotateToSeed;
              }
              if (opacityFromSeed !== opacityToSeed) {
                fromVars.opacity = opacityFromSeed;
                toVars.opacity = opacityToSeed;
              }
              if (blurFromSeed !== blurToSeed) {
                fromVars.filter = `blur(${blurFromSeed}px)`;
                toVars.filter = `blur(${blurToSeed}px)`;
              }
              if (Object.keys(fromVars).length === 0 && Object.keys(toVars).length === 0) return;

              gsap.fromTo(target, fromVars, {
                ...toVars,
                ease: easeValue,
                scrollTrigger: {
                  trigger: root,
                  start,
                  end,
                  scrub,
                  invalidateOnRefresh: true,
                },
              });
            });
          }
        }

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

      ScrollTrigger?.refresh?.();
    };

    void loadGsap();

    return (): void => {
      cancelled = true;
      ctx?.revert();
    };
  }, [mergedConfig, configSignature, hasMotionPathConfig, hasParallaxConfig]);

  if (!mergedConfig || (mergedConfig.preset === "none" && !hasMotionPathConfig && !hasParallaxConfig)) {
    return <>{children}</>;
  }

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
