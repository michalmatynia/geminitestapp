import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { analyzeRoutePolicies } from './lib/check-route-policies.mjs';

const tempRoots = [];

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'route-policy-'));
  tempRoots.push(root);
  return root;
};

const writeSource = (root, relativeFile, contents) => {
  const filePath = path.join(root, relativeFile);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
};

describe('analyzeRoutePolicies', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('warns on app routes with mismatched source metadata', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/app/api/products/route.ts',
      "import { apiHandler } from '@/shared/lib/api/api-handler';\nconst GET_handler = async () => new Response(null, { status: 200 });\nexport const GET = apiHandler(GET_handler, { source: 'wrong.source.GET' });\n"
    );

    const report = analyzeRoutePolicies({ root });

    expect(report.summary.errorCount).toBe(0);
    expect(report.summary.warningCount).toBe(1);
    expect(report.issues[0]).toMatchObject({
      ruleId: 'route-source-mismatch',
      file: 'src/app/api/products/route.ts',
      severity: 'warn',
    });
  });

  it('flags unreviewed CSRF opt-outs on mutating routes', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/app/api/products/route.ts',
      "import { apiHandler } from '@/shared/lib/api/api-handler';\nconst POST_handler = async () => new Response(null, { status: 200 });\nexport const POST = apiHandler(POST_handler, { source: 'products.POST', requireCsrf: false });\n"
    );

    const report = analyzeRoutePolicies({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'route-csrf-optout-unreviewed',
        }),
      ])
    );
  });

  it('warns when parseJsonBody is enabled without body schema', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/app/api/products/route.ts',
      "import { apiHandler } from '@/shared/lib/api/api-handler';\nconst POST_handler = async () => new Response(null, { status: 200 });\nexport const POST = apiHandler(POST_handler, { source: 'products.POST', parseJsonBody: true });\n"
    );

    const report = analyzeRoutePolicies({ root });

    expect(report.summary.errorCount).toBe(0);
    expect(report.summary.warningCount).toBe(1);
    expect(report.issues[0]).toMatchObject({
      ruleId: 'route-parsejson-without-bodyschema',
    });
  });

  it('allows forwarded route exports that alias feature-layer handlers', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/app/api/agentcreator/agent/route.ts',
      "import { GET as getAgentRuns } from '@/features/ai/agentcreator/api/agent/route';\nexport const GET = getAgentRuns;\n"
    );

    const report = analyzeRoutePolicies({ root });

    expect(report.summary.errorCount).toBe(0);
    expect(report.summary.warningCount).toBe(0);
  });
});
