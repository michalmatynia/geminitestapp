import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { execScanOutput } from './lib/exec-scan-output.mjs';

const tempRoots: string[] = [];

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'exec-scan-output-'));
  tempRoots.push(root);
  return root;
};

const writeFile = (root, relativePath, contents) => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, 'utf8');
  return absolutePath;
};

describe('execScanOutput', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('parses summary-json output from successful commands', async () => {
    const root = createTempRoot();
    const scriptPath = writeFile(
      root,
      'success.mjs',
      [
        'console.log(JSON.stringify({',
        '  schemaVersion: 1,',
        '  generatedAt: \'2026-03-09T08:00:00.000Z\',',
        '  scanner: { name: \'fixture-scan\', version: \'1.0.0\' },',
        '  status: \'ok\',',
        '  summary: { issueCount: 0 },',
        '  details: { issues: [] },',
        '  paths: null,',
        '  filters: { ci: true },',
        '  notes: [\'fixture\'],',
        '}));',
      ].join('\n')
    );

    const result = await execScanOutput({
      commandArgs: [scriptPath],
      cwd: root,
      sourceName: 'fixture-scan',
    });

    expect(result.ok).toBe(true);
    expect(result.output).toMatchObject({
      scanner: { name: 'fixture-scan', version: '1.0.0' },
      status: 'ok',
      summary: { issueCount: 0 },
      details: { issues: [] },
    });
    expect(result.error).toBeNull();
  });

  it('forwards custom environment variables to the command', async () => {
    const root = createTempRoot();
    const scriptPath = writeFile(
      root,
      'env-success.mjs',
      [
        'console.log(JSON.stringify({',
        '  schemaVersion: 1,',
        '  generatedAt: \'2026-03-09T08:00:00.000Z\',',
        '  scanner: { name: process.env.SCAN_FIXTURE_NAME ?? \'missing\', version: \'1.0.0\' },',
        '  status: \'ok\',',
        '  summary: { issueCount: 0 },',
        '  details: { issues: [] },',
        '  paths: null,',
        '  filters: { ci: true },',
        '  notes: [\'fixture\'],',
        '}));',
      ].join('\n')
    );

    const result = await execScanOutput({
      commandArgs: [scriptPath],
      cwd: root,
      env: {
        ...process.env,
        SCAN_FIXTURE_NAME: 'env-fixture-scan',
      },
      sourceName: 'env-fixture-scan',
    });

    expect(result.ok).toBe(true);
    expect(result.output).toMatchObject({
      scanner: { name: 'env-fixture-scan', version: '1.0.0' },
      status: 'ok',
    });
  });

  it('recovers structured output from failing commands', async () => {
    const root = createTempRoot();
    const scriptPath = writeFile(
      root,
      'failure-with-json.mjs',
      [
        'console.log(JSON.stringify({',
        '  schemaVersion: 1,',
        '  generatedAt: \'2026-03-09T08:00:01.000Z\',',
        '  scanner: { name: \'fixture-scan\', version: \'1.0.0\' },',
        '  status: \'failed\',',
        '  summary: { issueCount: 3 },',
        '  details: { issues: [\'a\', \'b\', \'c\'] },',
        '  paths: null,',
        '  filters: { ci: true },',
        '  notes: [\'fixture failure\'],',
        '}));',
        'process.exit(1);',
      ].join('\n')
    );

    const result = await execScanOutput({
      commandArgs: [scriptPath],
      cwd: root,
      sourceName: 'fixture-scan',
    });

    expect(result.ok).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.output).toMatchObject({
      scanner: { name: 'fixture-scan', version: '1.0.0' },
      status: 'failed',
      summary: { issueCount: 3 },
      details: { issues: ['a', 'b', 'c'] },
    });
    expect(result.error).toContain('Command failed');
  });

  it('returns parse errors when failing commands do not emit valid json', async () => {
    const root = createTempRoot();
    const scriptPath = writeFile(
      root,
      'failure-without-json.mjs',
      [
        'console.error(\'not json\');',
        'process.exit(1);',
      ].join('\n')
    );

    const result = await execScanOutput({
      commandArgs: [scriptPath],
      cwd: root,
      sourceName: 'fixture-scan',
    });

    expect(result.ok).toBe(false);
    expect(result.output).toBeNull();
    expect(result.error).toContain('did not return valid JSON output');
  });

  it('propagates timeout state for long-running commands', async () => {
    const root = createTempRoot();
    const scriptPath = writeFile(
      root,
      'timeout.mjs',
      [
        'await new Promise((resolve) => setTimeout(resolve, 500));',
        'console.log(JSON.stringify({',
        '  schemaVersion: 1,',
        '  generatedAt: \'2026-03-09T08:00:02.000Z\',',
        '  scanner: { name: \'fixture-scan\', version: \'1.0.0\' },',
        '  status: \'ok\',',
        '  summary: { issueCount: 0 },',
        '  details: { issues: [] },',
        '  paths: null,',
        '  filters: { ci: true },',
        '  notes: [\'fixture timeout\'],',
        '}));',
      ].join('\n')
    );

    const result = await execScanOutput({
      commandArgs: [scriptPath],
      cwd: root,
      sourceName: 'fixture-scan',
      timeoutMs: 50,
    });

    expect(result.ok).toBe(false);
    expect(result.output).toBeNull();
    expect(result.killed).toBe(true);
    expect(result.timedOut).toBe(true);
  });
});
