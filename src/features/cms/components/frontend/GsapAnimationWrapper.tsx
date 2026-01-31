"use client";

import React, { useRef, useEffect, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { GsapAnimationConfig } from "@/features/gsap";
import { getGsapFromVars } from "@/features/gsap";

gsap.registerPlugin(ScrollTrigger);

interface GsapAnimationWrapperProps {
  config?: GsapAnimationConfig;
  children: ReactNode;
  className?: string;
}

const DEFAULT_STAGGER = 0.12;

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
    const ctx = gsap.context(() => {
      const fromVars = getGsapFromVars(config.preset);
      const duration = config.duration ?? 1;
      const delay = config.delay ?? 0;
      const ease = config.easing ?? "power2.out";

      // For bounce preset, override easing
      const finalEase = config.preset === "bounce" ? "bounce.out" : ease;
      const targets = resolveTargets(el, config);
      const isFadeOut = config.preset === "fadeOut";
      const tweenVars: gsap.TweenVars = {
        ...(isFadeOut ? { opacity: 0 } : fromVars),
        duration,
        delay,
        ease: finalEase,
      };

      if (config.preset === "stagger") {
        tweenVars.stagger = DEFAULT_STAGGER;
      }

      if (config.trigger === "scroll") {
        const tweenFn = isFadeOut ? gsap.to : gsap.from;
        tweenFn(targets, {
          ...tweenVars,
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        });
      } else {
        // trigger === "load"
        const tweenFn = isFadeOut ? gsap.to : gsap.from;
        tweenFn(targets, tweenVars);
      }
    }, ref);

    return () => ctx.revert();
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
