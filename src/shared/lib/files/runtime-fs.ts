/**
 * Runtime Filesystem Module
 * 
 * Lazy-loaded Node.js filesystem and path modules for server-side use.
 * Provides:
 * - Cached fs/promises module access
 * - Cached path module access
 * - Runtime path joining utilities
 * - Server-only module enforcement
 * 
 * Uses dynamic require to avoid bundling Node.js modules in client code
 */

import 'server-only';

import { createRequire } from 'module';

import type * as FsPromises from 'node:fs/promises';
import type * as NodePath from 'node:path';

/** Cached fs/promises module */
let cached: typeof FsPromises | null = null;
/** Cached path module */
let cachedPath: typeof NodePath | null = null;

/**
 * Gets the fs/promises module with caching
 * Lazy-loads on first access to avoid unnecessary imports
 * 
 * @returns The fs/promises module
 */
export const getFsPromises = (): typeof FsPromises => {
  if (cached) return cached;
  const requireFn = createRequire(import.meta.url);
  cached = requireFn('node:fs/promises') as typeof FsPromises;
  return cached;
};

/**
 * Gets the path module with caching
 * Lazy-loads on first access to avoid unnecessary imports
 * 
 * @returns The path module
 */
const getPathModule = (): typeof NodePath => {
  if (cachedPath) return cachedPath;
  const requireFn = createRequire(import.meta.url);
  cachedPath = requireFn('node:path') as typeof NodePath;
  return cachedPath;
};

/**
 * Joins path segments using the runtime path module
 * Handles platform-specific path separators
 * 
 * @param segments - Path segments to join
 * @returns Joined path string
 */
export const joinRuntimePath = (...segments: string[]): string => {
  const pathModule = getPathModule();
  const join = pathModule.join as (...parts: string[]) => string;
  return join(...segments);
};
