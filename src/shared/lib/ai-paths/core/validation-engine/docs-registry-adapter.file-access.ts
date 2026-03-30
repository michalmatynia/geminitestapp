import 'server-only';

import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { DOCS_MANIFEST_PATH } from './docs-registry-adapter.constants';

const resolveRepoRootUrl = (): URL => {
  const candidate = new URL('../../../../../../', import.meta.url);
  if (candidate.protocol === 'file:') {
    return candidate;
  }

  return pathToFileURL(`${process.cwd()}/`);
};

const REPO_ROOT_URL = resolveRepoRootUrl();

const resolveDocsFilePath = (repoRelativePath: string): string => {
  if (REPO_ROOT_URL.protocol !== 'file:') {
    throw new Error(`Unsupported docs registry base URL: ${REPO_ROOT_URL.protocol}`);
  }
  return fileURLToPath(new URL(repoRelativePath, REPO_ROOT_URL));
};

export const normalizeRepoRelativePath = (candidate: string): string =>
  candidate
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '');

const DOCS_SOURCE_FILES = new Map<string, string>([
  [
    normalizeRepoRelativePath(DOCS_MANIFEST_PATH),
    resolveDocsFilePath('docs/ai-paths/node-validator-central-manifest.json'),
  ],
  [
    normalizeRepoRelativePath('docs/ai-paths/node-validator-core-patterns.md'),
    resolveDocsFilePath('docs/ai-paths/node-validator-core-patterns.md'),
  ],
  [
    normalizeRepoRelativePath('docs/ai-paths/node-validator-simulation-patterns.md'),
    resolveDocsFilePath('docs/ai-paths/node-validator-simulation-patterns.md'),
  ],
  [
    normalizeRepoRelativePath('docs/ai-paths/node-validator-database-patterns.md'),
    resolveDocsFilePath('docs/ai-paths/node-validator-database-patterns.md'),
  ],
  [
    normalizeRepoRelativePath('docs/ai-paths/node-validator-runtime-patterns.md'),
    resolveDocsFilePath('docs/ai-paths/node-validator-runtime-patterns.md'),
  ],
  [
    normalizeRepoRelativePath('docs/ai-paths/node-validator-wiring-patterns.md'),
    resolveDocsFilePath('docs/ai-paths/node-validator-wiring-patterns.md'),
  ],
  [
    normalizeRepoRelativePath('docs/ai-paths/node-validator-advanced-patterns.md'),
    resolveDocsFilePath('docs/ai-paths/node-validator-advanced-patterns.md'),
  ],
  [
    normalizeRepoRelativePath('docs/ai-paths/node-validator-semantic-grammar-patterns.md'),
    resolveDocsFilePath('docs/ai-paths/node-validator-semantic-grammar-patterns.md'),
  ],
  [
    normalizeRepoRelativePath('docs/ai-paths/node-validator-node-code-parser-patterns.md'),
    resolveDocsFilePath('docs/ai-paths/node-validator-node-code-parser-patterns.md'),
  ],
  [
    normalizeRepoRelativePath('docs/ai-paths/node-validator-node-path-code-parser-patterns.md'),
    resolveDocsFilePath('docs/ai-paths/node-validator-node-path-code-parser-patterns.md'),
  ],
  [
    normalizeRepoRelativePath('docs/ai-paths/node-validator-central-patterns.md'),
    resolveDocsFilePath('docs/ai-paths/node-validator-central-patterns.md'),
  ],
  [
    normalizeRepoRelativePath('docs/ai-paths/semantic-grammar/nodes/index.json'),
    resolveDocsFilePath('docs/ai-paths/semantic-grammar/nodes/index.json'),
  ],
  [
    normalizeRepoRelativePath('docs/ai-paths/tooltip-catalog.json'),
    resolveDocsFilePath('docs/ai-paths/tooltip-catalog.json'),
  ],
  [
    normalizeRepoRelativePath('docs/ai-paths/node-validator-coverage-matrix.csv'),
    resolveDocsFilePath('docs/ai-paths/node-validator-coverage-matrix.csv'),
  ],
]);

const DOCS_CONTENT_CACHE = new Map<string, string>();

export const readDocsSourceText = async (candidate: string): Promise<string> => {
  const normalized = normalizeRepoRelativePath(candidate);
  const cached = DOCS_CONTENT_CACHE.get(normalized);
  if (cached) return cached;
  const sourcePath = DOCS_SOURCE_FILES.get(normalized);
  if (!sourcePath) {
    throw new Error(`Path "${candidate}" is not in the static docs allowlist.`);
  }
  const content = await readFile(sourcePath, 'utf8');
  DOCS_CONTENT_CACHE.set(normalized, content);
  return content;
};
