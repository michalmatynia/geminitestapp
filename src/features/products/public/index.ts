// Public client-safe exports for product UI and utilities.
// Export only client-safe hooks, components and small helpers here so app-layer
// code can import without pulling server-only modules.
export {
  useBaseOrderImportStatuses,
  useImportBaseOrdersMutation,
  usePreviewBaseOrdersMutation,
  useQuickImportBaseOrdersMutation,
} from '../hooks/useProductOrdersImport';
export { buildBaseOrderQuickImportFeedback } from '../utils/base-order-quick-import-feedback';
export {
  ProductImageManager,
  type ProductImageManagerController,
  ProductImageManagerControllerProvider,
} from '@/shared/ui/image-slot-manager';
export { default as ProductCard } from '../components/ProductCard';
export { ProductRouteLoadingFallback } from './ProductRouteLoadingFallback';
