import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseScanOutput } from '../architecture/lib/scan-output.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const scriptPath = path.join(repoRoot, 'scripts', 'testing', 'record-test-run.mjs');

const runRecorder = (args: string[]) =>
  parseScanOutput(
    execFileSync('node', [scriptPath, ...args], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        FORCE_COLOR: '0',
      },
    }),
    'testing-run-ledger-record'
  );

describe('record-test-run', () => {
  it('records per-suite results with explicit ci metadata', () => {
    const payload = runRecorder([
      '--summary-json',
      '--no-write',
      '--lane=pr-required',
      '--status=failed',
      '--trigger=ci',
      '--actor=github-actions[bot]',
      '--suite-result=lint:success:1200',
      '--suite-result=typecheck:failure:2300',
      '--suite-result=unit:cancelled',
    ]);

    expect(payload.summary).toMatchObject({
      recorded: true,
      laneId: 'pr-required',
      status: 'failed',
      suiteCount: 7,
    });

    expect(payload.details?.entry).toMatchObject({
      label: 'Pull Request Required',
      laneId: 'pr-required',
      status: 'failed',
      trigger: 'ci',
      actor: 'github-actions[bot]',
    });

    expect(payload.details?.entry?.suiteResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'lint',
          status: 'ok',
          durationMs: 1200,
        }),
        expect.objectContaining({
          id: 'typecheck',
          status: 'failed',
          durationMs: 2300,
        }),
        expect.objectContaining({
          id: 'unit',
          status: 'warn',
          durationMs: null,
        }),
        expect.objectContaining({
          id: 'critical-flows',
          status: 'failed',
          durationMs: null,
        }),
      ])
    );
  });

  it('accepts ad hoc suite-result inputs without an explicit lane', () => {
    const payload = runRecorder([
      '--summary-json',
      '--no-write',
      '--label=Manual regression sweep',
      '--status=warn',
      '--suite-result=build:success:45000',
      '--suite-result=e2e:failure:120000',
    ]);

    expect(payload.summary).toMatchObject({
      recorded: true,
      laneId: null,
      status: 'warn',
      suiteCount: 2,
    });

    expect(payload.details?.entry).toMatchObject({
      label: 'Manual regression sweep',
      laneId: null,
      trigger: 'manual',
    });

    expect(payload.details?.entry?.suiteIds).toEqual(['build', 'e2e']);
    expect(payload.details?.entry?.suiteResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'build',
          status: 'ok',
          durationMs: 45000,
        }),
        expect.objectContaining({
          id: 'e2e',
          status: 'failed',
          durationMs: 120000,
        }),
      ])
    );
  });
});
