import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  listUnexpectedFilesBySuffix,
  pruneUnexpectedFilesBySuffix,
} from '../../../scripts/docs/artifact-hygiene';

const makeTempRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ai-paths-artifact-hygiene-'));

const writeFile = (root: string, relativePath: string, content = '{}') => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf8');
};

describe('artifact-hygiene', () => {
  it('lists unexpected files by suffix while honoring excluded files', () => {
    const root = makeTempRoot();
    try {
      writeFile(root, 'constant.json');
      writeFile(root, 'math.json');
      writeFile(root, 'legacy.json');
      writeFile(root, 'index.json');
      writeFile(root, 'README.md', '# docs');

      const unexpected = listUnexpectedFilesBySuffix({
        directoryPath: root,
        suffix: '.json',
        expectedBaseNames: new Set(['constant', 'math']),
        excludedFileNames: ['index.json'],
      });

      expect(unexpected).toEqual(['legacy.json']);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('prunes unexpected files by suffix and returns removed file names', () => {
    const root = makeTempRoot();
    try {
      writeFile(root, 'constant.scaffold.json');
      writeFile(root, 'template.scaffold.json');
      writeFile(root, 'legacy.scaffold.json');
      writeFile(root, 'index.scaffold.json');

      const removed = pruneUnexpectedFilesBySuffix({
        directoryPath: root,
        suffix: '.scaffold.json',
        expectedBaseNames: new Set(['constant', 'template']),
        excludedFileNames: ['index.scaffold.json'],
      });

      expect(removed).toEqual(['legacy.scaffold.json']);
      expect(fs.existsSync(path.join(root, 'legacy.scaffold.json'))).toBe(false);
      expect(fs.existsSync(path.join(root, 'constant.scaffold.json'))).toBe(true);
      expect(fs.existsSync(path.join(root, 'template.scaffold.json'))).toBe(true);
      expect(fs.existsSync(path.join(root, 'index.scaffold.json'))).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('returns empty results for missing directories', () => {
    const root = makeTempRoot();
    try {
      const missingDir = path.join(root, 'missing');
      expect(
        listUnexpectedFilesBySuffix({
          directoryPath: missingDir,
          suffix: '.json',
          expectedBaseNames: new Set(['constant']),
        })
      ).toEqual([]);

      expect(
        pruneUnexpectedFilesBySuffix({
          directoryPath: missingDir,
          suffix: '.json',
          expectedBaseNames: new Set(['constant']),
        })
      ).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
