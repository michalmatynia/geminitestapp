import type { PositiveRectBoundsDto } from '../geometry';
import type { VectorShape, VectorToolMode } from '../vector';

export type VectorCanvasRectDto = PositiveRectBoundsDto;
export type VectorCanvasRect = VectorCanvasRectDto;

export type VectorCanvasPropsDto = {
  src?: string | null;
  tool?: VectorToolMode;
  selectionEnabled?: boolean;
  shapes?: VectorShape[];
  activeShapeId?: string | null;
  selectedPointIndex?: number | null;
  onChange?: (nextShapes: VectorShape[]) => void;
  onSelectShape?: (id: string | null) => void;
  onSelectPoint?: (index: number | null) => void;
  brushRadius?: number;
  allowWithoutImage?: boolean;
  showEmptyState?: boolean;
  emptyStateLabel?: string;
  maskPreviewEnabled?: boolean;
  maskPreviewShapes?: VectorShape[];
  maskPreviewInvert?: boolean;
  maskPreviewOpacity?: number;
  maskPreviewFeather?: number;
  showCenterGuides?: boolean;
  enableTwoFingerRotate?: boolean;
  baseCanvasWidthPx?: number | null;
  baseCanvasHeightPx?: number | null;
  onViewCropRectChange?: (cropRect: VectorCanvasRect | null) => void;
  onImageContentFrameChange?: (frame: VectorCanvasRect | null) => void;
  showCanvasGrid?: boolean;
  imageMoveEnabled?: boolean;
  imageOffset?: { x: number; y: number };
  onImageOffsetChange?: (offset: { x: number; y: number }) => void;
  backgroundLayerEnabled?: boolean;
  backgroundColor?: string;
  className?: string;
};
export type VectorCanvasProps = VectorCanvasPropsDto;

export type VectorViewTransformDto = {
  scale: number;
  panX: number;
  panY: number;
  rotateDeg: number;
};
export type VectorViewTransform = VectorViewTransformDto;
