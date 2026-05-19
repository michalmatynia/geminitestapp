/**
 * Image Studio Feature - Public Entry Point
 *
 * This is the public client-safe entry point for the Image Studio feature.
 * All imports from @/features/ai/image-studio/ should use this public entrypoint.
 *
 * Exported members:
 * - useStudioProjects: Hook for fetching and managing image studio projects
 * - fetchStudioProjects: Query factory for project data
 * - getImageStudioSlotImageSrc: Utility for retrieving image URLs
 * - SplitVariantPreview: React component for previewing image variants
 * - CenterPreviewProvider & useCenterPreviewContext: Context for preview state management
 *
 * Example usage:
 * import { useStudioProjects, SplitVariantPreview } from '@/features/ai/image-studio/public';
 */

export { fetchStudioProjects, useStudioProjects } from './hooks/useImageStudioQueries';
export { getImageStudioSlotImageSrc } from './image-src';
export { SplitVariantPreview } from './components/center-preview/SplitVariantPreview';
export {
  CenterPreviewProvider,
  useCenterPreviewContext,
} from './components/center-preview/CenterPreviewContext';
