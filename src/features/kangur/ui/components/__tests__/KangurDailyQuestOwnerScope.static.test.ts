import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const KANGUR_FEATURE_ROOT = path.resolve(__dirname, '..', '..', '..');
const DAILY_QUEST_SERVICE_FILE = path.join(
  KANGUR_FEATURE_ROOT,
  'ui',
  'services',
  'daily-quests.ts'
);

const isRuntimeSourceFile = (entryPath: string): boolean =>
  (entryPath.endsWith('.ts') || entryPath.endsWith('.tsx')) &&
  !/\.test\.(ts|tsx)$/.test(entryPath) &&
  !entryPath.includes(`${path.sep}__tests__${path.sep}`);

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

    if (isRuntimeSourceFile(entryPath)) {
      collected.push(entryPath);
    }
  }

  return collected;
};

const getCallSnippets = (content: string, callee: string, snippetLength = 320): string[] => {
  const snippets: string[] = [];
  let fromIndex = 0;

  while (fromIndex < content.length) {
    const callIndex = content.indexOf(`${callee}(`, fromIndex);
    if (callIndex === -1) {
      break;
    }

    snippets.push(content.slice(callIndex, callIndex + snippetLength));
    fromIndex = callIndex + callee.length + 1;
  }

  return snippets;
};

const EXPLICIT_OWNER_KEY_PATTERN = /\bownerKey\b\s*[:,]/;
const EXPLICIT_SUBJECT_PATTERN = /\bsubject\b\s*[:,]/;

describe('Kangur daily quest owner scope', () => {
  it('does not bypass the quest service or omit ownerKey/subject in runtime quest calls', () => {
    const sourceFiles = collectSourceFiles(KANGUR_FEATURE_ROOT);

    for (const sourceFile of sourceFiles) {
      const content = readFileSync(sourceFile, 'utf8');

      if (sourceFile !== DAILY_QUEST_SERVICE_FILE) {
        expect(
          content,
          `${sourceFile} should not reach into daily quest local-storage keys directly`
        ).not.toMatch(/getKangurDailyQuestStorageKey\(/);

        for (const snippet of getCallSnippets(content, 'getCurrentKangurDailyQuest')) {
          expect(
            snippet,
            `${sourceFile} should pass an explicit ownerKey when reading the daily quest`
          ).toMatch(EXPLICIT_OWNER_KEY_PATTERN);
          expect(
            snippet,
            `${sourceFile} should pass an explicit subject when reading the daily quest`
          ).toMatch(EXPLICIT_SUBJECT_PATTERN);
        }

        for (const snippet of getCallSnippets(content, 'claimCurrentKangurDailyQuestReward')) {
          expect(
            snippet,
            `${sourceFile} should pass an explicit ownerKey when claiming a daily quest reward`
          ).toMatch(EXPLICIT_OWNER_KEY_PATTERN);
          expect(
            snippet,
            `${sourceFile} should pass an explicit subject when claiming a daily quest reward`
          ).toMatch(EXPLICIT_SUBJECT_PATTERN);
        }
      }
    }
  });
});
