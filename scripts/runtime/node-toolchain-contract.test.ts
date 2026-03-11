import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const packageJson = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')
) as {
  scripts?: Record<string, string>;
};

const readRepoFile = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const nvmrc = readRepoFile('.nvmrc').trim();
const bunVersion = readRepoFile('.bun-version').trim();
const toolVersions = readRepoFile('.tool-versions');
const workflowDirectory = path.join(repoRoot, '.github', 'workflows');
const nodePinDocPaths = [
  'docs/platform/bun-support.md',
  'docs/runbooks/application-performance-operations.md',
  'docs/case-resolver/runbooks/prompt-exploder-capture-handoff.md',
];
const nvmrcWorkflowPaths = fs
  .readdirSync(workflowDirectory)
  .filter((entry) => entry.endsWith('.yml'))
  .map((entry) => `.github/workflows/${entry}`)
  .filter((workflowPath) => readRepoFile(workflowPath).includes("node-version-file: '.nvmrc'"));
const bazelToolchainWorkflowText = readRepoFile('.github/workflows/bazel-toolchain.yml');
const bazelSmokeWorkflowText = readRepoFile('.github/workflows/bazel-smoke.yml');
const bazelQualityWorkflowText = readRepoFile('.github/workflows/bazel-quality.yml');
const bazelRegressionsWorkflowText = readRepoFile('.github/workflows/bazel-regressions.yml');
const buildReadmeText = readRepoFile('docs/build/README.md');
const buildBazelDocText = readRepoFile('docs/build/bazel.md');
const npmCacheWorkflowPaths = fs
  .readdirSync(workflowDirectory)
  .filter((entry) => entry.endsWith('.yml'))
  .map((entry) => `.github/workflows/${entry}`)
  .filter((workflowPath) => {
    const workflowText = readRepoFile(workflowPath);
    return workflowText.includes('cache: npm') || workflowText.includes("cache: 'npm'");
  });
const nvmrcPathFilteredWorkflowPaths = fs
  .readdirSync(workflowDirectory)
  .filter((entry) => entry.endsWith('.yml'))
  .map((entry) => `.github/workflows/${entry}`)
  .filter((workflowPath) => {
    const workflowText = readRepoFile(workflowPath);
    return workflowText.includes("node-version-file: '.nvmrc'") && workflowText.includes('paths:');
  });
const npmCiPathFilteredWorkflowPaths = fs
  .readdirSync(workflowDirectory)
  .filter((entry) => entry.endsWith('.yml'))
  .map((entry) => `.github/workflows/${entry}`)
  .filter((workflowPath) => {
    const workflowText = readRepoFile(workflowPath);
    return workflowText.includes('npm ci') && workflowText.includes('paths:');
  });

describe('Node toolchain contract', () => {
  it('keeps the npm-first toolchain entrypoint composed from static runtime checks', () => {
    const nodeToolchainContractScript = packageJson.scripts?.['check:toolchain:contract:node'];

    expect(nodeToolchainContractScript).toContain('node scripts/runtime/check-package-manager-contract.cjs');
    expect(nodeToolchainContractScript).toContain('node scripts/runtime/check-node-toolchain-sync.cjs');
    expect(nodeToolchainContractScript).toContain('node scripts/runtime/check-bun-config.cjs');
  });

  it('keeps the canonical Bazel repo lane scripts wired to the root repo targets', () => {
    expect(packageJson.scripts?.['bazel:toolchain']).toBe('bazelisk run //:repo_toolchain');
    expect(packageJson.scripts?.['bazel:smoke']).toBe('bazelisk run //:repo_smoke');
    expect(packageJson.scripts?.['bazel:quality']).toBe('bazelisk run //:repo_quality');
    expect(packageJson.scripts?.['bazel:regressions']).toBe('bazelisk run //:repo_regressions');
    expect(packageJson.scripts?.['bazel:ci']).toBe('bazelisk run //:repo_ci');
  });

  it('keeps the Node version mirror aligned with .nvmrc', () => {
    expect(readRepoFile('.node-version').trim()).toBe(nvmrc);
  });

  it('keeps .tool-versions aligned with the repo Node and Bun pins', () => {
    expect(toolVersions).toContain(`nodejs ${nvmrc}`);
    expect(toolVersions).toContain(`bun ${bunVersion}`);
  });

  it('uses .nvmrc for the repo workflows that follow the pinned Node toolchain', () => {
    expect(nvmrcWorkflowPaths.length).toBeGreaterThan(0);

    for (const workflowPath of nvmrcWorkflowPaths) {
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

  it('keeps dedicated Bazel repo-lane workflows aligned to the canonical npm entrypoints', () => {
    expect(bazelToolchainWorkflowText).toContain('name: Bazel Toolchain');
    expect(bazelToolchainWorkflowText).toContain('run: npm run bazel:toolchain');

    expect(bazelSmokeWorkflowText).toContain('name: Bazel Smoke');
    expect(bazelSmokeWorkflowText).toContain('run: npm run bazel:smoke');

    expect(bazelQualityWorkflowText).toContain('name: Bazel Quality');
    expect(bazelQualityWorkflowText).toContain('run: npm run bazel:quality');

    expect(bazelRegressionsWorkflowText).toContain('name: Bazel Regressions');
    expect(bazelRegressionsWorkflowText).toContain('run: npm run bazel:regressions');
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

  it('reruns path-filtered .nvmrc workflows when the repo Node pin changes', () => {
    expect(nvmrcPathFilteredWorkflowPaths.length).toBeGreaterThan(0);

    for (const workflowPath of nvmrcPathFilteredWorkflowPaths) {
      const workflowText = readRepoFile(workflowPath);
      expect(workflowText).toContain("      - '.nvmrc'");
    }
  });

  it('pins npm cache restoration to package-lock.json anywhere repo workflows cache npm', () => {
    expect(npmCacheWorkflowPaths.length).toBeGreaterThan(0);

    for (const workflowPath of npmCacheWorkflowPaths) {
      const workflowText = readRepoFile(workflowPath);
      expect(workflowText).toContain('cache-dependency-path: package-lock.json');
    }
  });

  it('reruns path-filtered npm ci workflows when package.json or package-lock.json changes', () => {
    expect(npmCiPathFilteredWorkflowPaths.length).toBeGreaterThan(0);

    for (const workflowPath of npmCiPathFilteredWorkflowPaths) {
      const workflowText = readRepoFile(workflowPath);
      expect(workflowText).toMatch(/['"]package\.json['"]/);
      expect(workflowText).toMatch(/['"]package-lock\.json['"]/);
    }
  });

  it('keeps pinned-Node docs anchored to .nvmrc instead of a hardcoded major', () => {
    for (const docPath of nodePinDocPaths) {
      const docText = readRepoFile(docPath);
      expect(docText).toContain('.nvmrc');
      expect(docText).not.toContain('Node 22');
    }
  });

  it('documents the Bazel repo lanes consistently across the build docs', () => {
    for (const surface of [buildReadmeText, buildBazelDocText]) {
      expect(surface).toContain('npm run bazel:toolchain');
      expect(surface).toContain('npm run bazel:smoke');
      expect(surface).toContain('npm run bazel:quality');
      expect(surface).toContain('npm run bazel:regressions');
      expect(surface).toContain('npm run bazel:ci');
    }
  });
});
