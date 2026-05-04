/**
 * Stable JSON Stringification
 * 
 * Deterministic JSON serialization for consistent object comparison.
 * Features:
 * - Stable key ordering regardless of object creation order
 * - Consistent output for cache key generation
 * - Reliable object equality checking
 * - Checksum and hash generation support
 */

import stringify from 'fast-json-stable-stringify';

/**
 * Safely stringifies an object using deterministic key ordering.
 * Use this instead of JSON.stringify when generating cache keys, evaluating object equality,
 * or producing checksums of objects. Ensures consistent output regardless of property order.
 */
export function stableStringify(value: unknown): string {
  return stringify(value);
}
