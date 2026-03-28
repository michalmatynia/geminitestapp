'use client';

import { AUTO_ACCEPT_MAX_TRACKED_ENTITIES } from './validator-utils';

// Module-level auto-accept tracking: survives component remount
const autoAcceptedByEntity = new Map<string, Set<string>>();

export const getOrCreateAutoAcceptedSet = (entityIdentity: string): Set<string> => {
  const existing = autoAcceptedByEntity.get(entityIdentity);
  if (existing) return existing;
  const fresh = new Set<string>();
  autoAcceptedByEntity.set(entityIdentity, fresh);
  // Evict oldest entries if too many tracked entities
  if (autoAcceptedByEntity.size > AUTO_ACCEPT_MAX_TRACKED_ENTITIES) {
    const firstKey = autoAcceptedByEntity.keys().next().value;
    if (firstKey !== undefined && firstKey !== entityIdentity) {
      autoAcceptedByEntity.delete(firstKey);
    }
  }
  return fresh;
};

export const clearAutoAcceptedForEntity = (entityIdentity: string): void => {
  autoAcceptedByEntity.delete(entityIdentity);
};
