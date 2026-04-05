/**
 * This file is a barrel for all adding animations.
 * Individual animations are now located in the `./adding/` directory for better maintainability.
 */

export * from './adding/AddingBasicAnimations';
export * from './adding/AddingStrategyAnimations';
export { AddingSurface, useAddingSurfaceIds, LabelChip } from './adding/AddingAnimationSurface';
export type { LabelChipProps } from './adding/AddingAnimationSurface';
export type {
  KangurAnimationSurfaceIdsDto as AddingSurfaceIds,
  KangurAnimationSurfacePropsDto as AddingSurfaceProps,
} from './animation-surface-contracts';
