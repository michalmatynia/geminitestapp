import stringify from 'fast-json-stable-stringify';

/**
 * Safely stringifies an object using deterministic key ordering.
 * Use this instead of JSON.stringify when generating cache keys, evaluating object equality,
 * or producing checksums of objects.
 */
export function stableStringify(value: unknown): string {
  return stringify(value);
}
