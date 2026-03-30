import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const SRC_ROOT = path.join(process.cwd(), 'src');

const EXCLUDED_FILES = new Set([
  'shared/ui/dialog.tsx',
  'shared/ui/alert-dialog.tsx',
]);

const normalizeRelativePath = (filePath: string): string =>
  path.relative(SRC_ROOT, filePath).replaceAll(path.sep, '/');

const collectSourceFiles = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const resolvedPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectSourceFiles(resolvedPath);
    }
    if (!entry.isFile()) {
      return [];
    }
    if (resolvedPath.endsWith('.test.ts') || resolvedPath.endsWith('.test.tsx')) {
      return [];
    }
    if (!resolvedPath.endsWith('.ts') && !resolvedPath.endsWith('.tsx')) {
      return [];
    }
    return [resolvedPath];
  });

const activeDialogContentFiles = collectSourceFiles(SRC_ROOT)
  .filter((filePath) => !EXCLUDED_FILES.has(normalizeRelativePath(filePath)))
  .filter((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    return source.includes('<DialogContent') || source.includes('<AlertDialogContent');
  });

describe('dialog accessibility inventory', () => {
  it('requires every DialogContent and AlertDialogContent consumer to provide a title node', () => {
    activeDialogContentFiles.forEach((filePath) => {
      const source = fs.readFileSync(filePath, 'utf8');
      expect(source, normalizeRelativePath(filePath)).toMatch(
        /DialogTitle|AlertDialogTitle/
      );
    });
  });

  it('requires every DialogContent and AlertDialogContent consumer to provide a description node', () => {
    activeDialogContentFiles.forEach((filePath) => {
      const source = fs.readFileSync(filePath, 'utf8');
      expect(source, normalizeRelativePath(filePath)).toMatch(
        /DialogDescription|AlertDialogDescription/
      );
    });
  });
});
