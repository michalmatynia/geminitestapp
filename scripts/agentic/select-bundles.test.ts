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
    expect(selection.attemptedSuppressions).toEqual([]);
    expect(selection.skippedBundles).toEqual([]);
  });

  it('retains unchanged high-risk bundles and skips only unchanged lower-risk bundles', () => {
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
            bundle: 'observability_contracts',
            priority: 'medium',
            targets: ['//:api_error_sources'],
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
          impactedDomainIds: ['products', 'observability'],
          highestRiskLevel: 'high',
          requiredImpactBundles: ['product_data_pipeline', 'observability_contracts'],
          recommendedBundleOrder: ['product_data_pipeline', 'observability_contracts'],
          recommendedValidationByBundle: {
            product_data_pipeline: ['//:integration_prisma'],
            observability_contracts: ['//:api_error_sources'],
          },
        },
        executionReport: null,
        bundleSelection: {
          selectedBundles: ['product_data_pipeline', 'observability_contracts'],
          attemptedSuppressions: [],
          skippedBundles: [],
        },
        bundlePlan: [
          {
            bundle: 'product_data_pipeline',
            priority: 'high',
            targets: ['//:integration_prisma'],
          },
          {
            bundle: 'observability_contracts',
            priority: 'medium',
            targets: ['//:api_error_sources'],
          },
        ],
        bundleReports: [],
      },
    );

    expect(selection.selectedBundles).toEqual([
      'product_data_pipeline',
      'ai_paths_runtime',
    ]);
    expect(selection.attemptedSuppressions).toEqual([
      {
        bundle: 'product_data_pipeline',
        reason: 'unchanged-high-risk-retained',
      },
    ]);
    expect(selection.skippedBundles).toEqual([
      {
        bundle: 'observability_contracts',
        reason: 'unchanged',
      },
    ]);
  });
});
