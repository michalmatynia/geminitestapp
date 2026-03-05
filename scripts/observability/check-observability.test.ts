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

const readJsonLines = (root: string, relativeFile: string): Record<string, unknown>[] => {
  const filePath = path.join(root, relativeFile);
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
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

  it('fails when logSystemEvent object literal is missing source and message has no legacy prefix', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/bad-event-source.ts',
      "import { logSystemEvent } from '@/shared/lib/observability/system-logger';\nvoid logSystemEvent({ level: 'info', message: 'startup complete' });\n"
    );

    const report = runObservabilityCheck({
      mode: 'check',
      root,
      srcDir: 'src',
      apiDir: 'src/app/api',
      allowPartial: true,
    });

    expect(report.status).toBe('failed');
    expect(report.eventSource.totalViolations).toBe(1);
    expect(report.eventSource.violations[0]).toMatchObject({
      file: 'src/bad-event-source.ts',
    });
  });

  it('passes staged source enforcement when message keeps canonical legacy [scope] prefix', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/good-event-legacy-prefix.ts',
      "import { logSystemEvent } from '@/shared/lib/observability/system-logger';\nvoid logSystemEvent({ level: 'info', message: '[chatbot.sessions] listed' });\n"
    );

    const report = runObservabilityCheck({
      mode: 'check',
      root,
      srcDir: 'src',
      apiDir: 'src/app/api',
      allowPartial: true,
    });

    expect(report.status).toBe('passed');
    expect(report.eventSource.totalViolations).toBe(0);
  });

  it('fails when logSystemEvent source has invalid taxonomy format', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/bad-event-source-format.ts',
      "import { logSystemEvent } from '@/shared/lib/observability/system-logger';\nvoid logSystemEvent({ level: 'info', source: 'chatbot sessions', message: '[chatbot] listed' });\n"
    );

    const report = runObservabilityCheck({
      mode: 'check',
      root,
      srcDir: 'src',
      apiDir: 'src/app/api',
      allowPartial: true,
    });

    expect(report.status).toBe('failed');
    expect(report.eventSource.totalViolations).toBe(1);
    expect(report.eventSource.violations[0]).toMatchObject({
      file: 'src/bad-event-source-format.ts',
    });
  });

  it('fails when legacy observability compatibility import is used', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/bad-import.ts',
      "import { logClientError } from '@/features/observability';\nvoid logClientError;\n"
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

  it('fails when legacy AI-path observability shim import is used', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/bad-ai-path-shim-import.ts',
      "import { buildAiPathRunStaticContext } from '@/shared/lib/observability/ai-path-run-static-context';\nvoid buildAiPathRunStaticContext;\n"
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
      file: 'src/bad-ai-path-shim-import.ts',
      message:
        'legacy import "@/shared/lib/observability/ai-path-run-static-context" is not allowed',
    });
  });

  it('fails when forbidden legacy compatibility file still exists', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/features/observability/public.ts',
      "export const legacyObservabilityPublic = 'do-not-use';\n"
    );

    const report = runObservabilityCheck({
      mode: 'check',
      root,
      srcDir: 'src',
      apiDir: 'src/app/api',
      allowPartial: true,
    });

    expect(report.status).toBe('failed');
    expect(report.legacyCompatibility.totalViolations).toBeGreaterThan(0);
    expect(report.legacyCompatibility.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'src/features/observability/public.ts',
          message:
            'forbidden legacy compatibility file detected: src/features/observability/public.ts',
        }),
      ])
    );
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

  it('writes versioned summary log entry with execution context metadata', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/good-log.ts',
      "import { logger } from '@/shared/utils/logger';\nlogger.info('[observability.check] startup complete');\n"
    );

    const previousEnv = {
      GITHUB_ACTIONS: process.env['GITHUB_ACTIONS'],
      GITHUB_REF_NAME: process.env['GITHUB_REF_NAME'],
      GITHUB_SHA: process.env['GITHUB_SHA'],
      GITHUB_RUN_ID: process.env['GITHUB_RUN_ID'],
    };
    process.env['GITHUB_ACTIONS'] = 'true';
    process.env['GITHUB_REF_NAME'] = 'feature/observability-check';
    process.env['GITHUB_SHA'] = 'abcdef123456';
    process.env['GITHUB_RUN_ID'] = '4242';

    try {
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
      const entries = readJsonLines(root, 'logs/quality-check.log');
      const entry = entries[entries.length - 1];
      expect(entry).toMatchObject({
        schemaVersion: 2,
        mode: 'check',
        status: 'passed',
        context: {
          environment: 'github-actions',
          branch: 'feature/observability-check',
          commit: 'abcdef123456',
          runId: '4242',
        },
      });
    } finally {
      if (previousEnv.GITHUB_ACTIONS === undefined) delete process.env['GITHUB_ACTIONS'];
      else process.env['GITHUB_ACTIONS'] = previousEnv.GITHUB_ACTIONS;
      if (previousEnv.GITHUB_REF_NAME === undefined) delete process.env['GITHUB_REF_NAME'];
      else process.env['GITHUB_REF_NAME'] = previousEnv.GITHUB_REF_NAME;
      if (previousEnv.GITHUB_SHA === undefined) delete process.env['GITHUB_SHA'];
      else process.env['GITHUB_SHA'] = previousEnv.GITHUB_SHA;
      if (previousEnv.GITHUB_RUN_ID === undefined) delete process.env['GITHUB_RUN_ID'];
      else process.env['GITHUB_RUN_ID'] = previousEnv.GITHUB_RUN_ID;
    }
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
    expect(report.runtimeLogs.fingerprints[0]).toMatchObject({
      count: 1,
    });
    expect(report.comment).toContain('Error discovered in runtime logs');
    expect(report.logArtifacts.checkLogFile).toBe('logs/quality-check.log');
    expect(report.logArtifacts.errorLogFile).toBe('logs/quality-check.error.log');
    expect(fs.existsSync(path.join(root, 'logs/quality-check.log'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'logs/quality-check.error.log'))).toBe(true);
    const errorEntries = readJsonLines(root, 'logs/quality-check.error.log');
    const errorEntry = errorEntries[errorEntries.length - 1];
    expect(errorEntry).toMatchObject({
      schemaVersion: 2,
      status: 'failed',
    });
    expect(JSON.stringify(errorEntry)).toContain('Database connection failed');
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

  it('compacts check log when it exceeds max configured bytes', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/good-log.ts',
      "import { logger } from '@/shared/utils/logger';\nlogger.info('[observability.check] startup complete');\n"
    );

    const prefilledCheckLog = path.join(root, 'logs/quality-check.log');
    fs.mkdirSync(path.dirname(prefilledCheckLog), { recursive: true });
    const oldEntries = Array.from({ length: 120 }, (_, index) =>
      JSON.stringify({
        schemaVersion: 2,
        generatedAt: `2026-03-04T01:00:${String(index).padStart(2, '0')}Z`,
        status: 'old',
        idx: index,
        note: 'x'.repeat(64),
      })
    ).join('\n');
    fs.writeFileSync(prefilledCheckLog, `${oldEntries}\n`, 'utf8');

    const report = runObservabilityCheck({
      mode: 'check',
      root,
      srcDir: 'src',
      apiDir: 'src/app/api',
      logsDir: 'logs',
      checkLogFile: 'logs/quality-check.log',
      errorLogFile: 'logs/quality-check.error.log',
      allowPartial: true,
      maxCheckLogBytes: 3_000,
    });

    expect(report.status).toBe('passed');
    const checkLogContent = fs.readFileSync(prefilledCheckLog, 'utf8');
    expect(Buffer.byteLength(checkLogContent, 'utf8')).toBeLessThanOrEqual(3_000);
    const entries = checkLogContent
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(entries.some((entry) => entry['status'] === 'passed')).toBe(true);
  });
});
