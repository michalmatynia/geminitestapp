"use client";

import React, { useRef, useEffect, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { Flip } from "gsap/Flip";
import { Draggable } from "gsap/Draggable";
import { CustomEase } from "gsap/CustomEase";
import { Observer } from "gsap/Observer";
import type { GsapAnimationConfig, RevealStyle, TextEffect } from "@/features/gsap";
import { getGsapFromVars, getParallaxDefaults } from "@/features/gsap";

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, Flip, Draggable, CustomEase, Observer);

interface GsapAnimationWrapperProps {
  config?: GsapAnimationConfig;
  children: ReactNode;
  className?: string;
}

const DEFAULT_STAGGER = 0.12;
const DEFAULT_STAGGER_FROM = "start";
const KEYFRAME_PRESETS: Record<string, gsap.TweenVars> = {
  shake: {
    keyframes: [
      { x: -6 },
      { x: 6 },
      { x: -4 },
      { x: 4 },
      { x: -2 },
      { x: 2 },
      { x: 0 },
    ],
    ease: "none",
  },
  wobble: {
    keyframes: [
      { rotation: -6, x: -6 },
      { rotation: 6, x: 6 },
      { rotation: -3, x: -3 },
      { rotation: 3, x: 3 },
      { rotation: 0, x: 0 },
    ],
    ease: "sine.inOut",
  },
  wiggle: {
    keyframes: [
      { rotation: 2 },
      { rotation: -2 },
      { rotation: 1.5 },
      { rotation: -1.5 },
      { rotation: 0 },
    ],
    ease: "sine.inOut",
  },
};

