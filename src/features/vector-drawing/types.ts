import type { VectorShapeDto, VectorPointDto } from '@/shared/contracts/vector-drawing';

export type VectorShape = VectorShapeDto;
export type VectorPoint = VectorPointDto;

export type VectorTool = 'select' | 'pencil' | 'line' | 'rect' | 'circle' | 'text' | 'eraser';

export interface VectorCanvasState {
  shapes: VectorShape[];
  selectedIds: string[];
  tool: VectorTool;
  zoom: number;
  pan: { x: number; y: number };
}
