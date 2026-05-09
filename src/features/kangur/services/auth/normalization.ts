/**
 * Kangur Authentication - Normalization Utilities
 * 
 * Provides standardized normalization routines for Kangur learner credentials
 * to ensure consistent lookup and comparison across different persistence layers.
 */

/**
 * Normalizes a login name by trimming whitespace and converting to lowercase.
 * This ensures that login lookups are case-insensitive and resilient to accidental whitespace.
 * 
 * @param {string} value - The raw login name from user input or storage.
 * @returns {string} The normalized login name.
 */
export const normalizeLoginName = (value: string): string => value.trim().toLowerCase();

/**
 * Normalizes a legacy user key, handling null/undefined and empty string cases.
 * 
 * @param {string | null | undefined} value - The raw legacy key.
 * @returns {string | null} The normalized key or null if empty/invalid.
 */
export const normalizeLegacyUserKey = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * Normalizes an avatar ID, ensuring it is a non-empty string.
 * 
 * @param {string | null | undefined} value - The raw avatar ID.
 * @returns {string | null} The normalized avatar ID or null.
 */
export const normalizeAvatarId = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
