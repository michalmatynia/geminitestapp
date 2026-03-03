import 'server-only';

/**
 * Base.com API Client
 *
 * Decomposed into modular units for maintainability.
 */

export type { BaseProductRecord } from '@/shared/contracts/integrations';
export * from './base-client/config';
export * from './base-client/core';
export * from './base-client/inventory';
export * from './base-client/products';
export * from './base-client/producers-tags';
export * from './base-client/categories';
