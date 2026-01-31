"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { cn } from "@/shared/utils";
import type { AnimationPreset } from "../types/animation";

interface AnimationPreviewIconProps {
  preset: AnimationPreset;
  active?: boolean;
  className?: string;
}

function getPreviewVars(preset: AnimationPreset): { from: gsap.TweenVars; to: gsap.TweenVars } {
  const baseTo: gsap.TweenVars = { duration: 0.8, ease: "power2.out" };

  switch (preset) {
    case "fadeIn":
      return { from: { opacity: 0 }, to: { opacity: 1, ...baseTo } };
    case "fadeOut":
      return { from: { opacity: 1 }, to: { opacity: 0, ...baseTo } };
    case "slideInLeft":
      return { from: { x: -8, opacity: 0 }, to: { x: 0, opacity: 1, ...baseTo } };
    case "slideInRight":
      return { from: { x: 8, opacity: 0 }, to: { x: 0, opacity: 1, ...baseTo } };
    case "slideInTop":
      return { from: { y: -6, opacity: 0 }, to: { y: 0, opacity: 1, ...baseTo } };
    case "slideInBottom":
      return { from: { y: 6, opacity: 0 }, to: { y: 0, opacity: 1, ...baseTo } };
    case "scaleUp":
      return { from: { scale: 0.7, opacity: 0 }, to: { scale: 1, opacity: 1, ...baseTo } };
    case "scaleDown":
      return { from: { scale: 1.3, opacity: 0 }, to: { scale: 1, opacity: 1, ...baseTo } };
    case "rotate":
      return { from: { rotation: -20, opacity: 0 }, to: { rotation: 0, opacity: 1, ...baseTo } };
    case "bounce":
      return { from: { y: -8, opacity: 0 }, to: { y: 0, opacity: 1, duration: 0.7, ease: "bounce.out" } };
    default:
      return { from: {}, to: baseTo };
  }
}

export function AnimationPreviewIcon({ preset, active = false, className }: AnimationPreviewIconProps): React.ReactNode {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const dots = root.querySelectorAll<HTMLElement>("[data-dot]");
      if (!dots.length) return;

      gsap.set(dots, { x: 0, y: 0, opacity: 1, scale: 1, rotation: 0 });

      if (!active || preset === "none") return;

      if (preset === "stagger") {
        gsap.fromTo(
          dots,
          { y: 6, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: "power2.out",
            stagger: 0.12,
            repeat: -1,
            yoyo: true,
            repeatDelay: 0.2,
          }
        );
        return;
      }

      const { from, to } = getPreviewVars(preset);
      gsap.fromTo(dots[0], from, {
        ...to,
        repeat: -1,
        yoyo: true,
        repeatDelay: 0.25,
      });
    }, root);

    return () => ctx.revert();
  }, [active, preset]);

  const isStagger = preset === "stagger";

  return (
    <div
      ref={ref}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md border border-border/40 bg-gray-900/50",
        className
      )}
    >
      {isStagger ? (
        <div className="flex items-center gap-1">
          <span data-dot className="size-1.5 rounded-full bg-sky-200" />
          <span data-dot className="size-1.5 rounded-full bg-sky-200" />
          <span data-dot className="size-1.5 rounded-full bg-sky-200" />
        </div>
      ) : (
        <span data-dot className="size-2 rounded-full bg-sky-200" />
      )}
    </div>
  );
}
