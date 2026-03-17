import type { PositiveRectBoundsDto } from '../geometry';
import type { VectorShape, VectorToolMode } from '../vector';

export type VectorCanvasViewCropRectDto = PositiveRectBoundsDto;
export type VectorCanvasViewCropRect = VectorCanvasViewCropRectDto;
export type VectorCanvasImageContentFrameDto = PositiveRectBoundsDto;
export type VectorCanvasImageContentFrame = VectorCanvasImageContentFrameDto;

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
  onViewCropRectChange?: (cropRect: VectorCanvasViewCropRect | null) => void;
  onImageContentFrameChange?: (frame: VectorCanvasImageContentFrame | null) => void;
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
