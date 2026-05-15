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
 * getSecurePath: Securely resolves a filesystem path by ensuring it stays within a designated root directory,
 * effectively preventing path traversal vulnerabilities (e.g., ../../etc/passwd).
 * 
 * @param root - The base directory to which all operations must be confined.
 * @param userInput - The dynamic/user-provided path input to be resolved.
 * @returns The absolute, normalized path within the root directory.
 * @throws {BadRequestError} If the resolved path attempts to escape the root directory.
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
