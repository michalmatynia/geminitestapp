'use client';

/**
 * This file is a barrel for all geometry animations.
 * Individual animations are now located in the `./geometry/` directory for better maintainability.
 */

export * from './animations/geometry/GeometryBasicAnimations';
export * from './animations/geometry/GeometryShapeAnimations';
export * from './animations/geometry/GeometryTransformAnimations';
export { GeometrySurface, useGeometrySurfaceIds } from './animations/geometry/GeometryAnimationSurface';
export type {
  KangurAnimationSurfaceIdsDto as GeometrySurfaceIds,
  KangurAnimationSurfacePropsDto as GeometrySurfaceProps,
} from './animations/animation-surface-contracts';
