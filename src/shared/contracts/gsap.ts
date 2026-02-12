import { z } from 'zod';

import { namedDtoSchema } from './base';

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
