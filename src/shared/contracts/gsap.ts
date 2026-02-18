import { z } from 'zod';

import { namedDtoSchema } from './base';
import { vectorShapeSchema } from './vector';

/**
 * GSAP Animation Enums
 */

export const animationPresetSchema = z.enum([
  'none',
  'fadeIn',
  'fadeInUp',
  'fadeInDown',
  'fadeOut',
  'slideInLeft',
  'slideInRight',
  'slideInTop',
  'slideInBottom',
  'scaleUp',
  'scaleDown',
  'zoomIn',
  'flipY',
  'skew',
  'blurIn',
  'rotate',
  'rotateX',
  'rotateY',
  'popZ',
  'cardTilt',
  'flip3D',
  'cube',
  'carousel',
  'orbit',
  'shake',
  'wobble',
  'wiggle',
  'bounce',
  'stagger',
]);
export type AnimationPresetDto = z.infer<typeof animationPresetSchema>;

export const animationEasingSchema = z.enum([
  'power1.out',
  'power2.out',
  'power3.out',
  'power4.out',
  'expo.out',
  'circ.out',
  'sine.inOut',
  'elastic.out',
  'elastic.out(1,0.3)',
  'elastic.out(1,0.5)',
  'bounce.out',
  'back.out',
  'back.out(1.7)',
  'back.in(1.7)',
  'custom',
]);
export type AnimationEasingDto = z.infer<typeof animationEasingSchema>;

export const animationTriggerSchema = z.enum(['load', 'scroll']);
export type AnimationTriggerDto = z.infer<typeof animationTriggerSchema>;

export const staggerFromSchema = z.enum(['start', 'center', 'end', 'edges', 'random']);
export type StaggerFromDto = z.infer<typeof staggerFromSchema>;

export const parallaxPresetSchema = z.enum(['none', 'soft', 'medium', 'strong', 'depth']);
export type ParallaxPresetDto = z.infer<typeof parallaxPresetSchema>;

export const parallaxAxisSchema = z.enum(['y', 'x']);
export type ParallaxAxisDto = z.infer<typeof parallaxAxisSchema>;

export const parallaxPatternSchema = z.enum(['uniform', 'alternate', 'increment', 'layers', 'random']);
export type ParallaxPatternDto = z.infer<typeof parallaxPatternSchema>;

export const textEffectSchema = z.enum([
  'none',
  'splitChars',
  'splitWords',
  'splitLines',
  'scramble',
  'typing',
  'countUp',
]);
export type TextEffectDto = z.infer<typeof textEffectSchema>;

export const dragAxisSchema = z.enum(['x', 'y', 'x,y']);
export type DragAxisDto = z.infer<typeof dragAxisSchema>;

export const observerTypeSchema = z.enum([
  'wheel,touch',
  'wheel',
  'touch',
  'pointer',
  'wheel,touch,pointer',
]);
export type ObserverTypeDto = z.infer<typeof observerTypeSchema>;

export const velocityEffectSchema = z.enum(['none', 'skewX', 'skewY', 'rotation', 'scale']);
export type VelocityEffectDto = z.infer<typeof velocityEffectSchema>;

export const timelineModeSchema = z.enum([
  'none',
  'sequence',
  'overlap',
  'callResponse',
  'cascade',
  'wave',
  'domino',
  'ripple',
]);
export type TimelineModeDto = z.infer<typeof timelineModeSchema>;

export const scrollModeSchema = z.enum(['none', 'reveal', 'scrub', 'pin', 'story']);
export type ScrollModeDto = z.infer<typeof scrollModeSchema>;

export const revealStyleSchema = z.enum([
  'none',
  'clipUp',
  'clipDown',
  'clipLeft',
  'clipRight',
  'mask',
]);
export type RevealStyleDto = z.infer<typeof revealStyleSchema>;

/**
 * GSAP Animation Config Contract
 */

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
  parallaxEase: animationEasingSchema.optional(),
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
  motionPathShapes: z.array(vectorShapeSchema).optional(),
  svgDrawEnabled: z.boolean().optional(),
  svgDrawSelector: z.string().optional(),
  svgDrawFrom: z.number().optional(),
  svgDrawTo: z.number().optional(),
  svgDrawPath: z.string().optional(),
  svgDrawShapes: z.array(vectorShapeSchema).optional(),
  svgMorphEnabled: z.boolean().optional(),
  svgMorphSelector: z.string().optional(),
  svgMorphTo: z.string().optional(),
  svgMorphShapes: z.array(vectorShapeSchema).optional(),
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
  draggableType: dragAxisSchema.optional(),
  draggableBounds: z.string().optional(),
  draggableMomentum: z.boolean().optional(),
  draggableMomentumFactor: z.number().optional(),
  draggableSnap: z.number().optional(),
  draggableCarousel: z.boolean().optional(),
  draggableCarouselSelector: z.string().optional(),
  draggableCarouselSnap: z.boolean().optional(),
  observerEnabled: z.boolean().optional(),
  observerType: observerTypeSchema.optional(),
  observerAxis: dragAxisSchema.optional(),
  observerSpeed: z.number().optional(),
  velocityEffect: velocityEffectSchema.optional(),
  velocityStrength: z.number().optional(),
  velocityMax: z.number().optional(),
  magnetEnabled: z.boolean().optional(),
  magnetStrength: z.number().optional(),
  magnetRadius: z.number().optional(),
  magnetAxis: dragAxisSchema.optional(),
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

/**
 * GSAP Animation DTOs
 */

export const animationSchema = namedDtoSchema.extend({
  config: z.record(z.string(), z.unknown()),
  duration: z.number(),
  easing: z.string(),
  targets: z.array(z.string()),
  properties: z.record(z.string(), z.unknown()),
});

export type AnimationDto = z.infer<typeof animationSchema>;

export const createAnimationSchema = animationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAnimationDto = z.infer<typeof createAnimationSchema>;
export type UpdateAnimationDto = Partial<CreateAnimationDto>;

export const animationTimelineSchema = namedDtoSchema.extend({
  animations: z.array(animationSchema),
  totalDuration: z.number(),
  repeat: z.number(),
  yoyo: z.boolean(),
});

export type AnimationTimelineDto = z.infer<typeof animationTimelineSchema>;

export const createAnimationTimelineSchema = animationTimelineSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAnimationTimelineDto = z.infer<typeof createAnimationTimelineSchema>;
export type UpdateAnimationTimelineDto = Partial<CreateAnimationTimelineDto>;
