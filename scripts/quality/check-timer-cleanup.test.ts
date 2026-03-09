import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { analyzeTimerCleanup } from './lib/check-timer-cleanup.mjs';

const tempRoots: string[] = [];

const createTempRoot = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'timer-cleanup-'));
  tempRoots.push(root);
  return root;
};

const writeSource = (root: string, relativeFile: string, contents: string): void => {
  const filePath = path.join(root, relativeFile);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
};

describe('analyzeTimerCleanup', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('flags missing timer and listener cleanup in components and hooks', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/Dashboard.tsx',
      [
        'export function Dashboard(): null {',
        "  setInterval(() => console.log('tick'), 1000);",
        "  window.addEventListener('resize', () => {});",
        '  return null;',
        '}',
        '',
      ].join('\n')
    );
    writeSource(
      root,
      'src/usePoller.ts',
      [
        "import { useEffect } from 'react';",
        'export function usePoller(): void {',
        '  useEffect(() => {',
        "    setTimeout(() => console.log('later'), 1000);",
        '  }, []);',
        '}',
        '',
      ].join('\n')
    );

    const report = analyzeTimerCleanup({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'setinterval-no-cleanup',
          file: 'src/Dashboard.tsx',
        }),
        expect.objectContaining({
          ruleId: 'addeventlistener-no-removal',
          file: 'src/Dashboard.tsx',
        }),
        expect.objectContaining({
          ruleId: 'settimeout-no-cleanup',
          file: 'src/usePoller.ts',
        }),
      ])
    );
  });

  it('passes files that clean up timers and listeners', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/SafePanel.tsx',
      [
        "import { useEffect } from 'react';",
        'export function SafePanel(): null {',
        '  useEffect(() => {',
        "    const timer = setInterval(() => console.log('tick'), 1000);",
        "    const later = setTimeout(() => console.log('later'), 1000);",
        "    const handler = () => console.log('resize');",
        "    window.addEventListener('resize', handler);",
        '    return () => {',
        '      clearInterval(timer);',
        '      clearTimeout(later);',
        "      window.removeEventListener('resize', handler);",
        '    };',
        '  }, []);',
        '  return null;',
        '}',
        '',
      ].join('\n')
    );

    const report = analyzeTimerCleanup({ root });

    expect(report.summary.errorCount).toBe(0);
    expect(report.summary.warningCount).toBe(0);
  });
});
