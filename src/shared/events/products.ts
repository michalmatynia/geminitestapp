import { EventEmitter } from 'events';

export const productCacheEvents = new EventEmitter();

export const emitProductCacheInvalidation = () => {
  productCacheEvents.emit('invalidate-all');
};
