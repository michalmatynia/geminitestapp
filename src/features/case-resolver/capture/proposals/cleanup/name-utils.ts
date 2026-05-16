/**
 * Name Cleanup Utilities
 * 
 * Utilities for detecting and validating person name lines in captured data.
 * Provides heuristics for identifying likely person names based on token patterns.
 */

import { normalizeCaptureWordToken } from './line-utils';

/**
 * Detects if a line is likely a person name based on token count
 * Person names typically contain 2-4 tokens (first name, last name, middle name, suffix)
 * 
 * @param line - The line to analyze
 * @returns true if line matches person name pattern (2-4 tokens)
 */
export const isLikelyCapturePersonNameLine = (line: string): boolean => {
  // Split by whitespace and normalize each token
  const tokens = line
    .split(/\s+/)
    .map((t) => normalizeCaptureWordToken(t))
    .filter((t) => t.length > 0);
  
  // Person names typically have 2-4 tokens
  if (tokens.length < 2 || tokens.length > 4) return false;
  return true;
};
