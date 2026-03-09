import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { analyzeApiErrorSources } from './lib/check-api-error-sources.mjs';

const tempRoots: string[] = [];

const createTempRoot = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'api-error-sources-'));
  tempRoots.push(root);
  return root;
};

const writeSource = (root: string, relativeFile: string, contents: string): void => {
  const filePath = path.join(root, relativeFile);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
};

describe('analyzeApiErrorSources', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('allows apiHandlerWithParams routes with generic type parameters', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/app/api/products/[id]/route.ts',
      [
        'import { apiHandlerWithParams } from \'@/shared/lib/api/api-handler\';',
        'import { GET_handler } from \'./handler\';',
        '',
        'export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {',
        '  source: \'products.[id].GET\',',
        '});',
        '',
      ].join('\n')
    );

    const report = analyzeApiErrorSources({ root });

    expect(report.summary.errorCount).toBe(0);
    expect(report.summary.warningCount).toBe(0);
  });

  it('allows delegated method exports imported from route modules', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/app/api/agentcreator/agent/route.ts',
      [
        'import { GET as getAgentRuns } from \'@/features/ai/agentcreator/api/agent/route\';',
        '',
        'export const GET = getAgentRuns;',
        '',
      ].join('\n')
    );

    const report = analyzeApiErrorSources({ root });

    expect(report.summary.errorCount).toBe(0);
    expect(report.summary.warningCount).toBe(0);
  });

  it('ignores intentional 204 empty responses in handlers', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/app/api/files/[id]/handler.ts',
      [
        'export async function DELETE_handler(): Promise<Response> {',
        '  return new Response(null, { status: 204 });',
        '}',
        '',
      ].join('\n')
    );

    const report = analyzeApiErrorSources({ root });

    expect(report.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'raw-new-response',
        }),
      ])
    );
  });

  it('ignores intentional streaming responses in handlers', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/app/api/chat/stream/handler.ts',
      [
        'export async function GET_handler(): Promise<Response> {',
        '  const stream = new ReadableStream();',
        '  return new Response(stream, {',
        '    headers: {',
        '      \'Content-Type\': \'text/event-stream\',',
        '    },',
        '  });',
        '}',
        '',
      ].join('\n')
    );

    const report = analyzeApiErrorSources({ root });

    expect(report.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'raw-new-response',
        }),
      ])
    );
  });

  it('still warns on unchecked req.json in handlers', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/app/api/products/handler.ts',
      [
        'export async function POST_handler(req: Request): Promise<Response> {',
        '  const body = await req.json();',
        '  return Response.json(body);',
        '}',
        '',
      ].join('\n')
    );

    const report = analyzeApiErrorSources({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'unchecked-req-json',
          file: 'src/app/api/products/handler.ts',
        }),
      ])
    );
  });
});
