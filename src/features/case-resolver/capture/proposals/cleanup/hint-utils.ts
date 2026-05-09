/**
 * Hint Matching Utilities
 * 
 * Utilities for detecting keyword hints in text lines.
 * Provides normalized keyword matching for document classification.
 */

import { normalizeCaseResolverComparable } from '@/features/case-resolver/public';

/**
 * Checks if a line contains any of the provided hints as whole words
 * Uses normalized comparison to handle case and special characters
 * 
 * Process:
 * 1. Normalize the line for comparison
 * 2. Pad with spaces to ensure word boundaries
 * 3. Check each hint as a whole word (surrounded by spaces)
 * 
 * @param line - The line to search
 * @param hints - Array of keywords to match
 * @returns true if any hint is found as a whole word in the line
 */
export const lineContainsComparableHint = (line: string, hints: string[]): boolean => {
  // Normalize the line for comparison
  const normalizedLine = normalizeCaseResolverComparable(line);
  if (normalizedLine.length === 0) return false;
  
  // Add padding to ensure word boundary matching
  const paddedLine = ` ${normalizedLine} `;
  
  // Check each hint as a whole word
  return hints.some((hint: string): boolean => {
    const normalizedHint = normalizeCaseResolverComparable(hint);
    if (normalizedHint.length === 0) return false;
    // Match hint surrounded by spaces (word boundary)
    return paddedLine.includes(` ${normalizedHint} `);
  });
};
