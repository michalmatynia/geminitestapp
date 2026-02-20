import { z } from 'zod';

/**
 * GSAP Animation DTOs
 */

export const animationPresetSchema = z.enum([
  'none',
  'fade',
  'fadeIn',
  'fadeInUp',
  'fadeInDown',
  'fadeInLeft',
  'fadeInRight',
  'slide-up',
  'slide-down',
  'slide-left',
  'slide-right',
  'zoom-in',
  'zoom-out',
  'flip-x',
  'flip-y',
  'rotate',
  'blur',
  'bounce',
  'reveal',
]);
export type AnimationPresetDto = z.infer<typeof animationPresetSchema>;
export type AnimationPreset = AnimationPresetDto;

export const animationEasingSchema = z.string();
export type AnimationEasingDto = string;
export type AnimationEasing = AnimationEasingDto;

export const animationTriggerSchema = z.enum(['load', 'hover', 'scroll', 'click', 'viewport']);
export type AnimationTriggerDto = z.infer<typeof animationTriggerSchema>;
export type AnimationTrigger = AnimationTriggerDto;

export const staggerFromSchema = z.union([
  z.enum(['start', 'center', 'end', 'edges', 'random']),
  z.number(),
]);
export type StaggerFromDto = z.infer<typeof staggerFromSchema>;
export type StaggerFrom = StaggerFromDto;

export const parallaxPresetSchema = z.enum([
  'none',
  'slow-scroll',
  'fast-scroll',
  'zoom-scroll',
  'tilt',
  'float',
  'horizontal-parallax',
  'scale-parallax',
  'blur-parallax',
  'custom',
]);
export type ParallaxPresetDto = z.infer<typeof parallaxPresetSchema>;
export type ParallaxPreset = ParallaxPresetDto;

export const parallaxAxisSchema = z.enum(['x', 'y', 'both']);
export type ParallaxAxisDto = z.infer<typeof parallaxAxisSchema>;
export type ParallaxAxis = ParallaxAxisDto;

export const parallaxPatternSchema = z.enum(['uniform', 'random', 'stepped', 'alternating']);
export type ParallaxPatternDto = z.infer<typeof parallaxPatternSchema>;
export type ParallaxPattern = ParallaxPatternDto;

export const textEffectSchema = z.enum([
  'none',
  'chars-fade',
  'chars-slide-up',
  'words-fade',
  'lines-reveal',
  'scramble',
  'typing',
  'counting',
]);
export type TextEffectDto = z.infer<typeof textEffectSchema>;
export type TextEffect = TextEffectDto;

export const dragAxisSchema = z.enum(['x', 'y', 'x,y']);
export type DragAxisDto = z.infer<typeof dragAxisSchema>;
export type DragAxis = DragAxisDto;

export const observerTypeSchema = z.string();
export type ObserverTypeDto = string;
export type ObserverType = ObserverTypeDto;

export const velocityEffectSchema = z.enum(['none', 'skew', 'scale', 'opacity', 'blur']);
export type VelocityEffectDto = z.infer<typeof velocityEffectSchema>;
export type VelocityEffect = VelocityEffectDto;

export const timelineModeSchema = z.enum(['none', 'sequence', 'parallel', 'staggered', 'wave']);
export type TimelineModeDto = z.infer<typeof timelineModeSchema>;
export type TimelineMode = TimelineModeDto;

export const scrollModeSchema = z.enum(['none', 'scrub', 'pin', 'reveal', 'horizontal-scroll']);
export type ScrollModeDto = z.infer<typeof scrollModeSchema>;
export type ScrollMode = ScrollModeDto;

export const revealStyleSchema = z.enum(['none', 'curtain', 'mask', 'clip-path', 'grayscale']);
export type RevealStyleDto = z.infer<typeof revealStyleSchema>;
export type RevealStyle = RevealStyleDto;

