/**
 * Product Events
 * 
 * Event system for product-related operations.
 * Provides:
 * - Product cache invalidation events
 * - Event emitter for product operations
 * - Cache coordination across components
 * - Product state change notifications
 * - Decoupled product event handling
 */

import { EventEmitter } from 'events';

export const productCacheEvents = new EventEmitter();

export const emitProductCacheInvalidation = (): void => {
  productCacheEvents.emit('invalidate-all');
};
