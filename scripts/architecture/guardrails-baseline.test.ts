import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  UI_CONSOLIDATION_GUARDRAIL_RULES,
  buildArchitectureGuardrailSnapshot,
  buildUiConsolidationGuardrailSnapshot,
  collectGuardrailThresholdFailures,
  compareGuardrailSnapshotAgainstBaseline,
  readGuardrailBaseline,
  resolveGuardrailBaselinePath,
  writeGuardrailBaseline,
} from './lib/guardrails-baseline.mjs';

const tempRoots = [];

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'guardrails-baseline-'));
  tempRoots.push(root);
  return root;
};

describe('guardrails baseline helpers', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('builds the architecture guardrail snapshot from metrics', () => {
    const snapshot = buildArchitectureGuardrailSnapshot(
      {
        source: {
          filesOver1000: 12,
          filesOver1500: 3,
          useClientFiles: 1497,
          largestFile: { lines: 3075 },
        },
        api: {
          totalRoutes: 341,
          delegatedServerRoutes: 13,
          routesWithoutApiHandler: 0,
          routesWithoutExplicitCachePolicy: 0,
        },
        imports: {
          appFeatureBarrelImports: 3,
          appFeatureDeepImports: 147,
          sharedToFeaturesTotalImports: 76,
        },
        architecture: {
          crossFeatureEdgePairs: 28,
        },
        runtime: {
          setIntervalOccurrences: 22,
        },
      },
      {
        depthGte4Chains: 0,
        componentsWithForwarding: 43,
      },
      {
        totalOpportunities: 0,
        highPriorityOpportunities: 0,
        duplicateNameClusters: 0,
        propSignatureClusters: 0,
        tokenSimilarityClusters: 0,
      }
    );

    expect(snapshot).toMatchObject({
      'source.filesOver1000': 12,
      'source.filesOver1500': 3,
      'source.useClientFiles': 1497,
      'source.largestFileLines': 3075,
      'api.totalRoutes': 341,
      'imports.sharedToFeaturesTotalImports': 76,
      'propDrilling.depthGte4Chains': 0,
      'uiConsolidation.totalOpportunities': 0,
    });
  });

  it('compares snapshot values against baseline and reports failures', () => {
    const snapshot = {
      'api.delegatedServerRoutes': 13,
      'imports.sharedToFeaturesTotalImports': 79,
      'source.largestFileLines': 3075,
    };
    const comparison = compareGuardrailSnapshotAgainstBaseline(snapshot, {
      generatedAt: '2026-03-09T08:55:53.204Z',
      hardLimits: {
        sourceLargestFileLines: 3000,
      },
      max: {
        'api.delegatedServerRoutes': 13,
        'imports.sharedToFeaturesTotalImports': 76,
      },
    });

    expect(comparison.failed).toBe(true);
    expect(comparison.rows).toEqual([
      {
        label: 'api.delegatedServerRoutes',
        current: 13,
        max: 13,
        status: 'INFO',
      },
      {
        label: 'imports.sharedToFeaturesTotalImports',
        current: 79,
        max: 76,
        status: 'FAIL',
      },
      {
        label: 'imports.featuresToAppApiTotalImports (hard limit)',
        current: 0,
        max: 0,
        status: 'OK',
      },
      {
        label: 'source.hooksWithoutUseClient (hard limit)',
        current: 0,
        max: 0,
        status: 'OK',
      },
      {
        label: 'source.largestFileLines (hard limit)',
        current: 3075,
        max: 3000,
        status: 'FAIL',
      },
    ]);
  });

  it('collects UI consolidation threshold failures from a baseline', () => {
    const snapshot = buildUiConsolidationGuardrailSnapshot(
      {
        componentsWithForwarding: 43,
        highPriorityChainCount: 1,
      },
      {
        totalOpportunities: 2,
        highPriorityCount: 1,
        duplicateNameClusterCount: 0,
        propSignatureClusterCount: 0,
        tokenSimilarityClusterCount: 0,
      }
    );
    const failures = collectGuardrailThresholdFailures(
      snapshot,
      {
        max: {
          'propDrilling.componentsWithForwarding': 43,
          'propDrilling.depthGte4Chains': 0,
          'uiConsolidation.totalOpportunities': 0,
          'uiConsolidation.highPriorityOpportunities': 0,
          'uiConsolidation.duplicateNameClusters': 0,
          'uiConsolidation.propSignatureClusters': 0,
          'uiConsolidation.tokenSimilarityClusters': 0,
        },
      },
      UI_CONSOLIDATION_GUARDRAIL_RULES
    );

    expect(failures).toEqual([
      'Expected prop depth>=4 chains <= 0, got 1.',
      'Expected UI consolidation opportunities <= 0, got 2.',
      'Expected high-priority UI opportunities <= 0, got 1.',
    ]);
  });

  it('writes and reads the guardrail baseline payload', async () => {
    const root = createTempRoot();
    const baselinePath = resolveGuardrailBaselinePath(root);
    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });

    await writeGuardrailBaseline(
      {
        'source.filesOver1000': 12,
      },
      {
        baselinePath,
        generatedAt: '2026-03-09T09:20:00.000Z',
      }
    );

    const payload = await readGuardrailBaseline({ baselinePath });

    expect(payload).toMatchObject({
      generatedAt: '2026-03-09T09:20:00.000Z',
      hardLimits: {
        sourceLargestFileLines: 4000,
      },
      max: {
        'source.filesOver1000': 12,
      },
    });
  });
});