export const gsapAnimationConfigSchema = z.object({
  preset: animationPresetSchema,
  duration: z.number(),
  delay: z.number(),
  easing: animationEasingSchema,
  trigger: animationTriggerSchema,
  selector: z.string().optional(),
  staggerEach: z.number().optional(),
  staggerAmount: z.number().optional(),
  staggerFrom: staggerFromSchema.optional(),
  parallaxPreset: parallaxPresetSchema.optional(),
  parallaxSelector: z.string().optional(),
  parallaxAxis: parallaxAxisSchema.optional(),
  parallaxOffset: z.number().optional(),
  parallaxScrub: z.number().optional(),
  parallaxStart: z.string().optional(),
  parallaxEnd: z.string().optional(),
  parallaxEase: z.string().optional(),
  parallaxPattern: parallaxPatternSchema.optional(),
  parallaxReverse: z.boolean().optional(),
  parallaxChildStep: z.number().optional(),
  parallaxLayerStrength: z.number().optional(),
  parallaxLayerScaleStep: z.number().optional(),
  parallaxRandomSeed: z.number().optional(),
  parallaxScaleFrom: z.number().optional(),
  parallaxScaleTo: z.number().optional(),
  parallaxRotateFrom: z.number().optional(),
  parallaxRotateTo: z.number().optional(),
  parallaxOpacityFrom: z.number().optional(),
  parallaxOpacityTo: z.number().optional(),
  parallaxBlurFrom: z.number().optional(),
  parallaxBlurTo: z.number().optional(),
  motionPathEnabled: z.boolean().optional(),
  motionPathPath: z.string().optional(),
  motionPathAlign: z.boolean().optional(),
  motionPathAutoRotate: z.boolean().optional(),
  motionPathRotateOffset: z.number().optional(),
  motionPathStart: z.number().optional(),
  motionPathEnd: z.number().optional(),
  motionPathFollow: z.boolean().optional(),
  motionPathSpacing: z.number().optional(),
  motionPathShapes: z.array(z.string()).optional(),
  svgDrawEnabled: z.boolean().optional(),
  svgDrawSelector: z.string().optional(),
  svgDrawFrom: z.number().optional(),
  svgDrawTo: z.number().optional(),
  svgDrawPath: z.string().optional(),
  svgDrawShapes: z.array(z.string()).optional(),
  svgMorphEnabled: z.boolean().optional(),
  svgMorphSelector: z.string().optional(),
  svgMorphTo: z.string().optional(),
  svgMorphShapes: z.array(z.string()).optional(),
  textEffect: textEffectSchema.optional(),
  textStagger: z.number().optional(),
  textScrambleChars: z.string().optional(),
  textTypingSpeed: z.number().optional(),
  textCursor: z.boolean().optional(),
  textCountFrom: z.number().optional(),
  textCountTo: z.number().optional(),
  textCountDecimals: z.number().optional(),
  visualFilterFrom: z.string().optional(),
  visualFilterTo: z.string().optional(),
  visualClipFrom: z.string().optional(),
  visualClipTo: z.string().optional(),
  visualRadiusFrom: z.string().optional(),
  visualRadiusTo: z.string().optional(),
  visualShadowFrom: z.string().optional(),
  visualShadowTo: z.string().optional(),
  visualBackgroundFrom: z.string().optional(),
  visualBackgroundTo: z.string().optional(),
  flipEnabled: z.boolean().optional(),
  flipSelector: z.string().optional(),
  flipScale: z.boolean().optional(),
  flipFade: z.boolean().optional(),
  draggableEnabled: z.boolean().optional(),
  draggableType: z.string().optional(),
  draggableBounds: z.string().optional(),
  draggableMomentum: z.boolean().optional(),
  draggableMomentumFactor: z.number().optional(),
  draggableSnap: z.number().optional(),
  draggableCarousel: z.boolean().optional(),
  draggableCarouselSelector: z.string().optional(),
  draggableCarouselSnap: z.boolean().optional(),
  observerEnabled: z.boolean().optional(),
  observerType: observerTypeSchema.optional(),
  observerAxis: parallaxAxisSchema.optional(),
  observerSpeed: z.number().optional(),
  velocityEffect: velocityEffectSchema.optional(),
  velocityStrength: z.number().optional(),
  velocityMax: z.number().optional(),
  magnetEnabled: z.boolean().optional(),
  magnetStrength: z.number().optional(),
  magnetRadius: z.number().optional(),
  magnetAxis: z.string().optional(),
  magnetReturn: z.number().optional(),
  timelineMode: timelineModeSchema.optional(),
  timelineGap: z.number().optional(),
  timelineOverlap: z.number().optional(),
  timelineResponseOffset: z.number().optional(),
  timelineStaggerEach: z.number().optional(),
  timelineWaveAmount: z.number().optional(),
  timelineRandomize: z.boolean().optional(),
  timelineLoop: z.boolean().optional(),
  timelineRepeat: z.number().optional(),
  timelineYoyo: z.boolean().optional(),
  timelineRepeatDelay: z.number().optional(),
  scrollMode: scrollModeSchema.optional(),
  scrollScrub: z.number().optional(),
  scrollPin: z.boolean().optional(),
  scrollSnap: z.boolean().optional(),
  scrollSnapDuration: z.number().optional(),
  scrollStart: z.string().optional(),
  scrollEnd: z.string().optional(),
  revealStyle: revealStyleSchema.optional(),
  customEase: z.string().optional(),
});

export type GsapAnimationConfigDto = z.infer<typeof gsapAnimationConfigSchema>;
export type GsapAnimationConfig = GsapAnimationConfigDto;

/**
 * GSAP UI Constants
 */

