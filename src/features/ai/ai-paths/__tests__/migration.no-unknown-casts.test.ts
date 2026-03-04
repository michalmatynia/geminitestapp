import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const AI_PATHS_ROOTS = ['src/features/ai/ai-paths', 'src/shared/lib/ai-paths'] as const;
const BANNED_CAST = 'as unknown as';

const isRuntimeCodeFile = (filePath: string): boolean => {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return false;
  if (filePath.includes(`${path.sep}__tests__${path.sep}`)) return false;
  if (filePath.endsWith('.test.ts') || filePath.endsWith('.test.tsx')) return false;
  if (filePath.endsWith('.spec.ts') || filePath.endsWith('.spec.tsx')) return false;
  return true;
};

const collectSourceFiles = (dir: string): string[] => {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry): string[] => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectSourceFiles(fullPath);
    }
    return isRuntimeCodeFile(fullPath) ? [fullPath] : [];
  });
};

describe('ai-paths migration guardrails', () => {
  it('does not allow "as unknown as" in runtime ai-paths source files', () => {
    const violations = AI_PATHS_ROOTS.flatMap((rootDir) =>
      collectSourceFiles(path.join(process.cwd(), rootDir)).flatMap((filePath): string[] => {
        const source = readFileSync(filePath, 'utf8');
        if (!source.includes(BANNED_CAST)) return [];
        return [path.relative(process.cwd(), filePath)];
      })
    );

    expect(violations, `Found banned cast pattern "${BANNED_CAST}" in runtime files`).toEqual([]);
  });
});
