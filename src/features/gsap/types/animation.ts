// ---------------------------------------------------------------------------
// GSAP animation configuration types
// ---------------------------------------------------------------------------

import type { 
  AnimationPresetDto,
  AnimationEasingDto,
  AnimationTriggerDto,
  StaggerFromDto,
  ParallaxPresetDto,
  ParallaxAxisDto,
  ParallaxPatternDto,
  TextEffectDto,
  DragAxisDto,
  ObserverTypeDto,
  VelocityEffectDto,
  TimelineModeDto,
  ScrollModeDto,
  RevealStyleDto,
  GsapAnimationConfigDto
} from '@/shared/contracts/gsap';

export type AnimationPreset = AnimationPresetDto;
export type AnimationEasing = AnimationEasingDto;
export type AnimationTrigger = AnimationTriggerDto;
export type StaggerFrom = StaggerFromDto;
export type ParallaxPreset = ParallaxPresetDto;
export type ParallaxAxis = ParallaxAxisDto;
export type ParallaxPattern = ParallaxPatternDto;
export type TextEffect = TextEffectDto;
export type DragAxis = DragAxisDto;
export type ObserverType = ObserverTypeDto;
export type VelocityEffect = VelocityEffectDto;
export type TimelineMode = TimelineModeDto;
export type ScrollMode = ScrollModeDto;
export type RevealStyle = RevealStyleDto;
export type GsapAnimationConfig = GsapAnimationConfigDto;

export const DEFAULT_ANIMATION_CONFIG: GsapAnimationConfig = {
  preset: 'none',
  duration: 1,
  delay: 0,
  easing: 'power2.out',
  trigger: 'load',
  selector: '',
  staggerEach: 0.12,
  staggerAmount: 0,
  staggerFrom: 'start',
  parallaxPreset: 'none',
  parallaxSelector: '',
  parallaxAxis: 'y',
  parallaxOffset: 0,
  parallaxScrub: 0.6,
  parallaxStart: 'top bottom',
  parallaxEnd: 'bottom top',
  parallaxEase: 'sine.inOut',
  parallaxPattern: 'uniform',
  parallaxReverse: false,
  parallaxChildStep: 16,
  parallaxLayerStrength: 0.35,
  parallaxLayerScaleStep: 0.015,
  parallaxRandomSeed: 7,
  parallaxScaleFrom: 1,
  parallaxScaleTo: 1,
  parallaxRotateFrom: 0,
  parallaxRotateTo: 0,
  parallaxOpacityFrom: 1,
  parallaxOpacityTo: 1,
  parallaxBlurFrom: 0,
  parallaxBlurTo: 0,
  motionPathEnabled: false,
  motionPathPath: '',
  motionPathAlign: true,
  motionPathAutoRotate: true,
  motionPathRotateOffset: 0,
  motionPathStart: 0,
  motionPathEnd: 1,
  motionPathFollow: false,
  motionPathSpacing: 0.08,
  motionPathShapes: [],
  svgDrawEnabled: false,
  svgDrawSelector: 'path, line, circle, rect, polyline, polygon',
  svgDrawFrom: 0,
  svgDrawTo: 100,
  svgDrawPath: '',
  svgDrawShapes: [],
  svgMorphEnabled: false,
  svgMorphSelector: 'path',
  svgMorphTo: '',
  svgMorphShapes: [],
  textEffect: 'none',
  textStagger: 0.05,
  textScrambleChars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  textTypingSpeed: 24,
  textCursor: true,
  textCountFrom: undefined,
  textCountTo: undefined,
  textCountDecimals: 0,
  visualFilterFrom: '',
  visualFilterTo: '',
  visualClipFrom: '',
  visualClipTo: '',
  visualRadiusFrom: '',
  visualRadiusTo: '',
  visualShadowFrom: '',
  visualShadowTo: '',
  visualBackgroundFrom: '',
  visualBackgroundTo: '',
  flipEnabled: false,
  flipSelector: '',
  flipScale: true,
  flipFade: true,
  draggableEnabled: false,
  draggableType: 'x,y',
  draggableBounds: '',
  draggableMomentum: false,
  draggableMomentumFactor: 0.6,
  draggableSnap: 0,
  draggableCarousel: false,
  draggableCarouselSelector: '',
  draggableCarouselSnap: true,
  observerEnabled: false,
  observerType: 'wheel,touch',
  observerAxis: 'y',
  observerSpeed: 1,
  velocityEffect: 'none',
  velocityStrength: 0.15,
  velocityMax: 20,
  magnetEnabled: false,
  magnetStrength: 0.35,
  magnetRadius: 140,
  magnetAxis: 'x,y',
  magnetReturn: 0.35,
  timelineMode: 'none',
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
  scrollMode: 'none',
  scrollScrub: 0.6,
  scrollPin: false,
  scrollSnap: false,
  scrollSnapDuration: 0.35,
  scrollStart: 'top 85%',
  scrollEnd: 'bottom top',
  revealStyle: 'none',
  customEase: '',
};

