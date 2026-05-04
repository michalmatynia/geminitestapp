/**
 * Type Utilities
 * 
 * Runtime type checking and conversion utilities for TypeScript.
 * Provides:
 * - Safe type casting with runtime validation
 * - Type guards for common data structures
 * - Null-safe type conversions
 * - Runtime type assertion helpers
 */

/**
 * Safely converts unknown value to a record object with runtime validation.
 * Returns null if the value is not a plain object (excludes arrays, null, primitives).
 * Useful for validating API responses and user input.
 */
export function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}
