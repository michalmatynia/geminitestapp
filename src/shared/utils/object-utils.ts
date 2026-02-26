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
 * Checks if a value is a plain object.
 */
export function isObject(item: unknown): item is Record<string, unknown> {
  return Boolean(item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Deeply merges two or more objects.
 */
export function deepMerge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key] as any);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}
