import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const readRepoFile = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const packageJson = JSON.parse(readRepoFile('package.json')) as {
  scripts?: Record<string, string>;
};

describe('Vercel production sync workflow contract', () => {
  it('keeps a scheduled and manually repairable workflow for the StudiQ production alias', () => {
    const workflowText = readRepoFile('.github/workflows/vercel-production-sync.yml');

    expect(workflowText).toContain('name: vercel-production-sync');
    expect(workflowText).toContain('workflow_dispatch:');
    expect(workflowText).toContain('mode:');
    expect(workflowText).toContain('default: check');
    expect(workflowText).toContain('- check');
    expect(workflowText).toContain('- repair');
    expect(workflowText).toContain('cron: \'17 * * * *\'');
    expect(workflowText).toContain('VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}');
    expect(workflowText).toContain('if: ${{ env.VERCEL_TOKEN == \'\' }}');
    expect(workflowText).toContain('if: ${{ env.VERCEL_TOKEN != \'\' }}');
    expect(workflowText).toContain('actions/checkout@v4');
    expect(workflowText).toContain('actions/setup-node@v4');
    expect(workflowText).toContain('node-version-file: \'.nvmrc\'');
    expect(workflowText).toContain('run: npm run check:vercel:production:sync');
    expect(workflowText).toContain('run: npm run repair:vercel:production:sync');
  });

  it('keeps the build and toolchain contract bundles aware of the Vercel sync guardrail', () => {
    const buildReadmeText = readRepoFile('docs/build/README.md');
    const buildContractScript = packageJson.scripts?.['test:build:contracts'];
    const toolchainContractScript = packageJson.scripts?.['test:toolchain:contract'];

    expect(buildReadmeText).toContain('npm run check:vercel:production:sync');
    expect(buildContractScript).toContain('scripts/build/check-vercel-production-alias-sync.test.ts');
    expect(toolchainContractScript).toContain('scripts/quality/vercel-production-sync-workflow-contract.test.ts');
  });
});
