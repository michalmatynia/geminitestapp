// ---------------------------------------------------------------------------
// GSAP animation configuration types
// ---------------------------------------------------------------------------

export type AnimationPreset =
  | "none"
  | "fadeIn"
  | "fadeInUp"
  | "fadeInDown"
  | "fadeOut"
  | "slideInLeft"
  | "slideInRight"
  | "slideInTop"
  | "slideInBottom"
  | "scaleUp"
  | "scaleDown"
  | "zoomIn"
  | "flipY"
  | "skew"
  | "blurIn"
  | "rotate"
  | "rotateX"
  | "rotateY"
  | "popZ"
  | "cardTilt"
  | "flip3D"
  | "cube"
  | "carousel"
  | "orbit"
  | "shake"
  | "wobble"
  | "wiggle"
  | "bounce"
  | "stagger";

export type AnimationEasing =
  | "power1.out"
  | "power2.out"
  | "power3.out"
  | "power4.out"
  | "expo.out"
  | "circ.out"
  | "sine.inOut"
  | "elastic.out"
  | "elastic.out(1,0.3)"
  | "elastic.out(1,0.5)"
  | "bounce.out"
  | "back.out"
  | "back.out(1.7)"
  | "back.in(1.7)"
  | "custom";

export type AnimationTrigger = "load" | "scroll";

export type StaggerFrom = "start" | "center" | "end" | "edges" | "random";

export type ParallaxPreset = "none" | "soft" | "medium" | "strong" | "depth";
export type ParallaxAxis = "y" | "x";
export type ParallaxPattern = "uniform" | "alternate" | "increment" | "layers" | "random";

export type TextEffect =
  | "none"
  | "splitChars"
  | "splitWords"
  | "splitLines"
  | "scramble"
  | "typing"
  | "countUp";

export type DragAxis = "x" | "y" | "x,y";
export type ObserverType = "wheel,touch" | "wheel" | "touch" | "pointer" | "wheel,touch,pointer";
export type VelocityEffect = "none" | "skewX" | "skewY" | "rotation" | "scale";

export type TimelineMode =
  | "none"
  | "sequence"
  | "overlap"
  | "callResponse"
  | "cascade"
  | "wave"
  | "domino"
  | "ripple";

export type ScrollMode = "none" | "reveal" | "scrub" | "pin" | "story";

export type RevealStyle = "none" | "clipUp" | "clipDown" | "clipLeft" | "clipRight" | "mask";

export interface GsapAnimationConfig {
  preset: AnimationPreset;
  duration: number;
  delay: number;
  easing: AnimationEasing;
  trigger: AnimationTrigger;
  selector?: string;
  staggerEach?: number;
  staggerAmount?: number;
  staggerFrom?: StaggerFrom;
  parallaxPreset?: ParallaxPreset;
  parallaxAxis?: ParallaxAxis;
  parallaxOffset?: number;
  parallaxScrub?: number;
  parallaxStart?: string;
  parallaxEnd?: string;
  parallaxPattern?: ParallaxPattern;
  parallaxReverse?: boolean;
  parallaxChildStep?: number;
  parallaxLayerStrength?: number;
  parallaxLayerScaleStep?: number;
  parallaxRandomSeed?: number;
  motionPathEnabled?: boolean;
  motionPathPath?: string;
  motionPathAlign?: boolean;
  motionPathAutoRotate?: boolean;
  motionPathRotateOffset?: number;
  motionPathStart?: number;
  motionPathEnd?: number;
  motionPathFollow?: boolean;
  motionPathSpacing?: number;
  svgDrawEnabled?: boolean;
  svgDrawSelector?: string;
  svgDrawFrom?: number;
  svgDrawTo?: number;
  svgMorphEnabled?: boolean;
  svgMorphSelector?: string;
  svgMorphTo?: string;
  textEffect?: TextEffect;
  textStagger?: number;
  textScrambleChars?: string;
  textTypingSpeed?: number;
  textCursor?: boolean;
  textCountFrom?: number | undefined;
  textCountTo?: number | undefined;
  textCountDecimals?: number;
  visualFilterFrom?: string;
  visualFilterTo?: string;
  visualClipFrom?: string;
  visualClipTo?: string;
  visualRadiusFrom?: string;
  visualRadiusTo?: string;
  visualShadowFrom?: string;
  visualShadowTo?: string;
  visualBackgroundFrom?: string;
  visualBackgroundTo?: string;
  flipEnabled?: boolean;
  flipSelector?: string;
  flipScale?: boolean;
  flipFade?: boolean;
  draggableEnabled?: boolean;
  draggableType?: DragAxis;
  draggableBounds?: string;
  draggableMomentum?: boolean;
  draggableMomentumFactor?: number;
  draggableSnap?: number;
  draggableCarousel?: boolean;
  draggableCarouselSelector?: string;
  draggableCarouselSnap?: boolean;
  observerEnabled?: boolean;
  observerType?: ObserverType;
  observerAxis?: DragAxis;
  observerSpeed?: number;
  velocityEffect?: VelocityEffect;
  velocityStrength?: number;
  velocityMax?: number;
  magnetEnabled?: boolean;
  magnetStrength?: number;
  magnetRadius?: number;
  magnetAxis?: DragAxis;
  magnetReturn?: number;
  timelineMode?: TimelineMode;
  timelineGap?: number;
  timelineOverlap?: number;
  timelineResponseOffset?: number;
  timelineStaggerEach?: number;
  timelineWaveAmount?: number;
  timelineRandomize?: boolean;
  timelineLoop?: boolean;
  timelineRepeat?: number;
  timelineYoyo?: boolean;
  timelineRepeatDelay?: number;
  scrollMode?: ScrollMode;
  scrollScrub?: number;
  scrollPin?: boolean;
  scrollSnap?: boolean;
  scrollSnapDuration?: number;
  scrollStart?: string;
  scrollEnd?: string;
  revealStyle?: RevealStyle;
  customEase?: string;
}

