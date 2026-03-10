import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as {
  engines?: Record<string, string>;
  packageManager?: string;
  scripts?: Record<string, string>;
};
const expectedBunVersion = fs.readFileSync(path.join(repoRoot, '.bun-version'), 'utf8').trim();
const expectedNodeVersion = fs.readFileSync(path.join(repoRoot, '.nvmrc'), 'utf8').trim();
const mirroredNodeVersion = fs.readFileSync(path.join(repoRoot, '.node-version'), 'utf8').trim();
const workflowText = fs.readFileSync(
  path.join(repoRoot, '.github', 'workflows', 'bun-compatibility.yml'),
  'utf8'
);
const bunSupportDocText = fs.readFileSync(path.join(repoRoot, 'docs', 'platform', 'bun-support.md'), 'utf8');
const buildReadmeText = fs.readFileSync(path.join(repoRoot, 'docs', 'build', 'README.md'), 'utf8');
const buildBazelDocText = fs.readFileSync(path.join(repoRoot, 'docs', 'build', 'bazel.md'), 'utf8');
const agentsDocText = fs.readFileSync(path.join(repoRoot, 'docs', 'AGENTS.md'), 'utf8');
const copilotDocText = fs.readFileSync(path.join(repoRoot, 'docs', 'COPILOT.md'), 'utf8');
const vitestConfigText = fs.readFileSync(path.join(repoRoot, 'vitest.config.ts'), 'utf8');

describe('Bun support contract', () => {
  it('keeps the shared Bun compatibility script composed from repo-level subcommands', () => {
    const nodeToolchainContractScript = packageJson.scripts?.['check:toolchain:contract:node'];
    const toolchainContractTestScript = packageJson.scripts?.['test:toolchain:contract'];
    const toolchainContractScript = packageJson.scripts?.['check:toolchain:contract'];
    const compatibilityScript = packageJson.scripts?.['check:bun:compat'];
    const runtimeSuiteScript = packageJson.scripts?.['test:bun:runtime'];
    const syncMirrorsScript = packageJson.scripts?.['sync:toolchain:mirrors'];

    expect(packageJson.packageManager).toBe('npm@11.7.0');
    expect(packageJson.engines?.bun).toBe(expectedBunVersion);
    expect(nodeToolchainContractScript).toContain('node scripts/runtime/check-package-manager-contract.cjs');
    expect(nodeToolchainContractScript).toContain('node scripts/runtime/check-node-toolchain-sync.cjs');
    expect(toolchainContractTestScript).toContain('scripts/runtime/check-bun-runtime.test.ts');
    expect(toolchainContractTestScript).toContain('scripts/runtime/check-package-manager-contract.test.ts');
    expect(toolchainContractTestScript).toContain('scripts/runtime/check-node-toolchain-sync.test.ts');
    expect(toolchainContractTestScript).toContain('scripts/runtime/sync-toolchain-mirrors.test.ts');
    expect(toolchainContractTestScript).toContain('scripts/runtime/node-toolchain-contract.test.ts');
    expect(toolchainContractTestScript).toContain('scripts/runtime/bun-support-contract.test.ts');
    expect(syncMirrorsScript).toBe('node scripts/runtime/sync-toolchain-mirrors.cjs');
    expect(toolchainContractScript).toContain('bun run check:toolchain:contract:node');
    expect(toolchainContractScript).toContain('bun run check:bun:version');
    expect(toolchainContractScript).toContain('bun run check:bun:lock-sync');
    expect(compatibilityScript).toContain('bun run check:toolchain:contract');
    expect(compatibilityScript).toContain('bun run test:bun:runtime');
    expect(compatibilityScript).toContain('bun run lint -- --help');
    expect(compatibilityScript).toContain('bun run check:unsafe-patterns -- --no-write');

    expect(runtimeSuiteScript).toContain('bun run test:toolchain:contract');
  });

  it('keeps the Bun workflow pinned to the repo version file and shared compatibility entrypoint', () => {
    expect(mirroredNodeVersion).toBe(expectedNodeVersion);
    expect(workflowText).toContain("node-version-file: '.nvmrc'");
    expect(workflowText).toContain("bun-version-file: '.bun-version'");
    expect(workflowText).toContain(
      "hashFiles('.nvmrc', '.node-version', '.tool-versions', '.bun-version', 'package-lock.json', 'bun.lock')"
    );
    expect(workflowText).toContain('run: bun install --frozen-lockfile');
    expect(workflowText).toContain('run: bun run check:bun:compat');
  });

  it('keeps Bazel workspace mirrors excluded from Vitest project discovery', () => {
    expect(vitestConfigText).toContain("'bazel-geminitestapp/**'");
    expect(vitestConfigText).toContain("'bazel-bin/**'");
    expect(vitestConfigText).toContain("'bazel-out/**'");
    expect(vitestConfigText).toContain("'bazel-testlogs/**'");
  });

  it('documents the Node-first and Bun-wrapped toolchain commands consistently', () => {
    expect(bunSupportDocText).toContain('npm run sync:toolchain:mirrors');
    expect(bunSupportDocText).toContain('npm run check:toolchain:contract:node');
    expect(bunSupportDocText).toContain('npm run test:toolchain:contract');
    expect(bunSupportDocText).toContain('bun run check:toolchain:contract');
    expect(bunSupportDocText).not.toContain('bun run check:toolchain:contract:node');
  });

  it('keeps the other build and agent docs aligned to the shared toolchain commands', () => {
    const docSurfaces = [buildReadmeText, buildBazelDocText, agentsDocText, copilotDocText];

    for (const surface of docSurfaces) {
      expect(surface).toContain('npm run sync:toolchain:mirrors');
      expect(surface).toContain('npm run check:toolchain:contract:node');
      expect(surface).toContain('npm run test:toolchain:contract');
      expect(surface).toContain('bun run check:toolchain:contract');
      expect(surface).not.toContain('bun run check:toolchain:contract:node');
    }
  });
});
