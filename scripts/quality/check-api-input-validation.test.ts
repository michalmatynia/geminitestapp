import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { analyzeApiInputValidation } from './lib/check-api-input-validation.mjs';

const tempRoots: string[] = [];

const createTempRoot = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'api-input-validation-'));
  tempRoots.push(root);
  return root;
};

const writeSource = (root: string, relativeFile: string, contents: string): void => {
  const filePath = path.join(root, relativeFile);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
};

describe('analyzeApiInputValidation', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('does not warn on handler searchParams when sibling route defines querySchema', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/app/api/products/route.ts',
      [
        "import { apiHandler } from '@/shared/lib/api/api-handler';",
        "import { GET_handler, querySchema } from './handler';",
        '',
        "export const GET = apiHandler(GET_handler, { source: 'products.GET', querySchema });",
        '',
      ].join('\n')
    );
    writeSource(
      root,
      'src/app/api/products/handler.ts',
      [
        'export const querySchema = {};',
        'export async function GET_handler(req: Request): Promise<Response> {',
        "  const page = new URL(req.url).searchParams.get('page');",
        '  return Response.json({ page });',
        '}',
        '',
      ].join('\n')
    );

    const report = analyzeApiInputValidation({ root });

    expect(report.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'query-param-unvalidated',
          file: 'src/app/api/products/handler.ts',
        }),
      ])
    );
  });

  it('does not warn on dynamic params when sibling route uses apiHandlerWithParams type args', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/app/api/products/[id]/route.ts',
      [
        "import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';",
        "import { GET_handler } from './handler';",
        '',
        "export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, { source: 'products.[id].GET' });",
        '',
      ].join('\n')
    );
    writeSource(
      root,
      'src/app/api/products/[id]/handler.ts',
      [
        'export async function GET_handler(_req: Request, _ctx: unknown, params: { id: string }): Promise<Response> {',
        '  return Response.json({ id: params.id });',
        '}',
        '',
      ].join('\n')
    );

    const report = analyzeApiInputValidation({ root });

    expect(report.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'url-param-unvalidated',
          file: 'src/app/api/products/[id]/handler.ts',
        }),
      ])
    );
  });

  it('still warns on unvalidated searchParams without route metadata', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/app/api/products/handler.ts',
      [
        'export async function GET_handler(req: Request): Promise<Response> {',
        "  const page = new URL(req.url).searchParams.get('page');",
        '  return Response.json({ page });',
        '}',
        '',
      ].join('\n')
    );

    const report = analyzeApiInputValidation({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'query-param-unvalidated',
          file: 'src/app/api/products/handler.ts',
        }),
      ])
    );
  });
});