export const DEFAULT_ANIMATION_CONFIG: GsapAnimationConfig = {
  preset: "none",
  duration: 1,
  delay: 0,
  easing: "power2.out",
  trigger: "load",
  selector: "",
  staggerEach: 0.12,
  staggerAmount: 0,
  staggerFrom: "start",
  parallaxPreset: "none",
  parallaxAxis: "y",
  parallaxOffset: 0,
  parallaxScrub: 0.6,
  parallaxStart: "top bottom",
  parallaxEnd: "bottom top",
  parallaxPattern: "uniform",
  parallaxReverse: false,
  parallaxChildStep: 16,
  parallaxLayerStrength: 0.35,
  parallaxLayerScaleStep: 0.015,
  parallaxRandomSeed: 7,
  motionPathEnabled: false,
  motionPathPath: "",
  motionPathAlign: true,
  motionPathAutoRotate: true,
  motionPathRotateOffset: 0,
  motionPathStart: 0,
  motionPathEnd: 1,
  motionPathFollow: false,
  motionPathSpacing: 0.08,
  svgDrawEnabled: false,
  svgDrawSelector: "path, line, circle, rect, polyline, polygon",
  svgDrawFrom: 0,
  svgDrawTo: 100,
  svgMorphEnabled: false,
  svgMorphSelector: "path",
  svgMorphTo: "",
  textEffect: "none",
  textStagger: 0.05,
  textScrambleChars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  textTypingSpeed: 24,
  textCursor: true,
  textCountFrom: undefined,
  textCountTo: undefined,
  textCountDecimals: 0,
  visualFilterFrom: "",
  visualFilterTo: "",
  visualClipFrom: "",
  visualClipTo: "",
  visualRadiusFrom: "",
  visualRadiusTo: "",
  visualShadowFrom: "",
  visualShadowTo: "",
  visualBackgroundFrom: "",
  visualBackgroundTo: "",
  flipEnabled: false,
  flipSelector: "",
  flipScale: true,
  flipFade: true,
  draggableEnabled: false,
  draggableType: "x,y",
  draggableBounds: "",
  draggableMomentum: false,
  draggableMomentumFactor: 0.6,
  draggableSnap: 0,
  draggableCarousel: false,
  draggableCarouselSelector: "",
  draggableCarouselSnap: true,
  observerEnabled: false,
  observerType: "wheel,touch",
  observerAxis: "y",
  observerSpeed: 1,
  velocityEffect: "none",
  velocityStrength: 0.15,
  velocityMax: 20,
  magnetEnabled: false,
  magnetStrength: 0.35,
  magnetRadius: 140,
  magnetAxis: "x,y",
  magnetReturn: 0.35,
  timelineMode: "none",
  timelineGap: 0.15,
  timelineOverlap: 0.2,
  timelineResponseOffset: 0.2,
  timelineStaggerEach: 0.12,
  timelineWaveAmount: 0.5,
  timelineRandomize: false,
  timelineLoop: false,
  timelineRepeat: -1,
  timelineYoyo: false,
  timelineRepeatDelay: 0.2,
  scrollMode: "none",
  scrollScrub: 0.6,
  scrollPin: false,
  scrollSnap: false,
  scrollSnapDuration: 0.35,
  scrollStart: "top 85%",
  scrollEnd: "bottom top",
  revealStyle: "none",
  customEase: "",
};

export const ANIMATION_PRESETS: { label: string; value: AnimationPreset }[] = [
  { label: "None", value: "none" },
  { label: "Fade In", value: "fadeIn" },
  { label: "Fade In Up", value: "fadeInUp" },
  { label: "Fade In Down", value: "fadeInDown" },
  { label: "Fade Out", value: "fadeOut" },
  { label: "Slide In Left", value: "slideInLeft" },
  { label: "Slide In Right", value: "slideInRight" },
  { label: "Slide In Top", value: "slideInTop" },
  { label: "Slide In Bottom", value: "slideInBottom" },
  { label: "Scale Up", value: "scaleUp" },
  { label: "Scale Down", value: "scaleDown" },
  { label: "Zoom In", value: "zoomIn" },
  { label: "Flip Y", value: "flipY" },
  { label: "Skew", value: "skew" },
  { label: "Blur In", value: "blurIn" },
  { label: "Rotate", value: "rotate" },
  { label: "Rotate X (3D)", value: "rotateX" },
  { label: "Rotate Y (3D)", value: "rotateY" },
  { label: "Pop Z (3D)", value: "popZ" },
  { label: "Card Tilt (3D)", value: "cardTilt" },
  { label: "Flip 3D", value: "flip3D" },
  { label: "Cube", value: "cube" },
  { label: "Carousel", value: "carousel" },
  { label: "Orbit", value: "orbit" },
  { label: "Shake", value: "shake" },
  { label: "Wobble", value: "wobble" },
  { label: "Wiggle", value: "wiggle" },
  { label: "Bounce", value: "bounce" },
  { label: "Stagger (children)", value: "stagger" },
];

