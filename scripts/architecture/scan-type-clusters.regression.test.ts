import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { execScanOutput } from './lib/exec-scan-output.mjs';

const repoRoot = process.cwd();
const scanTypeClustersScriptPath = path.join(
  repoRoot,
  'scripts',
  'architecture',
  'scan-type-clusters.mjs'
);

describe('scan-type-clusters regression', () => {
  it(
    'keeps the exported type cluster baseline stable',
    async () => {
      const result = await execScanOutput({
        commandArgs: [
          scanTypeClustersScriptPath,
          '--summary-json',
          '--no-write',
          '--no-history',
        ],
        cwd: repoRoot,
        sourceName: 'scan-type-clusters',
        maxBuffer: 16 * 1024 * 1024,
        timeoutMs: 120_000,
      });

      expect(result.ok).toBe(true);
      expect(result.output).not.toBeNull();
      expect(result.output?.status).toBe('ok');
      expect(result.output?.summary).toMatchObject({
        exactShapeClusters: 2,
        nearShapeClusters: 2,
      });
      expect(result.output?.paths).toBeNull();
      expect(result.output?.filters).toMatchObject({
        noWrite: true,
        historyDisabled: true,
      });
    },
    120_000
  );
});
