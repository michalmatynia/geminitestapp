/**
 * Reconciles the difference between Node.js and Browser return types for setTimeout.
 * Use this in shared hooks to avoid TS2322 errors.
 */
export type SafeTimeout = ReturnType<typeof setTimeout>;

/**
 * Standardized clearing for a SafeTimeout.
 */
export const clearSafeTimeout = (timeout: SafeTimeout): void => {
  clearTimeout(timeout);
};
