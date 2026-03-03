import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runObservabilityCheck } from './check-observability.mjs';

const tempRoots: string[] = [];

const createTempRoot = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'obs-check-'));
  tempRoots.push(root);
  return root;
};

const writeSource = (root: string, relativeFile: string, contents: string): void => {
  const filePath = path.join(root, relativeFile);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
};

describe('runObservabilityCheck logger enforcement', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('fails when logger call does not provide service context', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/bad-log.ts',
      "import { logger } from '@/shared/utils/logger';\nlogger.info('missing service');\n"
    );

    const report = runObservabilityCheck({
      mode: 'check',
      root,
      srcDir: 'src',
      apiDir: 'src/app/api',
      allowPartial: true,
    });

    expect(report.status).toBe('failed');
    expect(report.logger.totalViolations).toBe(1);
    expect(report.logger.violations[0]).toMatchObject({
      file: 'src/bad-log.ts',
    });
  });

  it('passes when logger call includes canonical service prefix', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/good-log.ts',
      "import { logger } from '@/shared/utils/logger';\nlogger.info('[observability.check] passed');\n"
    );

    const report = runObservabilityCheck({
      mode: 'check',
      root,
      srcDir: 'src',
      apiDir: 'src/app/api',
      allowPartial: true,
    });

    expect(report.status).toBe('passed');
    expect(report.logger.totalViolations).toBe(0);
  });
});