export const ANIMATION_PRESETS: { label: string; value: AnimationPreset }[] = [
  { label: 'None', value: 'none' },
  { label: 'Fade In', value: 'fade' },
  { label: 'Slide Up', value: 'slide-up' },
  { label: 'Slide Down', value: 'slide-down' },
  { label: 'Slide Left', value: 'slide-left' },
  { label: 'Slide Right', value: 'slide-right' },
  { label: 'Zoom In', value: 'zoom-in' },
  { label: 'Zoom Out', value: 'zoom-out' },
  { label: 'Flip X', value: 'flip-x' },
  { label: 'Flip Y', value: 'flip-y' },
  { label: 'Rotate', value: 'rotate' },
  { label: 'Blur', value: 'blur' },
  { label: 'Bounce', value: 'bounce' },
  { label: 'Reveal', value: 'reveal' },
];

export const ANIMATION_EASINGS = [
  'power1.in', 'power1.out', 'power1.inOut',
  'power2.in', 'power2.out', 'power2.inOut',
  'power3.in', 'power3.out', 'power3.inOut',
  'power4.in', 'power4.out', 'power4.inOut',
  'back.in', 'back.out', 'back.inOut',
  'elastic.in', 'elastic.out', 'elastic.inOut',
  'bounce.in', 'bounce.out', 'bounce.inOut',
  'sine.in', 'sine.out', 'sine.inOut',
  'expo.in', 'expo.out', 'expo.inOut',
  'circ.in', 'circ.out', 'circ.inOut',
  'none', 'linear',
];

export const PARALLAX_PRESETS: { label: string; value: ParallaxPreset }[] = [
  { label: 'None', value: 'none' },
  { label: 'Slow Scroll', value: 'slow-scroll' },
  { label: 'Fast Scroll', value: 'fast-scroll' },
  { label: 'Zoom Scroll', value: 'zoom-scroll' },
  { label: 'Tilt', value: 'tilt' },
  { label: 'Float', value: 'float' },
  { label: 'Horizontal Parallax', value: 'horizontal-parallax' },
  { label: 'Scale Parallax', value: 'scale-parallax' },
  { label: 'Blur Parallax', value: 'blur-parallax' },
  { label: 'Custom', value: 'custom' },
];

export const PARALLAX_PATTERNS: { label: string; value: ParallaxPattern }[] = [
  { label: 'Uniform', value: 'uniform' },
  { label: 'Random', value: 'random' },
  { label: 'Stepped', value: 'stepped' },
  { label: 'Alternating', value: 'alternating' },
];

export const TIMELINE_MODES: { label: string; value: TimelineMode }[] = [
  { label: 'None', value: 'none' },
  { label: 'Sequence', value: 'sequence' },
  { label: 'Parallel', value: 'parallel' },
  { label: 'Staggered', value: 'staggered' },
  { label: 'Wave', value: 'wave' },
];

export const SCROLL_MODES: { label: string; value: ScrollMode }[] = [
  { label: 'None', value: 'none' },
  { label: 'Scrub', value: 'scrub' },
  { label: 'Pin', value: 'pin' },
  { label: 'Reveal', value: 'reveal' },
  { label: 'Horizontal Scroll', value: 'horizontal-scroll' },
];

export const REVEAL_STYLES: { label: string; value: RevealStyle }[] = [
  { label: 'None', value: 'none' },
  { label: 'Curtain', value: 'curtain' },
  { label: 'Mask', value: 'mask' },
  { label: 'Clip Path', value: 'clip-path' },
  { label: 'Grayscale', value: 'grayscale' },
];

export const TEXT_EFFECTS: { label: string; value: TextEffect }[] = [
  { label: 'None', value: 'none' },
  { label: 'Chars Fade', value: 'chars-fade' },
  { label: 'Chars Slide Up', value: 'chars-slide-up' },
  { label: 'Words Fade', value: 'words-fade' },
  { label: 'Lines Reveal', value: 'lines-reveal' },
  { label: 'Scramble', value: 'scramble' },
  { label: 'Typing', value: 'typing' },
  { label: 'Counting', value: 'counting' },
];

export const DRAG_AXES: { label: string; value: DragAxis }[] = [
  { label: 'X & Y', value: 'x,y' },
  { label: 'X Axis Only', value: 'x' },
  { label: 'Y Axis Only', value: 'y' },
];

export const OBSERVER_TYPES: { label: string; value: string }[] = [
  { label: 'Wheel & Touch', value: 'wheel,touch' },
  { label: 'Wheel Only', value: 'wheel' },
  { label: 'Touch Only', value: 'touch' },
  { label: 'Scroll Only', value: 'scroll' },
];

export const VELOCITY_EFFECTS: { label: string; value: VelocityEffect }[] = [
  { label: 'None', value: 'none' },
  { label: 'Skew', value: 'skew' },
  { label: 'Scale', value: 'scale' },
  { label: 'Opacity', value: 'opacity' },
  { label: 'Blur', value: 'blur' },
];

export const PARALLAX_DEFAULTS = {
  scrub: 0.6,
  start: 'top 85%',
  end: 'bottom top',
  ease: 'sine.inOut',
};

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
  parallaxStart: 'top 85%',
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
