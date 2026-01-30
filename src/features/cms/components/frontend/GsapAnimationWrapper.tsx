"use client";

import React, { useRef, useEffect, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { GsapAnimationConfig } from "../../types/animation";

gsap.registerPlugin(ScrollTrigger);

interface GsapAnimationWrapperProps {
  config?: GsapAnimationConfig;
  children: ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Map animation preset to GSAP "from" properties
// ---------------------------------------------------------------------------

function getFromVars(preset: string): gsap.TweenVars {
  switch (preset) {
    case "fadeIn":
      return { opacity: 0 };
    case "fadeOut":
      return { opacity: 1 };
    case "slideInLeft":
      return { x: -80, opacity: 0 };
    case "slideInRight":
      return { x: 80, opacity: 0 };
    case "slideInTop":
      return { y: -60, opacity: 0 };
    case "slideInBottom":
      return { y: 60, opacity: 0 };
    case "scaleUp":
      return { scale: 0.8, opacity: 0 };
    case "scaleDown":
      return { scale: 1.2, opacity: 0 };
    case "rotate":
      return { rotation: -15, opacity: 0 };
    case "bounce":
      return { y: -40, opacity: 0 };
    case "stagger":
      return { y: 30, opacity: 0 };
    default:
      return {};
  }
}

export function GsapAnimationWrapper({ config, children, className }: GsapAnimationWrapperProps): React.ReactNode {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!config || config.preset === "none" || !ref.current) return;

    const el = ref.current;
    const fromVars = getFromVars(config.preset);
    const duration = config.duration ?? 1;
    const delay = config.delay ?? 0;
    const ease = config.easing ?? "power2.out";

    // For bounce preset, override easing
    const finalEase = config.preset === "bounce" ? "bounce.out" : ease;

    if (config.trigger === "scroll") {
      gsap.from(el, {
        ...fromVars,
        duration,
        delay,
        ease: finalEase,
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    } else {
      // trigger === "load"
      gsap.from(el, {
        ...fromVars,
        duration,
        delay,
        ease: finalEase,
      });
    }

    return (): void => {
      ScrollTrigger.getAll().forEach((st: ScrollTrigger) => {
        if (st.trigger === el) st.kill();
      });
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
