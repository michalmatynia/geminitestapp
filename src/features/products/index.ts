/**
 * Products Feature - Public Entry Point
 *
 * This is the public client-safe entry point for the products feature.
 * These are the only members intended for consumption outside the feature.
 */

/** Re-exports public admin pages for products */
export * from './admin-pages.public';

/** Re-exports public product forms and validation schemas */
export * from './forms.public';

/** Re-exports public validator settings for products */
export * from './validator-settings.public';

/**
 * Product listing column utilities and constants
 */
export {
  SUCCESS_STATUSES,
  normalizeMarketplaceStatus,
} from './components/list/columns/product-column-utils';

/**
 * Product column loader utility
 */
export { loadProductColumns } from './components/list/product-columns-loader';

/**
 * API utility to fetch products with total count
 */
export { getProductsWithCount } from './api';
