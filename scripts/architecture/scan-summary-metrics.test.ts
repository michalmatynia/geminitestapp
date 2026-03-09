import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  collectNumericSummaryMetrics,
  readNumericSummaryFields,
} from './lib/scan-summary-metrics.mjs';

const tempRoots = [];

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-summary-metrics-'));
  tempRoots.push(root);
  return root;
};

const writeFile = (root, relativePath, contents) => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, 'utf8');
  return absolutePath;
};

describe('scan summary metrics', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('maps required numeric fields from a successful scan summary', async () => {
    const root = createTempRoot();
    const scriptPath = writeFile(
      root,
      'success.mjs',
      [
        'console.log(JSON.stringify({',
        '  schemaVersion: 1,',
        '  generatedAt: \'2026-03-09T09:15:00.000Z\',',
        '  scanner: { name: \'fixture-scan\', version: \'1.0.0\' },',
        '  status: \'ok\',',
        '  summary: {',
        '    candidateChainCount: 7,',
        '    highPriorityChainCount: 2,',
        '    componentsWithForwarding: 5,',
        '  },',
        '  details: { issues: [] },',
        '  paths: null,',
        '  filters: { ci: true },',
        '  notes: [\'fixture\'],',
        '}));',
      ].join('\n')
    );

    const metrics = await collectNumericSummaryMetrics({
      cwd: root,
      commandArgs: [scriptPath],
      sourceName: 'fixture-scan',
      fields: {
        candidateChains: 'candidateChainCount',
        depthGte4Chains: 'highPriorityChainCount',
        forwardingComponents: 'componentsWithForwarding',
      },
    });

    expect(metrics).toEqual({
      candidateChains: 7,
      depthGte4Chains: 2,
      forwardingComponents: 5,
    });
  });

  it('throws when a required numeric field is missing', () => {
    expect(() =>
      readNumericSummaryFields(
        {
          candidateChainCount: 7,
        },
        {
          candidateChains: 'candidateChainCount',
          depthGte4Chains: 'highPriorityChainCount',
        },
        'fixture-scan'
      )
    ).toThrow('fixture-scan did not produce summary.highPriorityChainCount.');
  });

  it('throws when the scan command exits non-zero', async () => {
    const root = createTempRoot();
    const scriptPath = writeFile(
      root,
      'failure.mjs',
      [
        'console.log(JSON.stringify({',
        '  schemaVersion: 1,',
        '  generatedAt: \'2026-03-09T09:15:01.000Z\',',
        '  scanner: { name: \'fixture-scan\', version: \'1.0.0\' },',
        '  status: \'failed\',',
        '  summary: { candidateChainCount: 3 },',
        '  details: { issues: [\'a\'] },',
        '  paths: null,',
        '  filters: { ci: true },',
        '  notes: [\'fixture failure\'],',
        '}));',
        'process.exit(1);',
      ].join('\n')
    );

    await expect(
      collectNumericSummaryMetrics({
        cwd: root,
        commandArgs: [scriptPath],
        sourceName: 'fixture-scan',
        fields: {
          candidateChains: 'candidateChainCount',
        },
      })
    ).rejects.toThrow('fixture-scan failed');
  });
});
