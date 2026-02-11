export type VectorToolMode = 'select' | 'polygon' | 'lasso' | 'rect' | 'ellipse' | 'brush';
export type VectorPoint = { x: number; y: number }; // normalized 0..1
export type VectorShapeType = 'polygon' | 'lasso' | 'rect' | 'ellipse' | 'brush';

export type VectorShapeRole = 'product' | 'shadow' | 'background' | 'custom';

export type VectorShape = {
  id: string;
  name: string;
  type: VectorShapeType;
  points: VectorPoint[];
  closed: boolean;
  visible: boolean;
  label?: string | undefined;
  role?: VectorShapeRole | undefined;
  color?: string | undefined;
};
