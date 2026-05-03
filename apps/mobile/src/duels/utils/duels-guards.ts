/**
 * Utility guards for strict boolean expressions in duels feature.
 */

export const isNotNull = <T>(value: T | null): value is T => value !== null;

export const isNotUndefined = <T>(value: T | undefined): value is T => value !== undefined;

export const isPresent = <T>(value: T | null | undefined): value is T => 
  value !== null && value !== undefined;

export const isStringNotEmpty = (value: string | null | undefined): value is string => 
  typeof value === 'string' && value.length > 0;

export const isNumberNotZero = (value: number | null | undefined): value is number => 
  typeof value === 'number' && value !== 0;
