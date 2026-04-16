import { EventEmitter } from 'events';

export const productCacheEvents = new EventEmitter();

export const emitProductCacheInvalidation = (): void => {
  productCacheEvents.emit('invalidate-all');
};
