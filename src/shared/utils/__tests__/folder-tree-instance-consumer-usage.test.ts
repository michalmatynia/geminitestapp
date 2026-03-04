import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { folderTreeInstanceValues, type FolderTreeInstance } from '@/shared/utils/folder-tree-profiles-v2';

const ROOT_SRC_DIR = path.resolve(process.cwd(), 'src');

const collectRuntimeSourceFiles = (dir: string): string[] => {
  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  entries.forEach((entry) => {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') return;
      collectRuntimeSourceFiles(absolutePath).forEach((nestedPath) => files.push(nestedPath));
      return;
    }
    if (!entry.isFile()) return;
    if (!/\.(ts|tsx)$/.test(entry.name)) return;
    files.push(absolutePath);
  });

  return files;
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasRuntimeConsumerReference = (source: string, instance: FolderTreeInstance): boolean => {
  const token = escapeRegExp(instance);
  const patterns = [
    new RegExp(`instance\\s*:\\s*['"\`]${token}['"\`]`),
    new RegExp(`instance\\s*=\\s*['"\`]${token}['"\`]`),
    new RegExp(`masterInstance\\s*=\\s*['"\`]${token}['"\`]`),
    new RegExp(`relationTreeInstance\\s*=\\s*['"\`]${token}['"\`]`),
    new RegExp(`TREE_INSTANCE\\s*=\\s*['"\`]${token}['"\`]`),
    new RegExp(`[A-Z0-9_]*INSTANCE\\s*=\\s*['"\`]${token}['"\`]`),
  ];
  return patterns.some((pattern) => pattern.test(source));
};

describe('folder tree instance runtime usage', () => {
  it('keeps at least one runtime consumer reference for each registered instance', () => {
    const sourceFiles = collectRuntimeSourceFiles(ROOT_SRC_DIR);
    const source = sourceFiles.map((filePath) => readFileSync(filePath, 'utf8')).join('\n');

    const missing = folderTreeInstanceValues.filter(
      (instance: FolderTreeInstance) => !hasRuntimeConsumerReference(source, instance)
    );

    expect(missing).toEqual([]);
  });
});
