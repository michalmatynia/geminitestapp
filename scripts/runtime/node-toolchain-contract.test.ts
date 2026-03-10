import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');

const readRepoFile = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const nvmrc = readRepoFile('.nvmrc').trim();
const bunVersion = readRepoFile('.bun-version').trim();
const toolVersions = readRepoFile('.tool-versions');
const workflowPaths = [
  '.github/workflows/bun-compatibility.yml',
  '.github/workflows/toolchain-contract.yml',
  '.github/workflows/test-matrix.yml',
  '.github/workflows/ai-paths-node-docs.yml',
  '.github/workflows/architecture-guardrails.yml',
  '.github/workflows/weekly-quality-report.yml',
];
const npmCacheWorkflowPaths = [
  '.github/workflows/test-matrix.yml',
  '.github/workflows/toolchain-contract.yml',
  '.github/workflows/ai-paths-node-docs.yml',
  '.github/workflows/architecture-guardrails.yml',
  '.github/workflows/weekly-quality-report.yml',
];

describe('Node toolchain contract', () => {
  it('keeps the Node version mirror aligned with .nvmrc', () => {
    expect(readRepoFile('.node-version').trim()).toBe(nvmrc);
  });

  it('keeps .tool-versions aligned with the repo Node and Bun pins', () => {
    expect(toolVersions).toContain(`nodejs ${nvmrc}`);
    expect(toolVersions).toContain(`bun ${bunVersion}`);
  });

  it('uses .nvmrc for the repo workflows pinned to Node 22', () => {
    for (const workflowPath of workflowPaths) {
      const workflowText = readRepoFile(workflowPath);
      expect(workflowText).toContain("node-version-file: '.nvmrc'");
      expect(workflowText).not.toContain("node-version: '22'");
    }
  });

  it('keeps a lightweight npm-first workflow for the core toolchain contract', () => {
    const workflowText = readRepoFile('.github/workflows/toolchain-contract.yml');

    expect(workflowText).toContain('workflow_dispatch:');
    expect(workflowText).not.toContain('pull_request:');
    expect(workflowText).not.toContain('push:');
    expect(workflowText).toContain('cache: npm');
    expect(workflowText).toContain('cache-dependency-path: package-lock.json');
    expect(workflowText).toContain('run: npm ci');
    expect(workflowText).toContain('run: npm run check:toolchain:contract:node');
    expect(workflowText).toContain('run: npm run test:toolchain:contract');
  });

  it('keeps the canonical test matrix enforcing the npm-first toolchain contract too', () => {
    const workflowText = readRepoFile('.github/workflows/test-matrix.yml');

    expect(workflowText).toContain('toolchain-contract:');
    expect(workflowText).toContain("node-version-file: '.nvmrc'");
    expect(workflowText).toContain('cache: npm');
    expect(workflowText).toContain('cache-dependency-path: package-lock.json');
    expect(workflowText).toContain('run: npm ci');
    expect(workflowText).toContain('run: npm run check:toolchain:contract:node');
    expect(workflowText).toContain('run: npm run test:toolchain:contract');
  });

  it('pins npm cache restoration to package-lock.json anywhere the .nvmrc workflows cache npm', () => {
    for (const workflowPath of npmCacheWorkflowPaths) {
      const workflowText = readRepoFile(workflowPath);
      expect(workflowText).toContain('cache-dependency-path: package-lock.json');
    }
  });
});