function getRevealVars(style: RevealStyle): { from: gsap.TweenVars; to: gsap.TweenVars } | null {
  switch (style) {
    case "clipUp":
      return {
        from: { clipPath: "inset(100% 0% 0% 0%)" },
        to: { clipPath: "inset(0% 0% 0% 0%)" },
      };
    case "clipDown":
      return {
        from: { clipPath: "inset(0% 0% 100% 0%)" },
        to: { clipPath: "inset(0% 0% 0% 0%)" },
      };
    case "clipLeft":
      return {
        from: { clipPath: "inset(0% 100% 0% 0%)" },
        to: { clipPath: "inset(0% 0% 0% 0%)" },
      };
    case "clipRight":
      return {
        from: { clipPath: "inset(0% 0% 0% 100%)" },
        to: { clipPath: "inset(0% 0% 0% 0%)" },
      };
    case "mask":
      return {
        from: { clipPath: "inset(0% 0% 100% 0%)" },
        to: { clipPath: "inset(0% 0% 0% 0%)" },
      };
    default:
      return null;
  }
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function getVelocityValue(velocity: number, config: GsapAnimationConfig): number {
  const strength = config.velocityStrength ?? 0.15;
  const max = config.velocityMax ?? 20;
  const raw = (velocity / 1000) * strength * 100;
  return gsap.utils.clamp(-max, max, raw);
}

function applyVelocityEffect(targets: HTMLElement[], velocity: number, config: GsapAnimationConfig): void {
  if (!targets.length) return;
  const effect = config.velocityEffect ?? "none";
  if (effect === "none") return;
  const value = getVelocityValue(velocity, config);
  if (!Number.isFinite(value)) return;
  const vars: gsap.TweenVars = {
    duration: 0.2,
    ease: "power3.out",
    overwrite: "auto",
  };
  if (effect === "scale") {
    vars.scale = 1 + value / 100;
  } else {
    (vars as Record<string, number>)[effect] = value;
  }
  gsap.to(targets, vars);
}

function resetVelocityEffect(targets: HTMLElement[], config: GsapAnimationConfig): void {
  if (!targets.length) return;
  const effect = config.velocityEffect ?? "none";
  if (effect === "none") return;
  const vars: gsap.TweenVars = {
    duration: 0.3,
    ease: "power3.out",
    overwrite: "auto",
  };
  if (effect === "scale") {
    vars.scale = 1;
  } else {
    (vars as Record<string, number>)[effect] = 0;
  }
  gsap.to(targets, vars);
}

function resolveEase(config: GsapAnimationConfig): string | gsap.EaseFunction {
  if (config.easing !== "custom") {
    return config.easing ?? "power2.out";
  }
  const custom = config.customEase?.trim();
  if (!custom) return "power2.out";
  try {
    const name = `cmsEase-${hashString(custom)}`;
    return CustomEase.create(name, custom);
  } catch (error) {
    console.warn("Invalid custom ease string:", error);
    return "power2.out";
  }
}

function splitTextElement(element: HTMLElement, mode: TextEffect): { targets: HTMLElement[]; cleanup: () => void } | null {
  if (!["splitChars", "splitWords", "splitLines"].includes(mode)) return null;
  const originalHtml = element.innerHTML;
  const originalText = element.textContent ?? "";
  element.innerHTML = "";

  const createSpan = (text: string): HTMLSpanElement => {
    const span = document.createElement("span");
    span.textContent = text;
    span.style.display = "inline-block";
    span.style.whiteSpace = "pre";
    return span;
  };

  if (mode === "splitChars") {
    const chars = Array.from(originalText);
    const spans = chars.map((char: string): HTMLSpanElement => createSpan(char));
    spans.forEach((span: HTMLSpanElement): void => { element.appendChild(span); });
    return {
      targets: spans,
      cleanup: (): void => {
        element.innerHTML = originalHtml;
      },
    };
  }

  const words = originalText.split(" ");
  const wordSpans: HTMLSpanElement[] = [];
  words.forEach((word: string, idx: number): void => {
    const span = createSpan(word);
    wordSpans.push(span);
    element.appendChild(span);
    if (idx < words.length - 1) {
      element.appendChild(document.createTextNode(" "));
    }
  });

  if (mode === "splitWords") {
    return {
      targets: wordSpans,
      cleanup: (): void => {
        element.innerHTML = originalHtml;
      },
    };
  }

  // splitLines
  const lines: HTMLElement[][] = [];
  let currentTop: number | null = null;
  wordSpans.forEach((span: HTMLSpanElement): void => {
    const top = span.offsetTop;
    if (currentTop === null || Math.abs(top - currentTop) > 2) {
      lines.push([span]);
      currentTop = top;
    } else {
      lines[lines.length - 1].push(span);
    }
  });

  element.innerHTML = "";
  const lineSpans: HTMLSpanElement[] = [];
  lines.forEach((lineWords: HTMLElement[], idx: number): void => {
    const lineSpan = document.createElement("span");
    lineSpan.style.display = "block";
    lineSpan.style.whiteSpace = "pre";
    lineWords.forEach((word: HTMLElement, wordIdx: number): void => {
      lineSpan.appendChild(word);
      if (wordIdx < lineWords.length - 1) {
        lineSpan.appendChild(document.createTextNode(" "));
      }
    });
    lineSpans.push(lineSpan);
    element.appendChild(lineSpan);
    if (idx < lines.length - 1) {
      element.appendChild(document.createTextNode("\n"));
    }
  });

  return {
    targets: lineSpans,
    cleanup: (): void => {
      element.innerHTML = originalHtml;
    },
  };
}

function resolveTargets(el: HTMLDivElement, config: GsapAnimationConfig): gsap.DOMTarget {
  const selector = config.selector?.trim();

  if (!selector) {
    if (config.preset === "stagger") {
      const children = Array.from(el.children);
      return children.length ? children : el;
    }
    return el;
  }

  const scopedSelector = selector.startsWith(">") ? `:scope ${selector}` : selector;
  const selectorFn = gsap.utils.selector(el);

  try {
    const found = selectorFn(scopedSelector);
    if (found.length) return found;
  } catch {
    // Invalid selector; fall back to animating the wrapper element.
  }

  return el;
}

export function GsapAnimationWrapper({ config, children, className }: GsapAnimationWrapperProps): React.ReactNode {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!config || config.preset === "none" || !ref.current) return;

    const el = ref.current;
    const cleanupFns: Array<() => void> = [];
    const ctx = gsap.context(() => {
      const fromVars = getGsapFromVars(config.preset);
      const { transformOrigin, transformPerspective, ...tweenFromVars } = fromVars as gsap.TweenVars & {
        transformOrigin?: string;
        transformPerspective?: number | string;
      };
      const duration = config.duration ?? 1;
      const delay = config.delay ?? 0;
      const resolvedEase = resolveEase(config);

      // For bounce preset, override easing
      const finalEase = config.preset === "bounce" ? "bounce.out" : resolvedEase;
      const targets = resolveTargets(el, config);
      const targetsArray = gsap.utils.toArray<HTMLElement>(targets);
      const revealVars = getRevealVars(config.revealStyle ?? "none");
      const isFadeOut = config.preset === "fadeOut";
      const keyframePreset = KEYFRAME_PRESETS[config.preset];
      const scrollMode = config.scrollMode ?? "none";
      const scrollStart = config.scrollStart ?? "top 85%";
      const scrollEnd = config.scrollEnd ?? "bottom top";
      const isScrubMode = scrollMode === "scrub" || scrollMode === "pin" || scrollMode === "story";
      const baseScrollTrigger =
        scrollMode === "none"
          ? config.trigger === "scroll"
            ? {
                trigger: el,
                start: scrollStart,
                toggleActions: "play none none none",
              }
            : undefined
          : scrollMode === "reveal"
            ? {
                trigger: el,
                start: scrollStart,
                toggleActions: "play none none none",
              }
            : {
                trigger: el,
                start: scrollStart,
                end: scrollEnd,
                scrub: config.scrollScrub ?? 0.6,
                pin: scrollMode === "pin" || scrollMode === "story" || config.scrollPin || false,
                anticipatePin: scrollMode === "story" ? 1 : undefined,
              };

      if (transformOrigin || transformPerspective) {
        gsap.set(targets, {
          ...(transformOrigin ? { transformOrigin } : {}),
          ...(transformPerspective ? { transformPerspective } : {}),
        });
      }

      const timelineModeRaw = config.timelineMode ?? "none";
      const effectiveTimelineMode =
        timelineModeRaw === "none" && scrollMode === "story" && targetsArray.length > 1
          ? "sequence"
          : timelineModeRaw;
      const timelineGap = config.timelineGap ?? 0.15;
      const timelineOverlap = config.timelineOverlap ?? 0.2;
      const timelineResponseOffset = config.timelineResponseOffset ?? 0.2;
      const timelineStaggerEach = config.timelineStaggerEach ?? DEFAULT_STAGGER;
      const timelineWaveAmount = config.timelineWaveAmount ?? 0.5;
      const timelineRandomize = config.timelineRandomize ?? false;
      const timelineLoop = config.timelineLoop ?? false;
      const timelineRepeat = config.timelineRepeat ?? -1;
      const timelineYoyo = config.timelineYoyo ?? false;
      const timelineRepeatDelay = config.timelineRepeatDelay ?? 0.2;

      const orderedTargets =
        timelineRandomize && targetsArray.length > 1 ? shuffleArray(targetsArray) : targetsArray;

      const pickAxisVelocity = (axis: string, vx: number, vy: number): number => {
        if (axis === "x") return vx;
        if (axis === "y") return vy;
        return Math.abs(vx) > Math.abs(vy) ? vx : vy;
      };

      const makeScrollTrigger = (withLabels: boolean): gsap.TweenVars["scrollTrigger"] => {
        if (!baseScrollTrigger) return undefined;
        // @ts-expect-error - GSAP ScrollTrigger types
        const triggerConfig = { ...baseScrollTrigger } as Record<string, unknown>;
        if (withLabels && config.scrollSnap) {
          // @ts-expect-error - GSAP ScrollTrigger types are complex unions
          triggerConfig.snap = {
            snapTo: "labelsDirectional",
            duration: config.scrollSnapDuration ?? 0.35,
            ease: "power1.inOut",
          };
        }
        return triggerConfig as gsap.TweenVars["scrollTrigger"];
      };

      const applyTimelineTween = (
        tl: gsap.core.Timeline,
        target: gsap.TweenTarget,
        position: gsap.Position
      ): void => {
        if (keyframePreset) {
          tl.to(
            target,
            {
              ...keyframePreset,
              duration,
              ease: keyframePreset.ease ?? finalEase,
            },
            position
          );
          return;
        }

        if (revealVars && !isFadeOut) {
          tl.fromTo(
            target,
            { ...tweenFromVars, ...revealVars.from },
            {
              ...revealVars.to,
              duration,
              ease: finalEase,
            },
            position
          );
          return;
        }

        if (isFadeOut) {
          tl.to(
            target,
            {
              opacity: 0,
              duration,
              ease: finalEase,
            },
            position
          );
          return;
        }

        tl.from(
          target,
          {
            ...tweenFromVars,
            duration,
            ease: finalEase,
          },
          position
        );
      };

      if (effectiveTimelineMode !== "none" && orderedTargets.length > 1) {
        const allowLoop = timelineLoop && !isScrubMode;
        const tl = gsap.timeline({
          delay,
          repeat: allowLoop ? timelineRepeat : 0,
          yoyo: allowLoop ? timelineYoyo : false,
          repeatDelay: allowLoop ? timelineRepeatDelay : 0,
          defaults: { ease: finalEase },
          scrollTrigger: makeScrollTrigger(true),
        });

        if (effectiveTimelineMode === "cascade" || effectiveTimelineMode === "wave" || effectiveTimelineMode === "ripple") {
          const staggerConfig: gsap.StaggerVars = {
            each: timelineStaggerEach,
            from: effectiveTimelineMode === "cascade" ? "start" : "center",
          };
          if (effectiveTimelineMode === "wave") {
            staggerConfig.ease = "sine.inOut";
            if (timelineWaveAmount > 0) {
              staggerConfig.amount = timelineWaveAmount;
            }
          }

          if (revealVars && !isFadeOut) {
            tl.fromTo(
              orderedTargets,
              { ...tweenFromVars, ...revealVars.from },
              {
                ...revealVars.to,
                duration,
                ease: finalEase,
                stagger: staggerConfig,
              },
              0
            );
          } else if (isFadeOut) {
            tl.to(
              orderedTargets,
              {
                opacity: 0,
                duration,
                ease: finalEase,
                stagger: staggerConfig,
              },
              0
            );
          } else {
            tl.from(
              orderedTargets,
              {
                ...tweenFromVars,
                duration,
                ease: finalEase,
                stagger: staggerConfig,
              },
              0
            );
          }

          orderedTargets.forEach((_: HTMLElement, index: number): void => {
            const labelTime = index * timelineStaggerEach;
            tl.addLabel(`step-${index}`, labelTime);
          });
        } else {
          let cursor = 0;
          orderedTargets.forEach((target: HTMLElement, index: number): void => {
            let position = cursor;
            if (effectiveTimelineMode === "sequence") {
              position = index * (duration + timelineGap);
            } else if (effectiveTimelineMode === "overlap") {
              position = cursor;
              cursor += Math.max(0, duration - timelineOverlap);
            } else if (effectiveTimelineMode === "domino") {
              position = cursor;
              cursor += Math.max(0, duration - timelineOverlap);
            } else if (effectiveTimelineMode === "callResponse") {
              position = index * timelineGap + (index % 2 === 1 ? timelineResponseOffset : 0);
            }

            applyTimelineTween(tl, target, position);
            tl.addLabel(`step-${index}`, position);

            if (effectiveTimelineMode === "sequence") {
              cursor = position + duration + timelineGap;
            }
          });
        }
      } else {
        const allowLoop = timelineLoop && !isScrubMode;
        const tweenVars: gsap.TweenVars = {
          ...(isFadeOut ? { opacity: 0 } : tweenFromVars),
          duration,
          delay,
          ease: finalEase,
          repeat: allowLoop ? timelineRepeat : 0,
          yoyo: allowLoop ? timelineYoyo : false,
          repeatDelay: allowLoop ? timelineRepeatDelay : 0,
        };

        if (config.preset === "stagger") {
          const staggerEach = config.staggerEach ?? DEFAULT_STAGGER;
          const staggerAmount = config.staggerAmount ?? 0;
          const staggerFrom = config.staggerFrom ?? DEFAULT_STAGGER_FROM;
          tweenVars.stagger =
            staggerAmount > 0
              ? { amount: staggerAmount, from: staggerFrom }
              : { each: staggerEach, from: staggerFrom };
        }

        const scrollTrigger = makeScrollTrigger(false);
        if (keyframePreset) {
          gsap.to(orderedTargets, {
            ...keyframePreset,
            duration,
            delay,
            ease: keyframePreset.ease ?? finalEase,
            ...(scrollTrigger ? { scrollTrigger } : {}),
          });
          return;
        }

        if (revealVars && !isFadeOut) {
          gsap.fromTo(
            orderedTargets,
            { ...tweenFromVars, ...revealVars.from },
            {
              ...revealVars.to,
              duration,
              delay,
              ease: finalEase,
              ...(scrollTrigger ? { scrollTrigger } : {}),
            }
          );
        } else {
          const tweenFn = isFadeOut ? gsap.to : gsap.from;
          tweenFn(orderedTargets, {
            ...tweenVars,
            ...(scrollTrigger ? { scrollTrigger } : {}),
          });
        }
      }

      if (config.velocityEffect && config.velocityEffect !== "none") {
        if (scrollMode !== "none" || config.trigger === "scroll") {
          const velocityTrigger = ScrollTrigger.create({
            trigger: el,
            start: scrollStart,
            end: scrollEnd,
            onUpdate: (self: ScrollTrigger): void => {
              applyVelocityEffect(targetsArray, self.getVelocity(), config);
            },
            onLeave: (): void => resetVelocityEffect(targetsArray, config),
            onLeaveBack: (): void => resetVelocityEffect(targetsArray, config),
            onRefresh: (): void => resetVelocityEffect(targetsArray, config),
          });
          cleanupFns.push(() => velocityTrigger.kill());
        }
      }

      if (config.parallaxPreset && config.parallaxPreset !== "none") {
        const defaults = getParallaxDefaults(config.parallaxPreset);
        const offset = config.parallaxOffset ?? defaults.offset;
        const axis = config.parallaxAxis === "x" ? "x" : "y";
        const scrub = config.parallaxScrub ?? 0.6;
        const start = config.parallaxStart ?? "top bottom";
        const end = config.parallaxEnd ?? "bottom top";
        const scaleBase = defaults.scale ?? 1;
        const reverse = config.parallaxReverse ? -1 : 1;
        const pattern = config.parallaxPattern ?? "uniform";
        const childStep = config.parallaxChildStep ?? 16;
        const layerStrength = config.parallaxLayerStrength ?? 0.35;
        const layerScaleStep = config.parallaxLayerScaleStep ?? 0.015;
        const randomSeed = config.parallaxRandomSeed ?? 7;

        const targetsArray = gsap.utils.toArray<HTMLElement>(targets);
        if (targetsArray.length) {
          const offsetFn = (index: number): number => {
            const signedBase = offset * reverse;
            const signedStep = childStep * (signedBase >= 0 ? 1 : -1);
            switch (pattern) {
              case "alternate":
                return signedBase * (index % 2 === 0 ? 1 : -1);
              case "increment":
                return signedBase + index * signedStep;
              case "layers":
                return signedBase * (1 + index * layerStrength);
              case "random": {
                const seed = Math.sin(randomSeed * 999 + index * 78.233) * 43758.5453;
                const rand = seed - Math.floor(seed);
                const multiplier = 0.6 + rand * 0.8;
                return signedBase * multiplier;
              }
              default:
                return signedBase;
            }
          };

          const scaleFn = (index: number): number | undefined => {
            if (pattern === "layers") {
              return scaleBase + index * layerScaleStep;
            }
            return scaleBase !== 1 ? scaleBase : undefined;
          };

          const baseScale = scaleFn(0);
          const hasScale = baseScale !== undefined || pattern === "layers";
          const hasOffset = offsetFn(0) !== 0 || pattern !== "uniform";

          if (hasOffset || hasScale) {
            gsap.to(targetsArray, {
              [axis]: (i: number): number => offsetFn(i),
              ...(hasScale ? { scale: (i: number): number | undefined => scaleFn(i) } : {}),
              ease: "none",
              scrollTrigger: {
                trigger: el,
                start,
                end,
                scrub,
              },
            });
          }
        }
      }

      // Motion path
      if (config.motionPathEnabled && config.motionPathPath) {
        const path = config.motionPathPath.trim();
        if (path) {
          const motionPathBase: Record<string, unknown> = {
            path,
            align: config.motionPathAlign ? path : undefined,
            autoRotate:
              config.motionPathAutoRotate ? config.motionPathRotateOffset ?? 0 : false,
            start: config.motionPathStart ?? 0,
            end: config.motionPathEnd ?? 1,
          };

          const scrollTrigger = makeScrollTrigger(false);
          const follow = config.motionPathFollow ?? false;
          const spacing = config.motionPathSpacing ?? 0.08;

          if (follow && targetsArray.length > 1) {
            gsap.to(targetsArray, {
              motionPath: (index: number): Record<string, unknown> => ({
                ...motionPathBase,
                start: ((motionPathBase.start as number) ?? 0) + index * spacing,
                end: ((motionPathBase.end as number) ?? 1) + index * spacing,
              }),
              duration,
              ease: finalEase,
              ...(scrollTrigger ? { scrollTrigger } : {}),
            });
          } else {
            gsap.to(targetsArray, {
              // @ts-expect-error - GSAP MotionPath types
              motionPath: motionPathBase,
              duration,
              ease: finalEase,
              ...(scrollTrigger ? { scrollTrigger } : {}),
            });
          }
        }
      }

      // SVG draw
      if (config.svgDrawEnabled) {
        const selector = config.svgDrawSelector?.trim();
        const svgTargets = selector
          ? el.querySelectorAll<SVGGeometryElement>(selector)
          : el.querySelectorAll<SVGGeometryElement>("path, line, circle, rect, polyline, polygon");
        const fromPercent = config.svgDrawFrom ?? 0;
        const toPercent = config.svgDrawTo ?? 100;
        const scrollTrigger = makeScrollTrigger(false);

        svgTargets.forEach((shape: SVGGeometryElement): void => {
          if (!("getTotalLength" in shape)) return;
          const length = shape.getTotalLength();
          const fromOffset = length * (1 - fromPercent / 100);
          const toOffset = length * (1 - toPercent / 100);

          gsap.set(shape, {
            strokeDasharray: length,
            strokeDashoffset: fromOffset,
          });

          gsap.to(shape, {
            strokeDashoffset: toOffset,
            duration,
            ease: finalEase,
            ...(scrollTrigger ? { scrollTrigger } : {}),
          });
        });
      }

      // SVG morph (basic attr tween)
      if (config.svgMorphEnabled && config.svgMorphTo) {
        const selector = config.svgMorphSelector?.trim() || "path";
        const svgTargets = el.querySelectorAll<SVGPathElement>(selector);
        let morphPath = config.svgMorphTo.trim();
        if (morphPath && (morphPath.startsWith("#") || morphPath.startsWith("."))) {
          const refPath = document.querySelector<SVGPathElement>(morphPath);
          if (refPath?.getAttribute("d")) {
            morphPath = refPath.getAttribute("d") ?? morphPath;
          }
        }
        if (morphPath) {
          const scrollTrigger = makeScrollTrigger(false);
          svgTargets.forEach((shape: SVGPathElement): void => {
            gsap.to(shape, {
              attr: { d: morphPath },
              duration,
              ease: finalEase,
              ...(scrollTrigger ? { scrollTrigger } : {}),
            });
          });
        }
      }

      // Text effects
      if (config.textEffect && config.textEffect !== "none") {
        const scrollTrigger = makeScrollTrigger(false);
        const effect = config.textEffect;
        const textTargets = targetsArray.filter(
          (node: HTMLElement): node is HTMLElement => node instanceof HTMLElement
        );

        textTargets.forEach((target: HTMLElement): void => {
          if (effect === "scramble") {
            const original = target.textContent ?? "";
            const chars = config.textScrambleChars ?? "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            const tweenState = { progress: 0 };
            gsap.to(tweenState, {
              progress: 1,
              duration,
              ease: finalEase,
              ...(scrollTrigger ? { scrollTrigger } : {}),
              onUpdate: (): void => {
                const revealCount = Math.floor(tweenState.progress * original.length);
                const scrambled = original
                  .split("")
                  .map((char: string, idx: number): string => {
                    if (idx < revealCount || char === " ") return char;
                    return chars[Math.floor(Math.random() * chars.length)];
                  })
                  .join("");
                target.textContent = scrambled;
              },
              onComplete: (): void => {
                target.textContent = original;
              },
            });
            cleanupFns.push(() => {
              target.textContent = original;
            });
            return;
          }

          if (effect === "typing") {
            const original = target.textContent ?? "";
            const speed = config.textTypingSpeed ?? 24;
            const typingDuration = Math.max(0.2, original.length / speed);
            target.textContent = "";
            let cursorEl: HTMLSpanElement | null = null;
            if (config.textCursor) {
              cursorEl = document.createElement("span");
              cursorEl.textContent = "|";
              cursorEl.style.marginLeft = "2px";
              cursorEl.style.display = "inline-block";
              target.appendChild(cursorEl);
              gsap.to(cursorEl, { opacity: 0.2, repeat: -1, yoyo: true, duration: 0.4 });
            }

            const tweenState = { progress: 0 };
            gsap.to(tweenState, {
              progress: 1,
              duration: typingDuration,
              ease: "none",
              ...(scrollTrigger ? { scrollTrigger } : {}),
              onUpdate: () => {
                const count = Math.floor(tweenState.progress * original.length);
                const text = original.slice(0, count);
                if (cursorEl) {
                  cursorEl.remove();
                  target.textContent = text;
                  target.appendChild(cursorEl);
                } else {
                  target.textContent = text;
                }
              },
              onComplete: () => {
                target.textContent = original;
              },
            });
            cleanupFns.push(() => {
              target.textContent = original;
            });
            return;
          }

          if (effect === "countUp") {
            const raw = target.textContent ?? "";
            const parsed = Number.parseFloat(raw.replace(/[^0-9.-]/g, ""));
            const fromValue = config.textCountFrom ?? (Number.isNaN(parsed) ? 0 : parsed);
            const toValue = config.textCountTo ?? (Number.isNaN(parsed) ? 100 : parsed);
            const decimals = config.textCountDecimals ?? 0;
            const tweenState = { value: fromValue };

            gsap.to(tweenState, {
              value: toValue,
              duration,
              ease: finalEase,
              ...(scrollTrigger ? { scrollTrigger } : {}),
              onUpdate: () => {
                target.textContent = tweenState.value.toFixed(decimals);
              },
              onComplete: () => {
                target.textContent = toValue.toFixed(decimals);
              },
            });
            cleanupFns.push(() => {
              target.textContent = raw;
            });
            return;
          }

          const splitResult = splitTextElement(target, effect);
          if (!splitResult) return;
          const stagger = config.textStagger ?? 0.05;
          gsap.from(splitResult.targets, {
            ...tweenFromVars,
            duration,
            ease: finalEase,
            stagger,
            ...(scrollTrigger ? { scrollTrigger } : {}),
          });
          cleanupFns.push(splitResult.cleanup);
        });
      }

      // Visual effects (filters, clip-path, radius, shadow, background)
      const hasVisualEffect =
        Boolean(config.visualFilterFrom || config.visualFilterTo) ||
        Boolean(config.visualClipFrom || config.visualClipTo) ||
        Boolean(config.visualRadiusFrom || config.visualRadiusTo) ||
        Boolean(config.visualShadowFrom || config.visualShadowTo) ||
        Boolean(config.visualBackgroundFrom || config.visualBackgroundTo);

      if (hasVisualEffect) {
        const scrollTrigger = makeScrollTrigger(false);
        const fromVars: gsap.TweenVars = {};
        const toVars: gsap.TweenVars = {};

        if (config.visualFilterFrom) fromVars.filter = config.visualFilterFrom;
        if (config.visualFilterTo) toVars.filter = config.visualFilterTo;
        if (config.visualClipFrom) fromVars.clipPath = config.visualClipFrom;
        if (config.visualClipTo) toVars.clipPath = config.visualClipTo;
        if (config.visualRadiusFrom) fromVars.borderRadius = config.visualRadiusFrom;
        if (config.visualRadiusTo) toVars.borderRadius = config.visualRadiusTo;
        if (config.visualShadowFrom) fromVars.boxShadow = config.visualShadowFrom;
        if (config.visualShadowTo) toVars.boxShadow = config.visualShadowTo;
        if (config.visualBackgroundFrom) fromVars.background = config.visualBackgroundFrom;
        if (config.visualBackgroundTo) toVars.background = config.visualBackgroundTo;

        if (Object.keys(fromVars).length && Object.keys(toVars).length) {
          gsap.fromTo(
            targetsArray,
            { ...fromVars },
            {
              ...toVars,
              duration,
              ease: finalEase,
              ...(scrollTrigger ? { scrollTrigger } : {}),
            }
          );
        } else if (Object.keys(toVars).length) {
          gsap.to(targetsArray, {
            ...toVars,
            duration,
            ease: finalEase,
            ...(scrollTrigger ? { scrollTrigger } : {}),
          });
        } else if (Object.keys(fromVars).length) {
          gsap.from(targetsArray, {
            ...fromVars,
            duration,
            ease: finalEase,
            ...(scrollTrigger ? { scrollTrigger } : {}),
          });
        }
      }

      // Flip layout transitions (basic, mutation-driven)
      if (config.flipEnabled) {
        const selector = config.flipSelector?.trim();
        const flipTargets = selector
          ? Array.from(el.querySelectorAll(selector))
          : Array.from(el.children);
        if (flipTargets.length) {
          let state = Flip.getState(flipTargets);
          const observer = new MutationObserver(() => {
            Flip.from(state, {
              duration,
              ease: finalEase,
              absolute: true,
              scale: config.flipScale ?? true,
              fade: config.flipFade ?? true,
            });
            state = Flip.getState(flipTargets);
          });
          observer.observe(el, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
          });
          cleanupFns.push(() => observer.disconnect());
        }
      }

      // Draggable interactions
      if (config.draggableEnabled) {
        const velocityMap = new WeakMap<Draggable, { x: number; y: number; t: number; vx: number; vy: number }>();
        const useCarousel = config.draggableCarousel ?? false;
        const dragAxis = config.draggableType ?? "x,y";
        let dragTargets: HTMLElement[] = targetsArray;
        let dragType: string = dragAxis;
        let bounds: Draggable.Vars["bounds"];
        let snap: Draggable.Vars["snap"];

        if (useCarousel) {
          const trackSelector = config.draggableCarouselSelector?.trim();
          const track = trackSelector ? el.querySelector<HTMLElement>(trackSelector) : el;
          if (track) {
            dragTargets = [track];
            dragType = dragAxis === "y" ? "y" : "x";
                          const items = Array.from(track.children) as HTMLElement[];
                          if (items.length) {
                            const positions = items.map((item: HTMLElement): number => (dragType === "y" ? -item.offsetTop : -item.offsetLeft));
                            const min = Math.min(...positions);
            
              const max = Math.max(...positions);
              bounds = dragType === "y" ? { minY: min, maxY: max } : { minX: min, maxX: max };
              if (config.draggableCarouselSnap ?? true) {
                const snapFn = (value: number): number => {
                  let closest = positions[0];
                  let diff = Math.abs(value - closest);
                  for (let i = 1; i < positions.length; i += 1) {
                    const d = Math.abs(value - positions[i]);
                    if (d < diff) {
                      diff = d;
                      closest = positions[i];
                    }
                  }
                  return closest;
                };
                snap = dragType === "y" ? { y: snapFn } : { x: snapFn };
              }
            }
          }
        } else {
          const boundsSelector = config.draggableBounds?.trim();
          bounds = boundsSelector ? document.querySelector(boundsSelector) ?? undefined : undefined;
          if (config.draggableSnap && config.draggableSnap > 0) {
            snap = {
              x: (value: number): number => Math.round(value / config.draggableSnap!) * config.draggableSnap!,
              y: (value: number): number => Math.round(value / config.draggableSnap!) * config.draggableSnap!,
            };
          }
        }

        if (dragTargets.length) {
          const draggableInstances = Draggable.create(dragTargets, {
            type: dragType,
            bounds: bounds ?? undefined,
            inertia: false,
            // eslint-disable-next-line react-hooks/unsupported-syntax
            onPress: function (this: Draggable): void {
              const now = performance.now();
              velocityMap.set(this, {
                x: this.x,
                y: this.y,
                t: now,
                vx: 0,
                vy: 0,
              });
            },
            onDrag: function (this: Draggable): void {
              const now = performance.now();
              const state = velocityMap.get(this);
              if (!state) return;
              const dt = now - state.t;
              if (dt > 0) {
                state.vx = ((this.x - state.x) / dt) * 1000;
                state.vy = ((this.y - state.y) / dt) * 1000;
                state.x = this.x;
                state.y = this.y;
                state.t = now;
              }
              const axisVelocity = pickAxisVelocity(dragAxis, state.vx, state.vy);
              applyVelocityEffect(targetsArray, axisVelocity, config);
            },
            onDragEnd: function (this: Draggable): void {
              if (config.draggableMomentum) {
                const state = velocityMap.get(this);
                const vx = state?.vx ?? 0;
                const vy = state?.vy ?? 0;
                const factor = config.draggableMomentumFactor ?? 0.6;
                gsap.to(this.target, {
                  x: `+=${vx * factor}`,
                  y: `+=${vy * factor}`,
                  duration: 0.6,
                  ease: "power3.out",
                });
              }
              resetVelocityEffect(targetsArray, config);
            },
            snap,
          });
          cleanupFns.push((): void => {
            draggableInstances.forEach((instance: Draggable) => instance.kill());
          });
        }
      }

      // Observer-driven gestures
      if (config.observerEnabled) {
        const type = config.observerType ?? "wheel,touch";
        const axis = config.observerAxis ?? "y";
        const speed = config.observerSpeed ?? 1;
        const observerTarget = el;
        const observer = Observer.create({
          target: observerTarget,
          type,
          preventDefault: false,
          onChange: (self: Observer): void => {
            const dx = axis === "y" ? 0 : self.deltaX * speed;
            const dy = axis === "x" ? 0 : self.deltaY * speed;
            if (dx !== 0 || dy !== 0) {
              gsap.to(targetsArray, {
                x: `+=${dx}`,
                y: `+=${dy}`,
                duration: 0.2,
                ease: "power2.out",
                overwrite: "auto",
              });
            }
            const velocity = pickAxisVelocity(axis, self.velocityX, self.velocityY);
            applyVelocityEffect(targetsArray, velocity, config);
          },
          onStop: (): void => {
            resetVelocityEffect(targetsArray, config);
          },
        });
        cleanupFns.push(() => observer.kill());
      }

      // Magnet effect
      if (config.magnetEnabled) {
        const axis = config.magnetAxis ?? "x,y";
        const strength = config.magnetStrength ?? 0.35;
        const radius = config.magnetRadius ?? 140;
        const returnDuration = config.magnetReturn ?? 0.35;
        let frame: number | null = null;
        let pointer = { x: 0, y: 0 };

        const update = (): void => {
          frame = null;
          targetsArray.forEach((target: HTMLElement): void => {
            const rect = target.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = pointer.x - cx;
            const dy = pointer.y - cy;
            const dist = Math.hypot(dx, dy);
            if (dist < radius) {
              const power = (1 - dist / radius) * strength;
              const x = axis === "y" ? 0 : dx * power;
              const y = axis === "x" ? 0 : dy * power;
              gsap.to(target, {
                x,
                y,
                duration: 0.2,
                ease: "power3.out",
                overwrite: "auto",
              });
            } else {
              gsap.to(target, {
                x: 0,
                y: 0,
                duration: returnDuration,
                ease: "power3.out",
                overwrite: "auto",
              });
            }
          });
        };

        const handleMove = (event: PointerEvent): void => {
          pointer = { x: event.clientX, y: event.clientY };
          if (frame === null) {
            frame = requestAnimationFrame(update);
          }
        };

        const handleLeave = (): void => {
          targetsArray.forEach((target: HTMLElement): void => {
            gsap.to(target, {
              x: 0,
              y: 0,
              duration: returnDuration,
              ease: "power3.out",
              overwrite: "auto",
            });
          });
        };

        el.addEventListener("pointermove", handleMove);
        el.addEventListener("pointerleave", handleLeave);
        cleanupFns.push(() => {
          if (frame !== null) cancelAnimationFrame(frame);
          el.removeEventListener("pointermove", handleMove);
          el.removeEventListener("pointerleave", handleLeave);
        });
      }
          }, ref);
    
          return (): void => {
            cleanupFns.forEach((fn: () => void): void => { fn(); });
            ctx.revert();
          };
        }, [config]);
      // If no animation configured, render children directly without a wrapper div
  if (!config || config.preset === "none") {
    return <>{children}</>;
  }

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
