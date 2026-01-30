// ---------------------------------------------------------------------------
// GSAP animation configuration types
// ---------------------------------------------------------------------------

export type AnimationPreset =
  | "none"
  | "fadeIn"
  | "fadeOut"
  | "slideInLeft"
  | "slideInRight"
  | "slideInTop"
  | "slideInBottom"
  | "scaleUp"
  | "scaleDown"
  | "rotate"
  | "bounce"
  | "stagger";

export type AnimationEasing =
  | "power1.out"
  | "power2.out"
  | "power3.out"
  | "elastic.out"
  | "bounce.out"
  | "back.out";

export type AnimationTrigger = "load" | "scroll";

export interface GsapAnimationConfig {
  preset: AnimationPreset;
  duration: number;
  delay: number;
  easing: AnimationEasing;
  trigger: AnimationTrigger;
}

export const DEFAULT_ANIMATION_CONFIG: GsapAnimationConfig = {
  preset: "none",
  duration: 1,
  delay: 0,
  easing: "power2.out",
  trigger: "load",
};

export const ANIMATION_PRESETS: { label: string; value: AnimationPreset }[] = [
  { label: "None", value: "none" },
  { label: "Fade In", value: "fadeIn" },
  { label: "Fade Out", value: "fadeOut" },
  { label: "Slide In Left", value: "slideInLeft" },
  { label: "Slide In Right", value: "slideInRight" },
  { label: "Slide In Top", value: "slideInTop" },
  { label: "Slide In Bottom", value: "slideInBottom" },
  { label: "Scale Up", value: "scaleUp" },
  { label: "Scale Down", value: "scaleDown" },
  { label: "Rotate", value: "rotate" },
  { label: "Bounce", value: "bounce" },
  { label: "Stagger (children)", value: "stagger" },
];

export const ANIMATION_EASINGS: { label: string; value: AnimationEasing }[] = [
  { label: "Power 1 (gentle)", value: "power1.out" },
  { label: "Power 2 (smooth)", value: "power2.out" },
  { label: "Power 3 (strong)", value: "power3.out" },
  { label: "Elastic", value: "elastic.out" },
  { label: "Bounce", value: "bounce.out" },
  { label: "Back (overshoot)", value: "back.out" },
];
