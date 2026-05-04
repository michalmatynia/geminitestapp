/**
 * Image Routing Utilities
 * 
 * Re-export of image routing utilities for product images.
 * Provides:
 * - Product image URL resolution
 * - External base URL normalization
 * - Image routing abstraction
 * - Centralized image URL handling
 * - Cross-feature image utilities
 */

export {
  normalizeProductImageExternalBaseUrl,
  resolveProductImageUrl,
} from '@/shared/lib/products/utils/image-routing';
