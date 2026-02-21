import { z } from 'zod';

import { dtoBaseSchema } from './base';

/**
 * Vector Drawing Contracts
 */

export const vectorToolModeSchema = z.enum([
  'select',
  'path',
  'rect',
  'circle',
  'line',
  'freehand',
  'eraser',
  'polygon',
  'ellipse',
  'brush',
  'lasso',
]);

export type VectorToolModeDto = z.infer<typeof vectorToolModeSchema>;
export type VectorToolMode = VectorToolModeDto;

export const vectorPointSchema = z.object({
  x: z.number(),
  y: z.number(),
  pressure: z.number().optional(),
});

export type VectorPointDto = z.infer<typeof vectorPointSchema>;
export type VectorPoint = VectorPointDto;

export const vectorShapeTypeSchema = z.enum([
  'path',
  'rect',
  'circle',
  'line',
  'freehand',
  'text',
  'ellipse',
  'polygon',
  'lasso',
  'brush',
]);

export type VectorShapeTypeDto = z.infer<typeof vectorShapeTypeSchema>;
export type VectorShapeType = VectorShapeTypeDto;

export const vectorShapeRoleSchema = z.enum(['contour', 'fill', 'inner', 'outer', 'custom', 'product', 'shadow', 'background']);
export type VectorShapeRoleDto = z.infer<typeof vectorShapeRoleSchema>;
export type VectorShapeRole = VectorShapeRoleDto;

export const vectorShapeSchema = z.object({
  id: z.string(),
  type: vectorShapeTypeSchema,
  role: vectorShapeRoleSchema,
  points: z.array(vectorPointSchema),
  style: z.record(z.string(), z.unknown()),
  label: z.string().optional(),
  name: z.string().optional(),
  color: z.string().optional(),
  visible: z.boolean().optional(),
  closed: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type VectorShapeDto = z.infer<typeof vectorShapeSchema>;
export type VectorShape = VectorShapeDto;

export const vectorLayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  shapes: z.array(vectorShapeSchema),
  visible: z.boolean(),
  locked: z.boolean(),
  opacity: z.number(),
});

export type VectorLayerDto = z.infer<typeof vectorLayerSchema>;
export type VectorLayer = VectorLayerDto;

export const vectorDrawingSchema = dtoBaseSchema.extend({
  name: z.string(),
  width: z.number(),
  height: z.number(),
  layers: z.array(vectorLayerSchema),
  activeLayerId: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type VectorDrawingDto = z.infer<typeof vectorDrawingSchema>;
export type VectorDrawing = VectorDrawingDto;

export const createVectorDrawingSchema = vectorDrawingSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateVectorDrawingDto = z.infer<typeof createVectorDrawingSchema>;
export type UpdateVectorDrawingDto = Partial<CreateVectorDrawingDto>;

export type VectorTool = 'select' | 'pencil' | 'line' | 'rect' | 'circle' | 'text' | 'eraser' | 'polygon' | 'ellipse' | 'brush' | 'lasso';

export interface VectorCanvasState {
  shapes: VectorShape[];
  selectedIds: string[];
  tool: VectorTool;
  zoom: number;
  pan: { x: number; y: number };
}
