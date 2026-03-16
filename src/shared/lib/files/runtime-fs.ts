import 'server-only';

import { createRequire } from 'module';

import type * as FsPromises from 'node:fs/promises';
import type * as NodePath from 'node:path';

let cached: typeof FsPromises | null = null;
let cachedPath: typeof NodePath | null = null;

export const getFsPromises = (): typeof FsPromises => {
  if (cached) return cached;
  const requireFn = createRequire(import.meta.url);
  cached = requireFn('node:fs/promises') as typeof FsPromises;
  return cached;
};

const getPathModule = (): typeof NodePath => {
  if (cachedPath) return cachedPath;
  const requireFn = createRequire(import.meta.url);
  cachedPath = requireFn('node:path') as typeof NodePath;
  return cachedPath;
};

export const joinRuntimePath = (...segments: string[]): string => {
  const pathModule = getPathModule();
  const join = pathModule.join as (...parts: string[]) => string;
  return join(...segments);
};
