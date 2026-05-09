/**
 * Products Feature - Public Sub-Entry Point
 *
 * This is a public client-safe entry point for product UI components and utilities.
 * These are the only members intended for consumption outside the feature.
 */

/**
 * Hooks for managing base order import statuses and mutations
 */
export {
  useBaseOrderImportStatuses,
  useImportBaseOrdersMutation,
  usePreviewBaseOrdersMutation,
  useQuickImportBaseOrdersMutation,
} from '../hooks/useProductOrdersImport';

/**
 * Utility to build feedback messages for quick order imports
 */
export { buildBaseOrderQuickImportFeedback } from '../utils/base-order-quick-import-feedback';

/**
 * Product image management components and controllers
 */
export {
  ProductImageManager,
  type ProductImageManagerController,
  ProductImageManagerControllerProvider,
} from '@/shared/ui/image-slot-manager';

/**
 * Product card component for displaying product summaries
 */
export { default as ProductCard } from '../components/ProductCard';

/**
 * Loading fallback component for product-related routes
 */
export { ProductRouteLoadingFallback } from './ProductRouteLoadingFallback';
