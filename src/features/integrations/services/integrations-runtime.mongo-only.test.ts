import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '../../../..');

const runtimeRoots = [
  path.join(projectRoot, 'src/features/integrations/services'),
  path.join(projectRoot, 'src/app/api/v2/integrations/products'),
  path.join(projectRoot, 'src/features/product-sync/services'),
  path.join(projectRoot, 'src/server'),
] as const;

const bannedTokens = [
  '@/shared/lib/db/legacy-sql-client\'',
  '@/shared/lib/db/legacy-sql-client"',
  'getAppDbProvider',
] as const;

const collectRuntimeFiles = (baseDir: string): string[] => {
  if (!existsSync(baseDir)) return [];

  const supportedExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);

  const walk = (dir: string): string[] => {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];

    entries.forEach((entry) => {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...walk(absolute));
        return;
      }
      if (!entry.isFile()) return;
      if (!supportedExtensions.has(path.extname(entry.name))) return;
      if (entry.name.includes('.test.') || entry.name.includes('.spec.')) return;
      files.push(absolute);
    });

    return files;
  };

  return walk(baseDir).sort();
};

describe('integrations runtime mongo-only contract', () => {
  it('avoids removed runtime imports and provider switching in integrations runtime files', () => {
    const runtimeFiles = runtimeRoots.flatMap((root) => collectRuntimeFiles(root));
    const offenders = runtimeFiles
      .filter((absolute) => {
        const source = readFileSync(absolute, 'utf8');
        return bannedTokens.some((token) => source.includes(token));
      })
      .map((absolute) => path.relative(projectRoot, absolute));

    expect(offenders).toEqual([]);
  });
});
