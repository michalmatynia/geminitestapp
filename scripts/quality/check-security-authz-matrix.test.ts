import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { analyzeSecurityAuthzMatrix } from './lib/check-security-authz-matrix.mjs';

const tempRoots = [];

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'security-authz-matrix-'));
  tempRoots.push(root);
  return root;
};

const writeFile = (root, relativeFile, contents) => {
  const filePath = path.join(root, relativeFile);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
};

const writeRoute = ({
  root,
  routePath,
  method = 'GET',
  handlerName = `${method}_handler`,
  handlerSource = `export async function ${handlerName}() { return Response.json({ ok: true }); }`,
  options = "{ source: 'test.route' }",
}) => {
  writeFile(
    root,
    path.join('src', 'app', 'api', routePath, 'route.ts'),
    `import { apiHandler } from '@/shared/lib/api/api-handler';\nimport { ${handlerName} } from './handler';\nexport const ${method} = apiHandler(${handlerName}, ${options});\n`
  );
  writeFile(root, path.join('src', 'app', 'api', routePath, 'handler.ts'), `${handlerSource}\n`);
};

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('analyzeSecurityAuthzMatrix', () => {
  it('fails protected routes without auth evidence', () => {
    const root = createTempRoot();
    writeRoute({ root, routePath: 'settings/providers' });

    const report = analyzeSecurityAuthzMatrix({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'authz-protected-route-missing-auth-check',
        }),
      ])
    );
  });

  it('allows public telemetry ingress without auth evidence', () => {
    const root = createTempRoot();
    writeRoute({
      root,
      routePath: 'analytics/events',
      method: 'POST',
    });

    const report = analyzeSecurityAuthzMatrix({ root });

    expect(report.summary.errorCount).toBe(0);
  });

  it('accepts signed ingress routes with signature verification', () => {
    const root = createTempRoot();
    writeRoute({
      root,
      routePath: 'ai-paths/portable-engine/remediation-webhook',
      method: 'POST',
      handlerSource:
        "export async function POST_handler() { await verifyPortablePathWebhookSignature({}); return Response.json({ ok: true }); }",
    });

    const report = analyzeSecurityAuthzMatrix({ root });

    expect(report.summary.errorCount).toBe(0);
  });

  it('accepts actor-scoped routes that resolve a Kangur actor', () => {
    const root = createTempRoot();
    writeRoute({
      root,
      routePath: 'kangur/progress',
      method: 'GET',
      handlerName: 'getKangurProgressHandler',
      handlerSource:
        "export async function getKangurProgressHandler(req) { await resolveKangurActor(req); return Response.json({ ok: true }); }",
    });

    const report = analyzeSecurityAuthzMatrix({ root });

    expect(report.summary.errorCount).toBe(0);
  });

  it('warns privileged routes that only resolve a basic session', () => {
    const root = createTempRoot();
    writeRoute({
      root,
      routePath: 'auth/users',
      method: 'GET',
      handlerSource:
        "export async function GET_handler() { const session = await auth(); if (!session?.user) throw new Error('Unauthorized.'); return Response.json({ ok: true }); }",
    });

    const report = analyzeSecurityAuthzMatrix({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'authz-privileged-route-missing-explicit-permission-gate',
          severity: 'warn',
        }),
      ])
    );
  });

  it('follows direct method imports through the @/ alias into feature route files', () => {
    const root = createTempRoot();
    writeFile(
      root,
      path.join('src', 'app', 'api', 'agentcreator', 'agent', 'route.ts'),
      [
        "import { GET as getAgentRuns } from '@/features/ai/agentcreator/api/agent/route';",
        'export const GET = getAgentRuns;',
      ].join('\n')
    );
    writeFile(
      root,
      path.join('src', 'features', 'ai', 'agentcreator', 'api', 'agent', 'route.ts'),
      [
        "import { apiHandler } from '@/shared/lib/api/api-handler';",
        '',
        'async function GET_handler() {',
        '  await requireAgentCreatorAccess();',
        '  return Response.json({ ok: true });',
        '}',
        '',
        "export const GET = apiHandler(GET_handler, { source: 'agentcreator.agent.GET' });",
      ].join('\n')
    );

    const report = analyzeSecurityAuthzMatrix({ root });

    expect(report.summary.errorCount).toBe(0);
    expect(report.summary.warningCount).toBe(0);
  });

  it('follows named re-exports through server barrels', () => {
    const root = createTempRoot();
    writeFile(
      root,
      path.join('src', 'app', 'api', 'chatbot', 'agent', '[runId]', 'assets', '[file]', 'route.ts'),
      "export { AgentCreatorAgentRunAssetsGET as GET } from '@/features/ai/agentcreator/server';\n"
    );
    writeFile(
      root,
      path.join('src', 'features', 'ai', 'agentcreator', 'server.ts'),
      "export { GET as AgentCreatorAgentRunAssetsGET } from './api/agent/[runId]/assets/[file]/route';\n"
    );
    writeFile(
      root,
      path.join(
        'src',
        'features',
        'ai',
        'agentcreator',
        'api',
        'agent',
        '[runId]',
        'assets',
        '[file]',
        'route.ts'
      ),
      [
        "import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';",
        '',
        'async function GET_handler() {',
        '  const session = await auth();',
        "  if (!session?.user) throw new Error('Unauthorized');",
        '  return Response.json({ ok: true });',
        '}',
        '',
        "export const GET = apiHandlerWithParams(GET_handler, { source: 'agentcreator.assets.GET' });",
      ].join('\n')
    );

    const report = analyzeSecurityAuthzMatrix({ root });

    expect(report.summary.errorCount).toBe(0);
    expect(report.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'authz-handler-source-unresolved',
        }),
      ])
    );
  });
});
