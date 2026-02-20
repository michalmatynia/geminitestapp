import { z } from 'zod';

export const CSS_ANIMATION_EFFECTS = [
  'none',
  'fade',
  'slide-up',
  'slide-down',
  'slide-left',
  'slide-right',
  'zoom-in',
  'zoom-out',
  'flip-x',
  'flip-y',
  'bounce',
  'pulse',
] as const;

export const CSS_ANIMATION_TRIGGERS = ['none', 'load', 'scroll', 'hover', 'click'] as const;

export const CSS_ANIMATION_DIRECTIONS = ['normal', 'reverse', 'alternate', 'alternate-reverse'] as const;

export const CSS_ANIMATION_FILL_MODES = ['none', 'forwards', 'backwards', 'both'] as const;

export const CSS_EASINGS = [
  'linear',
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'step-start',
  'step-end',
] as const;

export const cssAnimationConfigSchema = z.object({
  effect: z.enum(CSS_ANIMATION_EFFECTS),
  trigger: z.enum(CSS_ANIMATION_TRIGGERS),
  duration: z.number(),
  delay: z.number(),
  easing: z.enum(CSS_EASINGS),
  direction: z.enum(CSS_ANIMATION_DIRECTIONS),
  fillMode: z.enum(CSS_ANIMATION_FILL_MODES),
  iterations: z.union([z.number(), z.literal('infinite')]),
  scrollOffset: z.number().optional(),
});

export type CssAnimationConfig = z.infer<typeof cssAnimationConfigSchema>;

export const DEFAULT_CSS_ANIMATION_CONFIG: CssAnimationConfig = {
  effect: 'none',
  trigger: 'none',
  duration: 0.4,
  delay: 0,
  easing: 'ease-out',
  direction: 'normal',
  fillMode: 'both',
  iterations: 1,
};
