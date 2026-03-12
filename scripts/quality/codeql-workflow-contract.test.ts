import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const readRepoFile = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const packageJson = JSON.parse(readRepoFile('package.json')) as {
  scripts?: Record<string, string>;
};

describe('CodeQL workflow contract', () => {
  it('keeps a dedicated advanced CodeQL workflow for JavaScript and TypeScript scanning', () => {
    const workflowText = readRepoFile('.github/workflows/codeql.yml');

    expect(workflowText).toContain('name: CodeQL');
    expect(workflowText).toContain('workflow_dispatch:');
    expect(workflowText).toContain('pull_request:');
    expect(workflowText).toContain('push:');
    expect(workflowText).toContain('schedule:');
    expect(workflowText).toContain('node-version-file: \'.nvmrc\'');
    expect(workflowText).toContain('cache: npm');
    expect(workflowText).toContain('cache-dependency-path: package-lock.json');
    expect(workflowText).toContain('run: npm ci');
    expect(workflowText).toContain('security-events: write');
    expect(workflowText).toContain('github/codeql-action/init@v4');
    expect(workflowText).toContain('github/codeql-action/analyze@v4');
    expect(workflowText).toContain('javascript-typescript');
    expect(workflowText).toContain('build-mode: none');
    expect(workflowText).toContain('queries: security-extended');
    expect(workflowText).toContain('config-file: ./.github/codeql/codeql-config.yml');
  });

  it('keeps the CodeQL analysis scope anchored to first-party application code', () => {
    const configText = readRepoFile('.github/codeql/codeql-config.yml');

    expect(configText).toContain('name: Geminitestapp CodeQL');
    expect(configText).toContain('paths:');
    expect(configText).toContain('  - src');
    expect(configText).toContain('  - scripts');
    expect(configText).toContain('  - server.cjs');
    expect(configText).toContain('paths-ignore:');
    expect(configText).toContain('  - docs');
    expect(configText).toContain('  - e2e');
    expect(configText).toContain('  - \'**/*.test.ts\'');
    expect(configText).toContain('  - \'**/*.test.tsx\'');
  });

  it('keeps CodeQL discoverable through the build docs and contract bundle', () => {
    const buildReadmeText = readRepoFile('docs/build/README.md');
    const toolchainContractScript = packageJson.scripts?.['test:toolchain:contract'];

    expect(buildReadmeText).toContain('[`codeql.md`](./codeql.md)');
    expect(buildReadmeText).toContain('docs/build/codeql.md');
    expect(toolchainContractScript).toContain('scripts/quality/codeql-workflow-contract.test.ts');
  });
});
