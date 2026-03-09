import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { analyzeApiContractCoverage } from './lib/check-api-contract-coverage.mjs';

const tempRoots = [];

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'api-contract-coverage-'));
  tempRoots.push(root);
  return root;
};

const writeFile = (root, relativeFile, contents) => {
  const filePath = path.join(root, relativeFile);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
};

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('analyzeApiContractCoverage', () => {
  it('accepts validated mutations with nearby tests', () => {
    const root = createTempRoot();
    writeFile(
      root,
      path.join('src', 'app', 'api', 'settings', 'route.ts'),
      [
        'import { apiHandler } from \'@/shared/lib/api/api-handler\';',
        'import { POST_handler, payloadSchema } from \'./handler\';',
        '',
        'export const POST = apiHandler(POST_handler, {',
        '  source: \'settings.POST\',',
        '  parseJsonBody: true,',
        '  bodySchema: payloadSchema,',
        '});',
      ].join('\n')
    );
    writeFile(
      root,
      path.join('src', 'app', 'api', 'settings', 'handler.ts'),
      [
        'export const payloadSchema = {};',
        'export async function POST_handler(_req, ctx) {',
        '  return Response.json({ ok: Boolean(ctx.body) });',
        '}',
      ].join('\n')
    );
    writeFile(
      root,
      path.join('src', 'app', 'api', 'settings', 'handler.test.ts'),
      'export {};\n'
    );

    const report = analyzeApiContractCoverage({ root });

    expect(report.summary.errorCount).toBe(0);
    expect(report.summary.warningCount).toBe(0);
  });

  it('fails mutations that read request bodies without validation', () => {
    const root = createTempRoot();
    writeFile(
      root,
      path.join('src', 'app', 'api', 'chatbot', 'jobs', 'route.ts'),
      [
        'import { apiHandler } from \'@/shared/lib/api/api-handler\';',
        'import { POST_handler } from \'./handler\';',
        'export const POST = apiHandler(POST_handler, { source: \'chatbot.jobs.POST\' });',
      ].join('\n')
    );
    writeFile(
      root,
      path.join('src', 'app', 'api', 'chatbot', 'jobs', 'handler.ts'),
      [
        'export async function POST_handler(req) {',
        '  const body = await req.json();',
        '  return Response.json({ body });',
        '}',
      ].join('\n')
    );
    writeFile(
      root,
      path.join('src', 'app', 'api', 'chatbot', 'jobs', 'handler.test.ts'),
      'export {};\n'
    );

    const report = analyzeApiContractCoverage({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'api-contract-mutation-missing-body-validation',
          severity: 'error',
        }),
      ])
    );
  });

  it('warns query routes that read search params without validation', () => {
    const root = createTempRoot();
    writeFile(
      root,
      path.join('src', 'app', 'api', 'analytics', 'summary', 'route.ts'),
      [
        'import { apiHandler } from \'@/shared/lib/api/api-handler\';',
        'import { GET_handler } from \'./handler\';',
        'export const GET = apiHandler(GET_handler, { source: \'analytics.summary.GET\' });',
      ].join('\n')
    );
    writeFile(
      root,
      path.join('src', 'app', 'api', 'analytics', 'summary', 'handler.ts'),
      [
        'export async function GET_handler(req) {',
        '  const range = req.nextUrl.searchParams.get(\'range\');',
        '  return Response.json({ range });',
        '}',
      ].join('\n')
    );
    writeFile(
      root,
      path.join('src', 'app', 'api', 'analytics', 'summary', 'handler.test.ts'),
      'export {};\n'
    );

    const report = analyzeApiContractCoverage({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'api-contract-query-route-missing-query-validation',
          severity: 'warn',
        }),
      ])
    );
  });

  it('warns protected routes without adjacent tests', () => {
    const root = createTempRoot();
    writeFile(
      root,
      path.join('src', 'app', 'api', 'system', 'logs', 'route.ts'),
      [
        'import { apiHandler } from \'@/shared/lib/api/api-handler\';',
        'import { POST_handler } from \'./handler\';',
        'export const POST = apiHandler(POST_handler, { source: \'system.logs.POST\' });',
      ].join('\n')
    );
    writeFile(
      root,
      path.join('src', 'app', 'api', 'system', 'logs', 'handler.ts'),
      [
        'export async function POST_handler(req) {',
        '  return Response.json({ ok: Boolean(req) });',
        '}',
      ].join('\n')
    );

    const report = analyzeApiContractCoverage({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'api-contract-route-missing-tests',
          severity: 'warn',
        }),
      ])
    );
  });

  it('credits test coverage for feature-layer re-exports', () => {
    const root = createTempRoot();
    writeFile(
      root,
      path.join('src', 'app', 'api', 'agentcreator', 'agent', 'route.ts'),
      [
        'import { GET as getAgentRuns } from \'@/features/ai/agentcreator/api/agent/route\';',
        'export const GET = getAgentRuns;',
      ].join('\n')
    );
    writeFile(
      root,
      path.join('src', 'features', 'ai', 'agentcreator', 'api', 'agent', 'route.ts'),
      [
        'import { apiHandler } from \'@/shared/lib/api/api-handler\';',
        '',
        'async function GET_handler() {',
        '  return Response.json({ ok: true });',
        '}',
        '',
        'export const GET = apiHandler(GET_handler, { source: \'agentcreator.agent.GET\' });',
      ].join('\n')
    );
    writeFile(
      root,
      path.join('src', 'features', 'ai', 'agentcreator', 'api', 'agent', 'route.test.ts'),
      'export {};\n'
    );

    const report = analyzeApiContractCoverage({ root });

    expect(report.summary.errorCount).toBe(0);
    expect(report.summary.warningCount).toBe(0);
  });
});
