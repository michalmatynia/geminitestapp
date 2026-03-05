import { z } from 'zod';

export const point2dSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

export type Point2dDto = z.infer<typeof point2dSchema>;
export type Point2d = Point2dDto;

export const rectBoundsSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite(),
  height: z.number().finite(),
});

export type RectBoundsDto = z.infer<typeof rectBoundsSchema>;
export type RectBounds = RectBoundsDto;

export const positiveRectBoundsSchema = rectBoundsSchema.extend({
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
});

export type PositiveRectBoundsDto = z.infer<typeof positiveRectBoundsSchema>;
export type { PositiveRectBoundsDto as PositiveRectBounds };
