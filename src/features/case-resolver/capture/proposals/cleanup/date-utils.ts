/**
 * Date Cleanup Utilities
 * 
 * Utilities for detecting and validating date lines in captured documents.
 * Provides date extraction and validation for document metadata.
 */

import { extractCaseResolverDocumentDate } from '../utils';

/**
 * Checks if a line contains a valid document date
 * Uses date extraction to validate date presence and format
 * 
 * @param line - The line to check for date
 * @returns true if line contains a valid extractable date
 */
export const hasValidDocumentDate = (line: string): boolean => {
  const date = extractCaseResolverDocumentDate(line);
  return date !== null && date !== undefined;
};
