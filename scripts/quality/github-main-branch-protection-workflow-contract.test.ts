import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const readRepoFile = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const packageJson = JSON.parse(readRepoFile('package.json')) as {
  scripts?: Record<string, string>;
};

describe('GitHub main branch protection workflow contract', () => {
  it('keeps a scheduled and manually repairable workflow for main branch protection drift', () => {
    const workflowText = readRepoFile('.github/workflows/github-main-branch-protection.yml');

    expect(workflowText).toContain('name: github-main-branch-protection');
    expect(workflowText).toContain('workflow_dispatch:');
    expect(workflowText).toContain('mode:');
    expect(workflowText).toContain('default: check');
    expect(workflowText).toContain('- check');
    expect(workflowText).toContain('- repair');
    expect(workflowText).toContain("cron: '47 * * * *'");
    expect(workflowText).toContain("GH_ADMIN_TOKEN: ${{ secrets.GH_ADMIN_TOKEN }}");
    expect(workflowText).toContain("if: ${{ env.GH_ADMIN_TOKEN == '' }}");
    expect(workflowText).toContain("if: ${{ env.GH_ADMIN_TOKEN != '' }}");
    expect(workflowText).toContain('actions/checkout@v4');
    expect(workflowText).toContain('actions/setup-node@v4');
    expect(workflowText).toContain("node-version-file: '.nvmrc'");
    expect(workflowText).toContain('run: npm run check:github:branch-protection');
    expect(workflowText).toContain('run: npm run repair:github:branch-protection');
  });

  it('keeps the build and toolchain contract bundles aware of the GitHub branch protection guardrail', () => {
    const buildReadmeText = readRepoFile('docs/build/README.md');
    const buildContractScript = packageJson.scripts?.['test:build:contracts'];
    const toolchainContractScript = packageJson.scripts?.['test:toolchain:contract'];

    expect(buildReadmeText).toContain('npm run check:github:branch-protection');
    expect(buildContractScript).toContain('scripts/build/check-github-main-branch-protection.test.ts');
    expect(toolchainContractScript).toContain('scripts/quality/github-main-branch-protection-workflow-contract.test.ts');
  });
});
