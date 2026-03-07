import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { analyzeStorageAndFiles } from './lib/check-storage-and-files.mjs';

const tempRoots = [];

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'storage-and-files-'));
  tempRoots.push(root);
  return root;
};

const writeFile = (root, relativeFile, contents) => {
  const filePath = path.join(root, relativeFile);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
};

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('analyzeStorageAndFiles', () => {
  it('flags dynamic /public reads without a root guard', () => {
    const root = createTempRoot();
    writeFile(
      root,
      path.join('src', 'app', 'api', 'assets3d', '[id]', 'file', 'handler.ts'),
      [
        "import { readFile } from 'fs/promises';",
        "import { join } from 'path';",
        '',
        'export async function GET_handler(asset) {',
        "  const diskPath = join(process.cwd(), 'public', asset.filepath.replace(/^\\/+/, ''));",
        '  return await readFile(diskPath);',
        '}',
      ].join('\n')
    );
    fs.mkdirSync(path.join(root, 'public', 'uploads', 'assets3d'), { recursive: true });

    const report = analyzeStorageAndFiles({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'storage-dynamic-public-path-read-without-root-guard',
          severity: 'error',
        }),
      ])
    );
  });

  it('accepts resolve-plus-prefix-guard helpers', () => {
    const root = createTempRoot();
    writeFile(
      root,
      path.join('src', 'app', 'api', 'image-studio', 'projects', '[projectId]', 'assets', 'delete', 'handler.ts'),
      [
        "import fs from 'fs/promises';",
        "import path from 'path';",
        '',
        "const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');",
        '',
        'function resolveDiskPathFromPublicUploadPath(filepath) {',
        "  const normalized = filepath.startsWith('/') ? filepath : `/${filepath}`;",
        "  const resolved = path.resolve(process.cwd(), 'public', normalized.replace(/^\\/+/, ''));",
        '  const uploadsResolved = path.resolve(uploadsRoot);',
        "  if (!resolved.startsWith(`${uploadsResolved}${path.sep}`)) return null;",
        '  return resolved;',
        '}',
        '',
        'export async function DELETE_handler(file) {',
        '  const diskPath = resolveDiskPathFromPublicUploadPath(file.filepath);',
        '  if (!diskPath) return null;',
        '  return await fs.stat(diskPath);',
        '}',
      ].join('\n')
    );
    fs.mkdirSync(path.join(root, 'public', 'uploads', 'studio'), { recursive: true });

    const report = analyzeStorageAndFiles({ root });

    expect(report.summary.errorCount).toBe(0);
  });

  it('warns when the local uploads root is missing', () => {
    const root = createTempRoot();
    writeFile(root, path.join('src', 'shared', 'dummy.ts'), 'export const ok = true;\n');

    const report = analyzeStorageAndFiles({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'storage-local-uploads-root-missing',
          severity: 'warn',
        }),
      ])
    );
  });

  it('warns on runtime upload roots that are not declared', () => {
    const root = createTempRoot();
    writeFile(root, path.join('src', 'shared', 'dummy.ts'), 'export const ok = true;\n');
    fs.mkdirSync(path.join(root, 'public', 'uploads', 'mystery-root'), { recursive: true });

    const report = analyzeStorageAndFiles({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'storage-runtime-root-unknown',
          severity: 'warn',
        }),
      ])
    );
  });
});
