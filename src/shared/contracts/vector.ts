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

export type VectorToolMode = z.infer<typeof vectorToolModeSchema>;

export const vectorPointSchema = z.object({
  x: z.number(),
  y: z.number(),
  pressure: z.number().optional(),
});

export type VectorPoint = z.infer<typeof vectorPointSchema>;

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

export type VectorShapeType = z.infer<typeof vectorShapeTypeSchema>;

export const vectorShapeRoleSchema = z.enum([
  'contour',
  'fill',
  'inner',
  'outer',
  'custom',
  'product',
  'shadow',
  'background',
]);
export type VectorShapeRole = z.infer<typeof vectorShapeRoleSchema>;

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

export type VectorShape = z.infer<typeof vectorShapeSchema>;

export const vectorLayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  shapes: z.array(vectorShapeSchema),
  visible: z.boolean(),
  locked: z.boolean(),
  opacity: z.number(),
});

export type VectorLayer = z.infer<typeof vectorLayerSchema>;

export const vectorDrawingSchema = dtoBaseSchema.extend({
  name: z.string(),
  width: z.number(),
  height: z.number(),
  layers: z.array(vectorLayerSchema),
  activeLayerId: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type VectorDrawing = z.infer<typeof vectorDrawingSchema>;

export const createVectorDrawingSchema = vectorDrawingSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateVectorDrawing = z.infer<typeof createVectorDrawingSchema>;
export type UpdateVectorDrawing = Partial<CreateVectorDrawing>;

export type VectorTool = VectorToolMode;

export interface VectorCanvasState {
  shapes: VectorShape[];
  selectedIds: string[];
  tool: VectorTool;
  zoom: number;
  pan: { x: number; y: number };
}

/**
 * Vector Overlay Contracts
 */
export interface VectorOverlayResult {
  shapes: VectorShape[];
  path: string;
  points: Array<{ shapeId: string; points: VectorPoint[] }>;
}

export interface VectorOverlayRequest {
  title: string;
  description?: string;
  initialShapes?: VectorShape[];
  onApply: (result: VectorOverlayResult) => void;
  onCancel?: () => void;
}

export interface VectorOverlayValue {
  vectorOverlay: VectorOverlayRequest | null;
  openVectorOverlay: (request: VectorOverlayRequest) => void;
  closeVectorOverlay: () => void;
}
