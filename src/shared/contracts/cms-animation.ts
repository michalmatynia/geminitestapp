import { z } from 'zod';

export const cssAnimationEffectSchema = z.enum([
  'none',
  'fade',
  'fade-up',
  'fade-down',
  'fade-left',
  'fade-right',
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
  'pop',
  'pulse',
  'float',
  'shake',
  'wobble',
  'glow',
  'bounce',
  'reveal',
]);
export type CssAnimationEffect = z.infer<typeof cssAnimationEffectSchema>;

export const cssAnimationTriggerSchema = z.enum([
  'load',
  'hover',
  'inView',
  'none',
  'scroll',
  'click',
  'viewport',
]);
export type CssAnimationTrigger = z.infer<typeof cssAnimationTriggerSchema>;

export const cssAnimationDirectionSchema = z.enum([
  'normal',
  'reverse',
  'alternate',
  'alternate-reverse',
]);
export type CssAnimationDirection = z.infer<typeof cssAnimationDirectionSchema>;

export const cssAnimationFillModeSchema = z.enum(['none', 'forwards', 'backwards', 'both']);
export type CssAnimationFillMode = z.infer<typeof cssAnimationFillModeSchema>;

export const cssAnimationConfigSchema = z.object({
  enabled: z.boolean().optional(),
  effect: cssAnimationEffectSchema.optional(),
  trigger: cssAnimationTriggerSchema.optional(),
  duration: z.number().optional(),
  delay: z.number().optional(),
  easing: z.string().optional(),
  iterations: z.union([z.number(), z.literal('infinite')]).optional(),
  loop: z.boolean().optional(),
  direction: cssAnimationDirectionSchema.optional(),
  fillMode: cssAnimationFillModeSchema.optional(),
  distance: z.number().optional(),
  scale: z.number().optional(),
  rotate: z.number().optional(),
  blur: z.number().optional(),
  replayOnExit: z.boolean().optional(),
  scrollOffset: z.number().optional(),
});

export type CssAnimationConfig = z.infer<typeof cssAnimationConfigSchema>;

export const DEFAULT_CSS_ANIMATION_CONFIG: CssAnimationConfig = {
  enabled: false,
  effect: 'fade-up',
  trigger: 'load',
  duration: 700,
  delay: 0,
  easing: 'ease-out',
  iterations: 1,
  loop: false,
  direction: 'normal',
  fillMode: 'both',
  distance: 40,
  scale: 0.9,
  rotate: 12,
  blur: 6,
  replayOnExit: false,
};

export const CSS_ANIMATION_EFFECTS: { label: string; value: CssAnimationEffect }[] = [
  { label: 'None', value: 'none' },
  { label: 'Fade', value: 'fade' },
  { label: 'Fade Up', value: 'fade-up' },
  { label: 'Fade Down', value: 'fade-down' },
  { label: 'Fade Left', value: 'fade-left' },
  { label: 'Fade Right', value: 'fade-right' },
  { label: 'Slide Up', value: 'slide-up' },
  { label: 'Slide Down', value: 'slide-down' },
  { label: 'Slide Left', value: 'slide-left' },
  { label: 'Slide Right', value: 'slide-right' },
  { label: 'Zoom In', value: 'zoom-in' },
  { label: 'Zoom Out', value: 'zoom-out' },
  { label: 'Flip X', value: 'flip-x' },
  { label: 'Flip Y', value: 'flip-y' },
  { label: 'Rotate', value: 'rotate' },
  { label: 'Blur In', value: 'blur' },
  { label: 'Pop', value: 'pop' },
  { label: 'Pulse', value: 'pulse' },
  { label: 'Float', value: 'float' },
  { label: 'Shake', value: 'shake' },
  { label: 'Wobble', value: 'wobble' },
  { label: 'Glow', value: 'glow' },
  { label: 'Bounce', value: 'bounce' },
  { label: 'Reveal', value: 'reveal' },
];

export const CSS_ANIMATION_TRIGGERS: { label: string; value: CssAnimationTrigger }[] = [
  { label: 'None', value: 'none' },
  { label: 'On load', value: 'load' },
  { label: 'On hover', value: 'hover' },
  { label: 'On scroll into view', value: 'inView' },
  { label: 'On scroll', value: 'scroll' },
  { label: 'On click', value: 'click' },
  { label: 'In viewport', value: 'viewport' },
];

export const CSS_ANIMATION_DIRECTIONS: { label: string; value: CssAnimationDirection }[] = [
  { label: 'Normal', value: 'normal' },
  { label: 'Reverse', value: 'reverse' },
  { label: 'Alternate', value: 'alternate' },
  { label: 'Alternate reverse', value: 'alternate-reverse' },
];

export const CSS_ANIMATION_FILL_MODES: { label: string; value: CssAnimationFillMode }[] = [
  { label: 'None', value: 'none' },
  { label: 'Forwards', value: 'forwards' },
  { label: 'Backwards', value: 'backwards' },
  { label: 'Both', value: 'both' },
];

export const CSS_EASINGS: { label: string; value: string }[] = [
  { label: 'Ease', value: 'ease' },
  { label: 'Ease in', value: 'ease-in' },
  { label: 'Ease out', value: 'ease-out' },
  { label: 'Ease in out', value: 'ease-in-out' },
  { label: 'Linear', value: 'linear' },
  { label: 'Step start', value: 'step-start' },
  { label: 'Step end', value: 'step-end' },
  { label: 'Cubic (soft)', value: 'cubic-bezier(0.22, 0.61, 0.36, 1)' },
  { label: 'Cubic (snappy)', value: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
  { label: 'Cubic (overshoot)', value: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  { label: 'Custom', value: 'custom' },
];
