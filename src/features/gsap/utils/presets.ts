import { gsap } from "gsap";
import type { AnimationPreset } from "../types/animation";

export function getGsapFromVars(preset: AnimationPreset): gsap.TweenVars {
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
