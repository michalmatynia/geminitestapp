/**
 * Checks if a value is a plain object.
 */
export function isObject(item: unknown): item is Record<string, unknown> {
  return item !== null && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Checks if a value is a plain object (alias for isObject).
 */
export const isObjectRecord = isObject;

/**
 * Checks if a value is a plain object (alias for isObject).
 */
export const isPlainRecord = isObject;

/**
 * Removes undefined properties from an object (shallow).
 */
export function removeUndefined<T extends object>(obj: T): T {
  const result = { ...obj };
  for (const key in result) {
    if (Object.hasOwn(result, key) && result[key] === undefined) {
      delete result[key];
    }
  }
  return result;
}

/**
 * Deeply merges two or more objects.
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  if (sources.length === 0) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (!Object.hasOwn(source, key)) continue;
      const val = source[key];
      if (isObject(val)) {
        if (target[key] === undefined || target[key] === null) {
          Object.assign(target, { [key]: {} });
        }
        deepMerge(target[key] as Record<string, unknown>, val as Record<string, unknown>);
      } else {
        Object.assign(target, { [key]: val });
      }
    }
  }

  return deepMerge(target, ...sources);
}
