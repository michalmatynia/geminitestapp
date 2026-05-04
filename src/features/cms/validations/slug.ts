/**
 * Slug Validation
 * 
 * URL slug validation rules and utilities.
 * Provides:
 * - Slug format regex pattern
 * - Lowercase alphanumeric validation
 * - Hyphen-separated word validation
 * - URL-safe slug checking
 * - SEO-friendly slug enforcement
 */

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const isValidSlug = (value: string): boolean => SLUG_REGEX.test(value);
