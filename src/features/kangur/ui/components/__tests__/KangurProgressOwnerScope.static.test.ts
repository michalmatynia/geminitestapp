import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const KANGUR_FEATURE_ROOT = path.resolve(__dirname, '..', '..', '..');
const ALLOWED_BARE_LOAD_PROGRESS_FILES = new Set<string>([
  path.join(KANGUR_FEATURE_ROOT, 'ui', 'services', 'progress.persistence.ts'),
]);
const ALLOWED_SAVE_PROGRESS_FILES = new Set<string>([
  path.join(KANGUR_FEATURE_ROOT, 'ui', 'services', 'progress.persistence.ts'),
  path.join(KANGUR_FEATURE_ROOT, 'ui', 'services', 'progress.ts'),
  path.join(KANGUR_FEATURE_ROOT, 'ui', 'context', 'KangurProgressSyncProvider.tsx'),
  path.join(KANGUR_FEATURE_ROOT, 'services', 'kangur-progress-repository', 'index.ts'),
  path.join(
    KANGUR_FEATURE_ROOT,
    'services',
    'kangur-progress-repository',
    'mongo-kangur-progress-repository.ts'
  ),
]);

const isComponentSourceFile = (entryPath: string): boolean =>
  entryPath.endsWith('.ts') || entryPath.endsWith('.tsx');

const isTestFile = (entryPath: string): boolean =>
  /\.test\.(ts|tsx)$/.test(entryPath) || entryPath.includes(`${path.sep}__tests__${path.sep}`);

const collectSourceFiles = (directoryPath: string): string[] => {
  const entries = readdirSync(directoryPath);
  const collected: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      collected.push(...collectSourceFiles(entryPath));
      continue;
    }

    if (isComponentSourceFile(entryPath) && !isTestFile(entryPath)) {
      collected.push(entryPath);
    }
  }

  return collected;
};

describe('Kangur progress owner scope', () => {
  it('does not use ambient progress reads or reward writes in runtime sources', () => {
    const sourceFiles = collectSourceFiles(KANGUR_FEATURE_ROOT);

    for (const sourceFile of sourceFiles) {
      if (ALLOWED_BARE_LOAD_PROGRESS_FILES.has(sourceFile)) {
        continue;
      }

      const content = readFileSync(sourceFile, 'utf8');

      expect(content, `${sourceFile} should not use bare loadProgress()`).not.toMatch(
        /loadProgress\(\s*\)/
      );
      expect(
        content,
        `${sourceFile} should not write reward XP without an explicit owner scope`
      ).not.toMatch(/addXp\(\s*reward\.xp\s*,\s*reward\.progressUpdates\s*\)/);

      if (!ALLOWED_SAVE_PROGRESS_FILES.has(sourceFile)) {
        expect(
          content,
          `${sourceFile} should not write progress directly outside the approved persistence flow`
        ).not.toMatch(/saveProgress\(/);
      }
    }
  });
});
