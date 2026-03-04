import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const promptExploderRoot = path.join(projectRoot, 'src/features/prompt-exploder');
const forbiddenRuntimeCompatTokens = [
  '@/features/prompt-exploder/persistence-contract-migration',
  'migratePromptExploderPersistedSettingValue',
  "scope === 'case-resolver-prompt-exploder'",
  'runtime_retry_success',
  'runtime_retry',
  'parseStoredValidationRuleStack',
  'stack.id ??',
];
const forbiddenRuntimeCompatPatterns: RegExp[] = [
  /launchAppliesToScopes:\s*rule\.launchAppliesToScopes\s*\?\?\s*rule\.appliesToScopes/s,
];

const collectSourceFiles = (dir: string): string[] => {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const absolute = path.join(dir, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      if (entry === '__tests__') continue;
      files.push(...collectSourceFiles(absolute));
      continue;
    }

    if (!absolute.endsWith('.ts') && !absolute.endsWith('.tsx')) continue;
    if (absolute.endsWith('.d.ts')) continue;
    files.push(absolute);
  }

  return files;
};

describe('prompt exploder runtime legacy-compat prune guard', () => {
  it('keeps removed persistence migration helpers and runtime retry counters out of runtime source', () => {
    const sourceFiles = collectSourceFiles(promptExploderRoot);
    const offenders = sourceFiles
      .filter((absolutePath: string): boolean => {
        const content = readFileSync(absolutePath, 'utf8');
        return (
          forbiddenRuntimeCompatTokens.some((token: string): boolean => content.includes(token)) ||
          forbiddenRuntimeCompatPatterns.some((pattern: RegExp): boolean => pattern.test(content))
        );
      })
      .map((absolutePath: string): string => path.relative(projectRoot, absolutePath));

    expect(offenders).toEqual([]);
  });
});
