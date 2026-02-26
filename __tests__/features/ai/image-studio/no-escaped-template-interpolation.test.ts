import { promises as fs } from 'node:fs';
import path from 'node:path';

import { describe, it } from 'vitest';

const IMAGE_STUDIO_ROOT = path.join(
  process.cwd(),
  'src',
  'features',
  'ai',
  'image-studio'
);

const SOURCE_FILE_PATTERN = /\.(ts|tsx|js|jsx)$/;

// Keep empty by default; add exact lines only if an intentional literal \${...} is required.
const ALLOWLIST: Record<string, number[]> = {};

const collectSourceFiles = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectSourceFiles(fullPath);
      }
      if (!entry.isFile() || !SOURCE_FILE_PATTERN.test(entry.name)) {
        return [];
      }
      return [fullPath];
    })
  );
  return files.flat();
};

describe('image-studio escaped template interpolation guard', () => {
  it('does not contain literal \\${ sequences in source files', async () => {
    const sourceFiles = await collectSourceFiles(IMAGE_STUDIO_ROOT);
    const violations: string[] = [];

    for (const absolutePath of sourceFiles) {
      const relativePath = path.relative(process.cwd(), absolutePath).split(path.sep).join('/');
      const allowlistedLines = new Set(ALLOWLIST[relativePath] ?? []);
      const content = await fs.readFile(absolutePath, 'utf8');
      const lines = content.split(/\r?\n/);

      lines.forEach((line, index) => {
        if (!line.includes('\\${')) return;
        const lineNumber = index + 1;
        if (allowlistedLines.has(lineNumber)) return;
        violations.push(`${relativePath}:${lineNumber}`);
      });
    }

    if (violations.length > 0) {
      throw new Error(
        `Found escaped template interpolation (\\\\\\$\\{) in Image Studio source:\n${violations.join('\n')}`
      );
    }
  });
});