export const ANIMATION_EASINGS: { label: string; value: AnimationEasing }[] = [
  { label: "Power 1 (gentle)", value: "power1.out" },
  { label: "Power 2 (smooth)", value: "power2.out" },
  { label: "Power 3 (strong)", value: "power3.out" },
  { label: "Power 4 (sharp)", value: "power4.out" },
  { label: "Expo (dramatic)", value: "expo.out" },
  { label: "Circ (rounded)", value: "circ.out" },
  { label: "Sine (soft)", value: "sine.inOut" },
  { label: "Elastic", value: "elastic.out" },
  { label: "Elastic (tight)", value: "elastic.out(1,0.3)" },
  { label: "Elastic (loose)", value: "elastic.out(1,0.5)" },
  { label: "Bounce", value: "bounce.out" },
  { label: "Back (overshoot)", value: "back.out" },
  { label: "Back (overshoot +)", value: "back.out(1.7)" },
  { label: "Back (anticipation)", value: "back.in(1.7)" },
  { label: "Custom ease", value: "custom" },
];

export const PARALLAX_PRESETS: { label: string; value: ParallaxPreset }[] = [
  { label: "None", value: "none" },
  { label: "Soft", value: "soft" },
  { label: "Medium", value: "medium" },
  { label: "Strong", value: "strong" },
  { label: "Depth", value: "depth" },
];

export const PARALLAX_PATTERNS: { label: string; value: ParallaxPattern }[] = [
  { label: "Uniform", value: "uniform" },
  { label: "Alternate", value: "alternate" },
  { label: "Increment", value: "increment" },
  { label: "Layers", value: "layers" },
  { label: "Random", value: "random" },
];

export const TIMELINE_MODES: { label: string; value: TimelineMode }[] = [
  { label: "None", value: "none" },
  { label: "Sequence", value: "sequence" },
  { label: "Overlap", value: "overlap" },
  { label: "Call & Response", value: "callResponse" },
  { label: "Cascade", value: "cascade" },
  { label: "Wave", value: "wave" },
  { label: "Domino", value: "domino" },
  { label: "Ripple", value: "ripple" },
];

export const SCROLL_MODES: { label: string; value: ScrollMode }[] = [
  { label: "None", value: "none" },
  { label: "Reveal on scroll", value: "reveal" },
  { label: "Scrub", value: "scrub" },
  { label: "Pin + Scrub", value: "pin" },
  { label: "Story (pin + snap)", value: "story" },
];

export const REVEAL_STYLES: { label: string; value: RevealStyle }[] = [
  { label: "None", value: "none" },
  { label: "Clip up", value: "clipUp" },
  { label: "Clip down", value: "clipDown" },
  { label: "Clip left", value: "clipLeft" },
  { label: "Clip right", value: "clipRight" },
  { label: "Mask", value: "mask" },
];

export const TEXT_EFFECTS: { label: string; value: TextEffect }[] = [
  { label: "None", value: "none" },
  { label: "Split characters", value: "splitChars" },
  { label: "Split words", value: "splitWords" },
  { label: "Split lines", value: "splitLines" },
  { label: "Scramble", value: "scramble" },
  { label: "Typing", value: "typing" },
  { label: "Count up", value: "countUp" },
];

export const DRAG_AXES: { label: string; value: DragAxis }[] = [
  { label: "Free (x,y)", value: "x,y" },
  { label: "Horizontal", value: "x" },
  { label: "Vertical", value: "y" },
];

export const OBSERVER_TYPES: { label: string; value: ObserverType }[] = [
  { label: "Wheel + Touch", value: "wheel,touch" },
  { label: "Wheel only", value: "wheel" },
  { label: "Touch only", value: "touch" },
  { label: "Pointer (drag)", value: "pointer" },
  { label: "All", value: "wheel,touch,pointer" },
];

export const VELOCITY_EFFECTS: { label: string; value: VelocityEffect }[] = [
  { label: "None", value: "none" },
  { label: "Skew X", value: "skewX" },
  { label: "Skew Y", value: "skewY" },
  { label: "Rotate", value: "rotation" },
  { label: "Scale", value: "scale" },
];

export const PARALLAX_DEFAULTS: Record<ParallaxPreset, { offset: number; scale?: number }> = {
  none: { offset: 0 },
  soft: { offset: 30 },
  medium: { offset: 60 },
  strong: { offset: 110 },
  depth: { offset: 80, scale: 1.04 },
};
