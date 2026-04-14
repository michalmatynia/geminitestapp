import path from 'node:path';

export const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
export const SKIP_SEGMENTS = new Set([
  'node_modules',
  '.next',
  '.git',
  'coverage',
  'dist',
  'build',
  'tmp',
]);

export const toPosix = (value) => value.split(path.sep).join('/');

export const PRIMITIVE_ALIAS_TYPES = new Set([
  'string',
  'number',
  'boolean',
  'unknown',
  'any',
  'never',
  'null',
  'undefined',
  'void',
]);

export const getDomainFromPath = (relativePath) => {
  const featureMatch = relativePath.match(/^src\/features\/([^/]+)\//);
  if (featureMatch) return `feature:${featureMatch[1]}`;
  if (relativePath.startsWith('src/shared/contracts/')) return 'shared:contracts';
  if (relativePath.startsWith('src/shared/')) return 'shared';
  if (relativePath.startsWith('src/app/')) return 'app';
  return 'other';
};
