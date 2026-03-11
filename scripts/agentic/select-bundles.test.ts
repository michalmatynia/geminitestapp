import { describe, expect, it } from 'vitest';

import { buildAgenticBundleSelection } from './select-bundles';

describe('agentic bundle selection', () => {
  it('selects all bundles when no previous history snapshot exists', () => {
    const selection = buildAgenticBundleSelection(
      {
        kind: 'agentic-bundle-plan',
        generatedAt: '2026-03-11T00:00:00.000Z',
        workOrderPath: 'artifacts/agent-work-order.json',
        bundles: [
          {
            bundle: 'product_data_pipeline',
            priority: 'high',
            targets: ['//:integration_prisma'],
          },
          {
            bundle: 'admin_experience',
            priority: 'medium',
            targets: ['//:accessibility_smoke'],
          },
        ],
      },
      null,
    );

    expect(selection.selectedBundles).toEqual([
      'product_data_pipeline',
      'admin_experience',
    ]);
    expect(selection.skippedBundles).toEqual([]);
  });

  it('skips only unchanged bundles against the previous history snapshot', () => {
    const selection = buildAgenticBundleSelection(
      {
        kind: 'agentic-bundle-plan',
        generatedAt: '2026-03-11T00:00:00.000Z',
        workOrderPath: 'artifacts/agent-work-order.json',
        bundles: [
          {
            bundle: 'product_data_pipeline',
            priority: 'high',
            targets: ['//:integration_prisma'],
          },
          {
            bundle: 'admin_experience',
            priority: 'high',
            targets: ['//:accessibility_smoke'],
          },
          {
            bundle: 'ai_paths_runtime',
            priority: 'high',
            targets: ['//:unit'],
          },
        ],
      },
      {
        kind: 'agentic-history-snapshot',
        generatedAt: '2026-03-10T00:00:00.000Z',
        workOrder: {
          generatedAt: '2026-03-10T00:00:00.000Z',
          changedFiles: [],
          impactedDomainIds: ['products', 'admin'],
          highestRiskLevel: 'high',
          requiredImpactBundles: ['product_data_pipeline', 'admin_experience'],
          recommendedBundleOrder: ['product_data_pipeline', 'admin_experience'],
          recommendedValidationByBundle: {
            product_data_pipeline: ['//:integration_prisma'],
            admin_experience: ['//:accessibility_smoke'],
          },
        },
        executionReport: null,
        bundlePlan: [
          {
            bundle: 'product_data_pipeline',
            priority: 'high',
            targets: ['//:integration_prisma'],
          },
          {
            bundle: 'admin_experience',
            priority: 'medium',
            targets: ['//:accessibility_smoke'],
          },
        ],
        bundleReports: [],
      },
    );

    expect(selection.selectedBundles).toEqual([
      'admin_experience',
      'ai_paths_runtime',
    ]);
    expect(selection.skippedBundles).toEqual([
      {
        bundle: 'product_data_pipeline',
        reason: 'unchanged',
      },
    ]);
  });
});
