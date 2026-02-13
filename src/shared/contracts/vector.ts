import { z } from 'zod';

/**
 * Vector Tool Modes
 */
export const vectorToolModeSchema = z.enum(['select', 'polygon', 'lasso', 'rect', 'ellipse', 'brush']);
export type VectorToolModeDto = z.infer<typeof vectorToolModeSchema>;

/**
 * Vector Point Contract
 */
export const vectorPointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export type VectorPointDto = z.infer<typeof vectorPointSchema>;

/**
 * Vector Shape Type Contract
 */
export const vectorShapeTypeSchema = z.enum(['polygon', 'lasso', 'rect', 'ellipse', 'brush']);
export type VectorShapeTypeDto = z.infer<typeof vectorShapeTypeSchema>;

/**
 * Vector Shape Role Contract
 */
export const vectorShapeRoleSchema = z.enum(['product', 'shadow', 'background', 'custom']);
export type VectorShapeRoleDto = z.infer<typeof vectorShapeRoleSchema>;

/**
 * Vector Shape Contract
 */
export const vectorShapeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: vectorShapeTypeSchema,
  points: z.array(vectorPointSchema),
  closed: z.boolean(),
  visible: z.boolean(),
  label: z.string().optional(),
  role: vectorShapeRoleSchema.optional(),
  color: z.string().optional(),
});

export type VectorShapeDto = z.infer<typeof vectorShapeSchema>;
