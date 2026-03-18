import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { analyzeNextRouteConfigReexports } from './lib/check-next-route-config-reexports.mjs';

const tempRoots = [];

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'next-route-config-reexports-'));
  tempRoots.push(root);
  return root;
};

const writeSource = (root, relativeFile, contents) => {
  const filePath = path.join(root, relativeFile);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
};

describe('analyzeNextRouteConfigReexports', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('flags named re-exports of Next route config fields', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/app/[locale]/auth/signin/page.tsx',
      "export { dynamic, default } from '../../../auth/signin/page';\n"
    );

    const report = analyzeNextRouteConfigReexports({ root });

    expect(report.summary.errorCount).toBe(1);
    expect(report.issues[0]).toMatchObject({
      ruleId: 'next-route-config-reexport',
      file: 'src/app/[locale]/auth/signin/page.tsx',
      message: expect.stringContaining('"dynamic"'),
    });
  });

  it('allows export-star wrappers used by route-handler shims', () => {
    const root = createTempRoot();
    writeSource(root, 'src/app/api/example/route.ts', "export * from './route-handler';\n");
    writeSource(
      root,
      'src/app/api/example/route-handler.ts',
      "export const runtime = 'nodejs';\nexport const GET = () => new Response(null, { status: 200 });\n"
    );

    const report = analyzeNextRouteConfigReexports({ root });

    expect(report.summary.errorCount).toBe(0);
    expect(report.issues).toEqual([]);
  });

  it('allows direct local route config exports', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/app/auth/register/page.tsx',
      "export const dynamic = 'force-dynamic';\nexport default function Page() { return null; }\n"
    );

    const report = analyzeNextRouteConfigReexports({ root });

    expect(report.summary.errorCount).toBe(0);
    expect(report.issues).toEqual([]);
  });

  it('allows wrappers that only forward supported page exports', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/app/[locale]/preview/[id]/page.tsx',
      "export { default, generateMetadata } from '../../../preview/[id]/page';\nexport const dynamic = 'force-dynamic';\n"
    );

    const report = analyzeNextRouteConfigReexports({ root });

    expect(report.summary.errorCount).toBe(0);
    expect(report.issues).toEqual([]);
  });
});
