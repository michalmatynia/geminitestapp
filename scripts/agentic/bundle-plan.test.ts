import { describe, expect, it } from 'vitest';

import { buildAgenticBundlePlan } from './bundle-plan';

describe('buildAgenticBundlePlan', () => {
  it('preserves recommended bundle order and targets', () => {
    const plan = buildAgenticBundlePlan({
      kind: 'agentic-work-order',
      generatedAt: '2026-03-11T00:00:00.000Z',
      changedFiles: ['src/features/admin/pages/AdminSettingsHomePage.tsx'],
      impactedDomainIds: ['admin', 'product-sync'],
      highestRiskLevel: 'high',
      requiredImpactBundles: ['admin_experience', 'product_sync'],
      bundlePriorityByBundle: {
        admin_experience: 'medium',
        product_sync: 'high',
      },
      recommendedBundleOrder: ['product_sync', 'admin_experience'],
      recommendedValidationByBundle: {
        product_sync: ['//:integration_prisma'],
        admin_experience: ['//:accessibility_smoke'],
      },
      requiredDocs: [],
      requiredGeneratedArtifacts: [],
      generatedOnlyPaths: [],
      manualOnlyPaths: [],
      requiredDocGenerators: [],
      requiredScannerTargets: [],
      requiredValidationTargets: ['//:integration_prisma', '//:accessibility_smoke'],
    });

    expect(plan.bundles).toEqual([
      {
        bundle: 'product_sync',
        priority: 'high',
        targets: ['//:integration_prisma'],
      },
      {
        bundle: 'admin_experience',
        priority: 'medium',
        targets: ['//:accessibility_smoke'],
      },
    ]);
  });
});
