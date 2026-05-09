/**
 * Path Security Guard Utilities
 * 
 * Security utilities for preventing path traversal attacks in filesystem operations.
 * Provides:
 * - Path traversal attack prevention
 * - Secure path resolution within root directories
 * - User input validation for filesystem access
 * - Directory boundary enforcement
 * - Path normalization and validation
 */

import path from 'path';
import { badRequestError } from '@/shared/errors/app-error';

/**
 * Hardens filesystem path operations by ensuring that user/dynamic input 
 * does not result in path traversal outside an expected root directory.
 * @param root - The root directory to constrain access within
 * @param userInput - User-provided path input to validate
 * @returns Secure resolved path within the root directory
 * @throws BadRequestError if path traversal is attempted
 */
export const getSecurePath = (root: string, userInput: string): string => {
  /** Normalize and resolve the root directory path */
  const normalizedRoot = path.resolve(root);
  /** Resolve the full path combining root and user input */
  const fullPath = path.resolve(normalizedRoot, userInput);

  /** Ensure the resolved path stays within the root directory boundaries */
  if (!fullPath.startsWith(normalizedRoot + path.sep) && fullPath !== normalizedRoot) {
    throw badRequestError('Invalid filesystem path access attempt');
  }

  return fullPath;
};