export const ANIMATION_PRESETS: { label: string; value: AnimationPreset }[] = [
  { label: 'None', value: 'none' },
  { label: 'Fade In', value: 'fadeIn' },
  { label: 'Fade In Up', value: 'fadeInUp' },
  { label: 'Fade In Down', value: 'fadeInDown' },
  { label: 'Fade Out', value: 'fadeOut' },
  { label: 'Slide In Left', value: 'slideInLeft' },
  { label: 'Slide In Right', value: 'slideInRight' },
  { label: 'Slide In Top', value: 'slideInTop' },
  { label: 'Slide In Bottom', value: 'slideInBottom' },
  { label: 'Scale Up', value: 'scaleUp' },
  { label: 'Scale Down', value: 'scaleDown' },
  { label: 'Zoom In', value: 'zoomIn' },
  { label: 'Flip Y', value: 'flipY' },
  { label: 'Skew', value: 'skew' },
  { label: 'Blur In', value: 'blurIn' },
  { label: 'Rotate', value: 'rotate' },
  { label: 'Rotate X (3D)', value: 'rotateX' },
  { label: 'Rotate Y (3D)', value: 'rotateY' },
  { label: 'Pop Z (3D)', value: 'popZ' },
  { label: 'Card Tilt (3D)', value: 'cardTilt' },
  { label: 'Flip 3D', value: 'flip3D' },
  { label: 'Cube', value: 'cube' },
  { label: 'Carousel', value: 'carousel' },
  { label: 'Orbit', value: 'orbit' },
  { label: 'Shake', value: 'shake' },
  { label: 'Wobble', value: 'wobble' },
  { label: 'Wiggle', value: 'wiggle' },
  { label: 'Bounce', value: 'bounce' },
  { label: 'Stagger (children)', value: 'stagger' },
];

export const ANIMATION_EASINGS: { label: string; value: AnimationEasing }[] = [
  { label: 'Power 1 (gentle)', value: 'power1.out' },
  { label: 'Power 2 (smooth)', value: 'power2.out' },
  { label: 'Power 3 (strong)', value: 'power3.out' },
  { label: 'Power 4 (sharp)', value: 'power4.out' },
  { label: 'Expo (dramatic)', value: 'expo.out' },
  { label: 'Circ (rounded)', value: 'circ.out' },
  { label: 'Sine (soft)', value: 'sine.inOut' },
  { label: 'Elastic', value: 'elastic.out' },
  { label: 'Elastic (tight)', value: 'elastic.out(1,0.3)' },
  { label: 'Elastic (loose)', value: 'elastic.out(1,0.5)' },
  { label: 'Bounce', value: 'bounce.out' },
  { label: 'Back (overshoot)', value: 'back.out' },
  { label: 'Back (overshoot +)', value: 'back.out(1.7)' },
  { label: 'Back (anticipation)', value: 'back.in(1.7)' },
  { label: 'Custom ease', value: 'custom' },
];

export const PARALLAX_PRESETS: { label: string; value: ParallaxPreset }[] = [
  { label: 'None', value: 'none' },
  { label: 'Soft', value: 'soft' },
  { label: 'Medium', value: 'medium' },
  { label: 'Strong', value: 'strong' },
  { label: 'Depth', value: 'depth' },
];

export const PARALLAX_PATTERNS: { label: string; value: ParallaxPattern }[] = [
  { label: 'Uniform', value: 'uniform' },
  { label: 'Alternate', value: 'alternate' },
  { label: 'Increment', value: 'increment' },
  { label: 'Layers', value: 'layers' },
  { label: 'Random', value: 'random' },
];

export const TIMELINE_MODES: { label: string; value: TimelineMode }[] = [
  { label: 'None', value: 'none' },
  { label: 'Sequence', value: 'sequence' },
  { label: 'Overlap', value: 'overlap' },
  { label: 'Call & Response', value: 'callResponse' },
  { label: 'Cascade', value: 'cascade' },
  { label: 'Wave', value: 'wave' },
  { label: 'Domino', value: 'domino' },
  { label: 'Ripple', value: 'ripple' },
];

export const SCROLL_MODES: { label: string; value: ScrollMode }[] = [
  { label: 'None', value: 'none' },
  { label: 'Reveal on scroll', value: 'reveal' },
  { label: 'Scrub', value: 'scrub' },
  { label: 'Pin + Scrub', value: 'pin' },
  { label: 'Story (pin + snap)', value: 'story' },
];

export const REVEAL_STYLES: { label: string; value: RevealStyle }[] = [
  { label: 'None', value: 'none' },
  { label: 'Clip up', value: 'clipUp' },
  { label: 'Clip down', value: 'clipDown' },
  { label: 'Clip left', value: 'clipLeft' },
  { label: 'Clip right', value: 'clipRight' },
  { label: 'Mask', value: 'mask' },
];

export const TEXT_EFFECTS: { label: string; value: TextEffect }[] = [
  { label: 'None', value: 'none' },
  { label: 'Split characters', value: 'splitChars' },
  { label: 'Split words', value: 'splitWords' },
  { label: 'Split lines', value: 'splitLines' },
  { label: 'Scramble', value: 'scramble' },
  { label: 'Typing', value: 'typing' },
  { label: 'Count up', value: 'countUp' },
];

export const DRAG_AXES: { label: string; value: DragAxis }[] = [
  { label: 'Free (x,y)', value: 'x,y' },
  { label: 'Horizontal', value: 'x' },
  { label: 'Vertical', value: 'y' },
];

export const OBSERVER_TYPES: { label: string; value: ObserverType }[] = [
  { label: 'Wheel + Touch', value: 'wheel,touch' },
  { label: 'Wheel only', value: 'wheel' },
  { label: 'Touch only', value: 'touch' },
  { label: 'Pointer (drag)', value: 'pointer' },
  { label: 'All', value: 'wheel,touch,pointer' },
];

export const VELOCITY_EFFECTS: { label: string; value: VelocityEffect }[] = [
  { label: 'None', value: 'none' },
  { label: 'Skew X', value: 'skewX' },
  { label: 'Skew Y', value: 'skewY' },
  { label: 'Rotate', value: 'rotation' },
  { label: 'Scale', value: 'scale' },
];

export const PARALLAX_DEFAULTS: Record<ParallaxPreset, { offset: number; scale?: number }> = {
  none: { offset: 0 },
  soft: { offset: 30 },
  medium: { offset: 60 },
  strong: { offset: 110 },
  depth: { offset: 80, scale: 1.04 },
};
