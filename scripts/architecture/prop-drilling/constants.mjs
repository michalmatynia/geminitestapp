import path from 'node:path';

export const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
export const JSX_EXTENSIONS = new Set(['.tsx', '.jsx']);

export const MAX_CHAIN_DEPTH = 7;
export const MAX_CHAIN_COUNT = 6000;
export const TOP_BACKLOG_LIMIT = 80;
export const TOP_COMPONENT_BACKLOG_LIMIT = 120;

export const GUARDRAILS_EXCLUDED_PATHS = new Set([
  'src/app/(frontend)/HomeContentClient.tsx',
  'src/app/(frontend)/FrontendLayoutClient.tsx',
  'src/app/(frontend)/home-fallback-content.tsx',
]);

export const toPosix = (value) => value.split(path.sep).join('/');

export const isSourceFile = (filePath) => SOURCE_EXTENSIONS.has(path.extname(filePath).toLowerCase());

export const isJsxFile = (filePath) => JSX_EXTENSIONS.has(path.extname(filePath).toLowerCase());

export const isComponentName = (name) => /^[A-Z][A-Za-z0-9_]*$/.test(name);

export const featureFromPath = (relativePath) => {
  const featureMatch = relativePath.match(/^src\/features\/([^/]+)\//);
  if (featureMatch) return `feature:${featureMatch[1]}`;
  if (relativePath.startsWith('src/shared/ui/')) return 'shared-ui';
  if (relativePath.startsWith('src/shared/lib/')) return 'shared-lib';
  if (relativePath.startsWith('src/shared/')) return 'shared';
  if (relativePath.startsWith('src/app/')) return 'app';
  return 'other';
};
