import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { analyzeSecurityStatic } from './lib/check-security-static.mjs';

const tempRoots = [];

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'security-static-'));
  tempRoots.push(root);
  return root;
};

const writeSource = (root, relativeFile, contents) => {
  const filePath = path.join(root, relativeFile);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
};

describe('analyzeSecurityStatic', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('flags target blank links without rel isolation', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/app.tsx',
      'export function App() { return <a href=\'https://example.com\' target=\'_blank\'>Open</a>; }\n'
    );

    const report = analyzeSecurityStatic({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'jsx-target-blank-missing-rel',
        }),
      ])
    );
  });

  it('allows reviewed document.cookie helpers', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/shared/lib/security/csrf-client.ts',
      'export const readCookie = () => document.cookie;\n'
    );

    const report = analyzeSecurityStatic({ root });

    expect(report.summary.warningCount).toBe(0);
  });

  it('warns on dangerouslySetInnerHTML without sanitize markers', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/ui.tsx',
      'export function Html({ value }: { value: string }) { return <div dangerouslySetInnerHTML={{ __html: value }} />; }\n'
    );

    const report = analyzeSecurityStatic({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'dangerouslysetinnerhtml-review',
        }),
      ])
    );
  });
});
