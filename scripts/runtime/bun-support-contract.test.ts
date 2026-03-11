import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const workflowDirectory = path.join(repoRoot, '.github', 'workflows');
const readRepoFile = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as {
  engines?: Record<string, string>;
  packageManager?: string;
  scripts?: Record<string, string>;
};
const workflowPaths = fs
  .readdirSync(workflowDirectory)
  .filter((entry) => entry.endsWith('.yml'))
  .map((entry) => `.github/workflows/${entry}`);
const bunWorkflowPaths = workflowPaths.filter((workflowPath) =>
  readRepoFile(workflowPath).includes('oven-sh/setup-bun@')
);
const bunCacheWorkflowPaths = workflowPaths.filter((workflowPath) =>
  readRepoFile(workflowPath).includes('~/.bun/install/cache')
);
const expectedBunVersion = readRepoFile('.bun-version').trim();
const expectedNodeVersion = readRepoFile('.nvmrc').trim();
const mirroredNodeVersion = readRepoFile('.node-version').trim();
const bunCompatibilityWorkflowText = readRepoFile('.github/workflows/bun-compatibility.yml');
const bunSupportDocText = readRepoFile('docs/platform/bun-support.md');
const buildReadmeText = readRepoFile('docs/build/README.md');
const buildBazelDocText = readRepoFile('docs/build/bazel.md');
const agentsDocText = readRepoFile('docs/AGENTS.md');
const copilotDocText = readRepoFile('docs/COPILOT.md');
const vitestConfigText = readRepoFile('vitest.config.ts');

describe('Bun support contract', () => {
  it('keeps the shared Bun compatibility script composed from repo-level subcommands', () => {
    const nodeToolchainContractScript = packageJson.scripts?.['check:toolchain:contract:node'];
    const toolchainContractTestScript = packageJson.scripts?.['test:toolchain:contract'];
    const toolchainContractScript = packageJson.scripts?.['check:toolchain:contract'];
    const compatibilityScript = packageJson.scripts?.['check:bun:compat'];
    const runtimeSuiteScript = packageJson.scripts?.['test:bun:runtime'];
    const syncMirrorsScript = packageJson.scripts?.['sync:toolchain:mirrors'];
    const bunConfigScript = packageJson.scripts?.['check:bun:config'];

    expect(packageJson.packageManager).toMatch(/^npm@\d+\.\d+\.\d+$/);
    expect(packageJson.engines?.bun).toBe(expectedBunVersion);
    expect(bunConfigScript).toBe('node scripts/runtime/check-bun-config.cjs');
    expect(nodeToolchainContractScript).toContain('node scripts/runtime/check-package-manager-contract.cjs');
    expect(nodeToolchainContractScript).toContain('node scripts/runtime/check-node-toolchain-sync.cjs');
    expect(nodeToolchainContractScript).toContain('node scripts/runtime/check-bun-config.cjs');
    expect(toolchainContractTestScript).toContain('scripts/runtime/check-bun-config.test.ts');
    expect(toolchainContractTestScript).toContain('scripts/runtime/check-bun-runtime.test.ts');
    expect(toolchainContractTestScript).toContain('scripts/runtime/check-node-version.test.ts');
    expect(toolchainContractTestScript).toContain('scripts/runtime/check-package-manager-contract.test.ts');
    expect(toolchainContractTestScript).toContain('scripts/runtime/check-node-toolchain-sync.test.ts');
    expect(toolchainContractTestScript).toContain('scripts/runtime/sync-toolchain-mirrors.test.ts');
    expect(toolchainContractTestScript).toContain('scripts/runtime/node-toolchain-contract.test.ts');
    expect(toolchainContractTestScript).toContain('scripts/runtime/bun-support-contract.test.ts');
    expect(syncMirrorsScript).toBe('node scripts/runtime/sync-toolchain-mirrors.cjs');
    expect(toolchainContractScript).toContain('bun run check:toolchain:contract:node');
    expect(toolchainContractScript).not.toContain('bun run check:bun:config');
    expect(toolchainContractScript).toContain('bun run check:bun:version');
    expect(toolchainContractScript).toContain('bun run check:bun:lock-sync');
    expect(compatibilityScript).toContain('bun run check:toolchain:contract');
    expect(compatibilityScript).toContain('bun run test:bun:runtime');
    expect(compatibilityScript).toContain('bun run lint -- --help');
    expect(compatibilityScript).toContain('bun run check:unsafe-patterns -- --no-write');

    expect(runtimeSuiteScript).toContain('bun run test:toolchain:contract');
  });

  it('keeps Bun workflows pinned to the repo version file and the shared compatibility entrypoint', () => {
    expect(mirroredNodeVersion).toBe(expectedNodeVersion);
    expect(bunWorkflowPaths.length).toBeGreaterThan(0);

    for (const workflowPath of bunWorkflowPaths) {
      const workflowText = readRepoFile(workflowPath);
      expect(workflowText).toContain("bun-version-file: '.bun-version'");
    }

    expect(bunCompatibilityWorkflowText).toContain("node-version-file: '.nvmrc'");
    expect(bunCompatibilityWorkflowText).toContain('run: bun install --frozen-lockfile');
    expect(bunCompatibilityWorkflowText).toContain('run: bun run check:bun:compat');
  });

  it('pins Bun cache restoration to the repo toolchain, config, and lockfiles anywhere workflows cache Bun', () => {
    expect(bunCacheWorkflowPaths.length).toBeGreaterThan(0);

    for (const workflowPath of bunCacheWorkflowPaths) {
      const workflowText = readRepoFile(workflowPath);
      expect(workflowText).toContain(
        "hashFiles('.nvmrc', '.node-version', '.tool-versions', '.bun-version', 'bunfig.toml', 'package-lock.json', 'bun.lock')"
      );
    }
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
    expect(bunSupportDocText).toContain('bun run check:bun:config');
    expect(bunSupportDocText).toContain('bun run check:toolchain:contract');
    expect(bunSupportDocText).toContain('bun run check:bun:compat');
    expect(bunSupportDocText).toContain('Any workflow that resolves Bun');
    expect(bunSupportDocText).toContain('Any workflow that caches Bun');
    expect(bunSupportDocText).not.toContain('bun run check:toolchain:contract:node');
  });

  it('keeps the other build and agent docs aligned to the shared toolchain commands', () => {
    const docSurfaces = [buildReadmeText, buildBazelDocText, agentsDocText, copilotDocText];

    for (const surface of docSurfaces) {
      expect(surface).toContain('npm run sync:toolchain:mirrors');
      expect(surface).toContain('npm run check:toolchain:contract:node');
      expect(surface).toContain('npm run test:toolchain:contract');
      expect(surface).toContain('bun run check:bun:config');
      expect(surface).toContain('bun run check:toolchain:contract');
      expect(surface).toContain('bun run check:bun:compat');
      expect(surface).not.toContain('bun run check:toolchain:contract:node');
    }
  });
});
