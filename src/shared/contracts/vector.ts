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

/**
 * Vector Layer Contract
 */
export const vectorLayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  visible: z.boolean(),
  locked: z.boolean(),
  shapes: z.array(vectorShapeSchema),
  opacity: z.number().optional(),
});

export type VectorLayerDto = z.infer<typeof vectorLayerSchema>;

/**
 * Vector Drawing Contract
 */
export const vectorDrawingSchema = z.object({
  width: z.number(),
  height: z.number(),
  layers: z.array(vectorLayerSchema),
  activeLayerId: z.string().nullable(),
});

export type VectorDrawingDto = z.infer<typeof vectorDrawingSchema>;
