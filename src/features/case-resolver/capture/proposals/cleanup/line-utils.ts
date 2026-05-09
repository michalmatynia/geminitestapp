/**
 * Line Cleanup Utilities
 * 
 * Utilities for processing and validating text lines in captured documents.
 * Provides token normalization and organization name detection.
 */

import { normalizeCaseResolverComparable } from '../../utils';
import { CAPTURE_ORGANIZATION_HINTS } from './constants';
import { lineContainsComparableHint } from './hint-utils';

/**
 * Normalizes a word token by removing non-alphanumeric characters from edges
 * Preserves internal punctuation and special characters
 * 
 * @param token - The token to normalize
 * @returns Normalized token with edge characters removed
 */
export const normalizeCaptureWordToken = (token: string): string =>
  token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

/**
 * Detects if a line is likely an organization name
 * Uses heuristics: word count (1-10 tokens) and keyword matching
 * 
 * @param line - The line to analyze
 * @returns true if line matches organization name pattern
 */
export const isLikelyCaptureOrganizationLine = (line: string): boolean => {
  const trimmed = line.trim();
  
  // Skip empty lines
  if (trimmed.length === 0) return false;
  
  // Count non-empty tokens
  const wordCount = trimmed
    .split(/\s+/)
    .filter((token: string): boolean => token.length > 0)
    .length;
  
  // Organization names typically have 1-10 tokens
  if (wordCount === 0 || wordCount > 10) return false;
  
  // Check for organization-related keywords
  return lineContainsComparableHint(trimmed, CAPTURE_ORGANIZATION_HINTS);
};
