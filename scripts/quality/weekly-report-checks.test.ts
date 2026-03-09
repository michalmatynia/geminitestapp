import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createWeeklyCheckResult,
  formatStructuredCheckOutput,
  runStructuredCommandCheck,
  truncateWeeklyCheckOutput,
} from './lib/weekly-report-checks.mjs';

const tempRoots: string[] = [];

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'weekly-report-checks-'));
  tempRoots.push(root);
  return root;
};

const writeFile = (root: string, relativePath: string, contents: string) => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, 'utf8');
  return absolutePath;
};

describe('weekly report check helpers', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('truncates oversized output buffers', () => {
    expect(truncateWeeklyCheckOutput('abcdef', 4)).toBe('cdef');
  });

  it('creates skipped check results', () => {
    expect(
      createWeeklyCheckResult({
        id: 'fixture',
        label: 'Fixture',
        command: 'node fixture.mjs',
        status: 'skipped',
        output: 'Skipped by configuration.',
      })
    ).toEqual({
      id: 'fixture',
      label: 'Fixture',
      command: 'node fixture.mjs',
      status: 'skipped',
      exitCode: null,
      signal: null,
      durationMs: 0,
      output: 'Skipped by configuration.',
    });
  });

  it('formats structured output from parsed envelopes', () => {
    const output = formatStructuredCheckOutput({
      result: {
        ok: false,
        error: 'Command failed',
        stdout: '',
        stderr: '',
        output: {
          scanner: { name: 'fixture-scan', version: '1.0.0' },
          status: 'failed',
          summary: { failedSuites: 1 },
          details: {
            stdout: 'suite failed',
            stderr: 'stack trace',
          },
          paths: null,
          filters: null,
          notes: [],
        },
      },
    });

    expect(output).toContain('scanner=fixture-scan');
    expect(output).toContain('summary={"failedSuites":1}');
    expect(output).toContain('suite failed');
    expect(output).toContain('stack trace');
  });

  it('runs structured checks and captures scan summaries', async () => {
    const root = createTempRoot();
    const scriptPath = writeFile(
      root,
      'success.mjs',
      [
        'console.log(JSON.stringify({',
        '  schemaVersion: 1,',
        '  generatedAt: \'2026-03-09T10:30:00.000Z\',',
        '  scanner: { name: \'fixture-scan\', version: \'1.0.0\' },',
        '  status: \'ok\',',
        '  summary: { passedSuites: 3 },',
        '  details: { stdout: \'all good\', stderr: \'\' },',
        '  paths: null,',
        '  filters: { ci: true },',
        '  notes: [\'fixture\'],',
        '}));',
      ].join('\n')
    );

    const result = await runStructuredCommandCheck({
      id: 'fixture',
      label: 'Fixture',
      command: 'node',
      commandArgs: [scriptPath],
      timeoutMs: 5_000,
      cwd: root,
      env: process.env,
      sourceName: 'fixture-scan',
    });

    expect(result.status).toBe('pass');
    expect(result.exitCode).toBe(0);
    expect(result.scanSummary).toMatchObject({
      scanner: { name: 'fixture-scan', version: '1.0.0' },
      status: 'ok',
      summary: { passedSuites: 3 },
      filters: { ci: true },
    });
    expect(result.output).toContain('summary={"passedSuites":3}');
  });

  it('keeps structured summaries when the command exits non-zero', async () => {
    const root = createTempRoot();
    const scriptPath = writeFile(
      root,
      'failure.mjs',
      [
        'console.log(JSON.stringify({',
        '  schemaVersion: 1,',
        '  generatedAt: \'2026-03-09T10:31:00.000Z\',',
        '  scanner: { name: \'fixture-scan\', version: \'1.0.0\' },',
        '  status: \'failed\',',
        '  summary: { failedSuites: 1 },',
        '  details: { stdout: \'failed suite\', stderr: \'boom\' },',
        '  paths: null,',
        '  filters: { ci: true },',
        '  notes: [\'fixture failure\'],',
        '}));',
        'process.exit(1);',
      ].join('\n')
    );

    const result = await runStructuredCommandCheck({
      id: 'fixture',
      label: 'Fixture',
      command: 'node',
      commandArgs: [scriptPath],
      timeoutMs: 5_000,
      cwd: root,
      env: process.env,
      sourceName: 'fixture-scan',
    });

    expect(result.status).toBe('fail');
    expect(result.exitCode).toBe(1);
    expect(result.scanSummary).toMatchObject({
      status: 'failed',
      summary: { failedSuites: 1 },
    });
    expect(result.output).toContain('failed suite');
    expect(result.output).toContain('boom');
  });

  it('returns skipped results when disabled', async () => {
    const result = await runStructuredCommandCheck({
      id: 'fixture',
      label: 'Fixture',
      command: 'node',
      commandArgs: ['fixture.mjs'],
      timeoutMs: 5_000,
      enabled: false,
      cwd: process.cwd(),
      env: process.env,
      sourceName: 'fixture-scan',
    });

    expect(result.status).toBe('skipped');
    expect(result.output).toBe('Skipped by configuration.');
    expect(result.scanSummary).toBeUndefined();
  });
});
