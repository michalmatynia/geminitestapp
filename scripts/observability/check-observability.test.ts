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

  it('fails when legacy observability compatibility import is used', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/bad-import.ts',
      "import { logClientError } from '@/features/observability/public';\nvoid logClientError;\n"
    );

    const report = runObservabilityCheck({
      mode: 'check',
      root,
      srcDir: 'src',
      apiDir: 'src/app/api',
      allowPartial: true,
    });

    expect(report.status).toBe('failed');
    expect(report.legacyCompatibility.totalViolations).toBe(1);
    expect(report.legacyCompatibility.violations[0]).toMatchObject({
      file: 'src/bad-import.ts',
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

  it('fails and provides an error comment when runtime logs contain errors', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/good-log.ts',
      "import { logger } from '@/shared/utils/logger';\nlogger.info('[observability.check] startup complete');\n"
    );
    writeSource(
      root,
      'logs/app.log',
      '[2026-03-04T01:00:00.000Z] [INFO] Service booted\n[2026-03-04T01:00:10.000Z] [ERROR] Database connection failed\n'
    );

    const report = runObservabilityCheck({
      mode: 'check',
      root,
      srcDir: 'src',
      apiDir: 'src/app/api',
      logsDir: 'logs',
      checkLogFile: 'logs/quality-check.log',
      errorLogFile: 'logs/quality-check.error.log',
      allowPartial: true,
    });

    expect(report.status).toBe('failed');
    expect(report.runtimeLogs.totalErrors).toBe(1);
    expect(report.runtimeLogs.errors[0]).toMatchObject({
      file: 'logs/app.log',
      line: 2,
    });
    expect(report.comment).toContain('Error discovered in runtime logs');
    expect(report.logArtifacts.checkLogFile).toBe('logs/quality-check.log');
    expect(report.logArtifacts.errorLogFile).toBe('logs/quality-check.error.log');
    expect(fs.existsSync(path.join(root, 'logs/quality-check.log'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'logs/quality-check.error.log'))).toBe(true);
    const errorLogContents = fs.readFileSync(path.join(root, 'logs/quality-check.error.log'), 'utf8');
    expect(errorLogContents).toContain('Database connection failed');
  });

  it('keeps status passed when runtime logs are clean and still appends check log', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/good-log.ts',
      "import { logger } from '@/shared/utils/logger';\nlogger.info('[observability.check] startup complete');\n"
    );
    writeSource(root, 'logs/app.log', '[2026-03-04T01:00:00.000Z] [INFO] Service booted\n');

    const report = runObservabilityCheck({
      mode: 'check',
      root,
      srcDir: 'src',
      apiDir: 'src/app/api',
      logsDir: 'logs',
      checkLogFile: 'logs/quality-check.log',
      errorLogFile: 'logs/quality-check.error.log',
      allowPartial: true,
    });

    expect(report.status).toBe('passed');
    expect(report.runtimeLogs.totalErrors).toBe(0);
    expect(report.comment).toBeNull();
    expect(fs.existsSync(path.join(root, 'logs/quality-check.log'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'logs/quality-check.error.log'))).toBe(false);
  });
});
