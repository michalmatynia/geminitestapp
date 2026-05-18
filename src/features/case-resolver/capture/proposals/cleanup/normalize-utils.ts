/**
 * Text Normalization Utilities
 * 
 * Utilities for normalizing text in captured documents.
 * Provides consistent text transformation for comparison and storage.
 */

import { normalizeCaseResolverComparable } from '@/features/case-resolver/public';

/**
 * Normalizes text for consistent comparison and storage
 * Applies case-resolver normalization rules with empty string fallback
 * 
 * @param text - The text to normalize
 * @returns Normalized text or empty string if normalization fails
 */
export const normalizeText = (text: string): string => 
  normalizeCaseResolverComparable(text);
