import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  dbSpecificUnitTestFiles,
  isDbSpecificMongoTestFile,
  mongoIntegrationTestFiles,
} from './lib/vitest-integration-projects.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');

const listTestFiles = (relativeDir) => {
  const absoluteDir = path.join(repoRoot, relativeDir);
  if (!fs.existsSync(absoluteDir)) {
    return [];
  }

  return fs
    .readdirSync(absoluteDir, { withFileTypes: true })
    .flatMap((entry) => {
      const relativePath = path.posix.join(relativeDir, entry.name);
      if (entry.isDirectory()) {
        return listTestFiles(relativePath);
      }
      return /\.test\.(ts|tsx)$/.test(entry.name) ? [relativePath] : [];
    });
};

const repoTestFiles = [...listTestFiles('__tests__'), ...listTestFiles('src')].sort();

describe('vitest integration project manifest', () => {
  it('keeps each declared integration or unit-db test path unique and present on disk', () => {
    const declaredFiles = [
      ...mongoIntegrationTestFiles,
      ...dbSpecificUnitTestFiles,
    ];
    const uniqueFiles = new Set(declaredFiles);

    expect(uniqueFiles.size).toBe(declaredFiles.length);

    for (const filePath of declaredFiles) {
      expect(repoTestFiles).toContain(filePath);
    }
  });

  it('classifies every mongo-named test file as integration or intentional unit coverage', () => {
    const classifiedFiles = new Set([
      ...mongoIntegrationTestFiles,
      ...dbSpecificUnitTestFiles,
    ]);

    const unclassifiedFiles = repoTestFiles.filter(
      (filePath) => isDbSpecificMongoTestFile(filePath) && !classifiedFiles.has(filePath)
    );

    expect(unclassifiedFiles).toEqual([]);
  });

  it('keeps the unit-db exception list scoped to mongo-named tests only', () => {
    for (const filePath of dbSpecificUnitTestFiles) {
      expect(isDbSpecificMongoTestFile(filePath)).toBe(true);
    }
  });
});
