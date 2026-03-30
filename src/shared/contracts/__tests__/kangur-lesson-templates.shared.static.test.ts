import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  KANGUR_LEGACY_LESSON_TITLE_KEYS,
} from '@/shared/contracts/kangur-lesson-templates.shared';

const PROJECT_ROOT = process.cwd();
const KANGUR_FEATURE_ROOT = path.join(PROJECT_ROOT, 'src', 'features', 'kangur');
const SHARED_CONTRACTS_ROOT = path.join(PROJECT_ROOT, 'src', 'shared', 'contracts');
const I18N_ROOT = path.join(PROJECT_ROOT, 'src', 'i18n');

const ALLOWED_RAW_LEGACY_KEY_FILES = new Set<string>([
  path.join(SHARED_CONTRACTS_ROOT, 'kangur-lesson-templates.shared.ts'),
]);

const SOURCE_ROOTS = [KANGUR_FEATURE_ROOT, SHARED_CONTRACTS_ROOT, I18N_ROOT];

const isScannableSourceFile = (entryPath: string): boolean =>
  /\.(ts|tsx|json)$/.test(entryPath);

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

    if (isScannableSourceFile(entryPath)) {
      collected.push(entryPath);
    }
  }

  return collected;
};

const findFilesContaining = (pattern: string): string[] =>
  SOURCE_ROOTS.flatMap((root) => collectSourceFiles(root))
    .filter((filePath) => readFileSync(filePath, 'utf8').includes(pattern))
    .map((filePath) => path.relative(PROJECT_ROOT, filePath))
    .sort();

describe('kangur lesson template legacy title key boundaries', () => {
  it('keeps raw legacy title key spellings confined to the shared contract constants file', () => {
    const allowedFiles = [...ALLOWED_RAW_LEGACY_KEY_FILES]
      .map((filePath) => path.relative(PROJECT_ROOT, filePath))
      .sort();

    for (const legacyKey of KANGUR_LEGACY_LESSON_TITLE_KEYS) {
      expect(findFilesContaining(legacyKey)).toEqual(allowedFiles);
    }
  });
});
