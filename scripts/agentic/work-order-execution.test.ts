import { describe, expect, it } from 'vitest';

import {
  buildWorkOrderExecutionPlan,
  detectWorkOrderGuardrailViolations,
} from './work-order-execution';

describe('buildWorkOrderExecutionPlan', () => {
  it('deduplicates doc generators, scanner targets, and impact bundles', () => {
    const plan = buildWorkOrderExecutionPlan({
      kind: 'agentic-work-order',
      generatedAt: '2026-03-11T00:00:00.000Z',
      changedFiles: ['src/shared/lib/ai-paths/hooks/useAiPathTriggerEvent.ts'],
      impactedDomainIds: ['ai-paths'],
      highestRiskLevel: 'high',
      requiredImpactBundles: ['ai_paths_runtime', 'ai_paths_runtime'],
      bundlePriorityByBundle: {
        ai_paths_runtime: 'high',
      },
      recommendedBundleOrder: ['ai_paths_runtime', 'ai_paths_runtime'],
      recommendedValidationByBundle: {
        ai_paths_runtime: ['//:unit', '//:unit'],
      },
      requiredDocs: [],
      requiredGeneratedArtifacts: [],
      generatedOnlyPaths: [],
      manualOnlyPaths: [],
      requiredDocGenerators: ['//:ai_paths_node_docs', '//:ai_paths_node_docs'],
      requiredScannerTargets: ['//:ai_paths_canonical', '//:ai_paths_canonical'],
      requiredValidationTargets: ['//:unit', '//:unit'],
    });

    expect(plan.highestRiskLevel).toBe('high');
    expect(plan.requiredImpactBundles).toEqual(['ai_paths_runtime']);
    expect(plan.bundlePriorityByBundle).toEqual({
      ai_paths_runtime: 'high',
    });
    expect(plan.recommendedBundleOrder).toEqual(['ai_paths_runtime']);
    expect(plan.validationDecision).toBe('skipped-by-default');
    expect(plan.validationRiskThreshold).toBeNull();
    expect(plan.docGenerators).toEqual(['//:ai_paths_node_docs']);
    expect(plan.scannerTargets).toEqual(['//:ai_paths_canonical']);
    expect(plan.validationTargets).toEqual([]);
    expect(plan.guardrailViolations).toEqual([]);
  });

  it('includes validation targets only when requested', () => {
    const workOrder = {
      kind: 'agentic-work-order' as const,
      generatedAt: '2026-03-11T00:00:00.000Z',
      changedFiles: ['src/features/products/hooks/useProductAiPathsRunSync.ts'],
      impactedDomainIds: ['products'],
      highestRiskLevel: 'high' as const,
      requiredImpactBundles: ['product_data_pipeline'],
      bundlePriorityByBundle: {
        product_data_pipeline: 'high' as const,
      },
      recommendedBundleOrder: ['product_data_pipeline'],
      recommendedValidationByBundle: {
        product_data_pipeline: ['//:integration_prisma'],
      },
      requiredDocs: [],
      requiredGeneratedArtifacts: [],
      generatedOnlyPaths: [],
      manualOnlyPaths: [],
      requiredDocGenerators: [],
      requiredScannerTargets: [],
      requiredValidationTargets: [
        '//:integration_prisma',
        '//:products_trigger_queue_unit',
      ],
    };

    const plan = buildWorkOrderExecutionPlan(workOrder, {
      includeValidation: true,
      validationRiskThreshold: 'medium',
    });

    expect(plan.validationDecision).toBe('included');
    expect(plan.validationRiskThreshold).toBe('medium');
    expect(plan.requiredImpactBundles).toEqual(['product_data_pipeline']);
    expect(plan.recommendedBundleOrder).toEqual(['product_data_pipeline']);
    expect(plan.validationTargets).toEqual([
      '//:integration_prisma',
      '//:products_trigger_queue_unit',
    ]);
  });

  it('skips low-risk validation by policy unless explicitly forced', () => {
    const workOrder = {
      kind: 'agentic-work-order' as const,
      generatedAt: '2026-03-11T00:00:00.000Z',
      changedFiles: ['src/features/observability/index.ts'],
      impactedDomainIds: ['observability'],
      highestRiskLevel: 'low' as const,
      requiredImpactBundles: ['observability_contracts'],
      bundlePriorityByBundle: {
        observability_contracts: 'low' as const,
      },
      recommendedBundleOrder: ['observability_contracts'],
      recommendedValidationByBundle: {
        observability_contracts: ['//:unit'],
      },
      requiredDocs: [],
      requiredGeneratedArtifacts: [],
      generatedOnlyPaths: [],
      manualOnlyPaths: [],
      requiredDocGenerators: [],
      requiredScannerTargets: [],
      requiredValidationTargets: ['//:unit'],
    };

    const skippedPlan = buildWorkOrderExecutionPlan(workOrder, {
      includeValidation: true,
      validationRiskThreshold: 'low',
    });
    expect(skippedPlan.validationDecision).toBe('skipped-by-policy');
    expect(skippedPlan.validationTargets).toEqual([]);

    const forcedPlan = buildWorkOrderExecutionPlan(workOrder, {
      includeValidation: true,
      forceValidation: true,
      validationRiskThreshold: 'low',
    });
    expect(forcedPlan.validationDecision).toBe('included');
    expect(forcedPlan.validationTargets).toEqual(['//:unit']);
  });

  it('skips validation targets when the work order risk is below threshold', () => {
    const plan = buildWorkOrderExecutionPlan(
      {
        kind: 'agentic-work-order',
        generatedAt: '2026-03-11T00:00:00.000Z',
        changedFiles: ['src/features/observability/index.ts'],
        impactedDomainIds: ['observability'],
        highestRiskLevel: 'medium',
        requiredImpactBundles: ['observability_contracts'],
        bundlePriorityByBundle: {
          observability_contracts: 'medium',
        },
        recommendedBundleOrder: ['observability_contracts'],
        recommendedValidationByBundle: {
          observability_contracts: ['//:unit'],
        },
        requiredDocs: [],
        requiredGeneratedArtifacts: [],
        generatedOnlyPaths: [],
        manualOnlyPaths: [],
        requiredDocGenerators: [],
        requiredScannerTargets: [],
        requiredValidationTargets: ['//:unit'],
      },
      {
        includeValidation: true,
        validationRiskThreshold: 'high',
      },
    );

    expect(plan.validationDecision).toBe('skipped-by-risk');
    expect(plan.validationRiskThreshold).toBe('high');
    expect(plan.requiredImpactBundles).toEqual(['observability_contracts']);
    expect(plan.validationTargets).toEqual([]);
  });
});

describe('detectWorkOrderGuardrailViolations', () => {
  it('blocks generated outputs from manual-only paths', () => {
    const violations = detectWorkOrderGuardrailViolations({
      kind: 'agentic-work-order',
      generatedAt: '2026-03-11T00:00:00.000Z',
      changedFiles: ['docs/build/agentic-engineering.md'],
      impactedDomainIds: ['repo-docs'],
      highestRiskLevel: 'medium',
      requiredImpactBundles: ['docs_contracts'],
      bundlePriorityByBundle: {
        docs_contracts: 'medium',
      },
      recommendedBundleOrder: ['docs_contracts'],
      recommendedValidationByBundle: {
        docs_contracts: [],
      },
      requiredDocs: [],
      requiredGeneratedArtifacts: ['docs/build/agentic-engineering.md'],
      generatedOnlyPaths: [],
      manualOnlyPaths: ['docs/build'],
      requiredDocGenerators: [],
      requiredScannerTargets: [],
      requiredValidationTargets: [],
    });

    expect(violations).toContain(
      'Generated artifact docs/build/agentic-engineering.md falls under a manual-only path.',
    );
  });

  it('blocks manual docs from generated-only paths', () => {
    const violations = detectWorkOrderGuardrailViolations({
      kind: 'agentic-work-order',
      generatedAt: '2026-03-11T00:00:00.000Z',
      changedFiles: ['src/features/observability/index.ts'],
      impactedDomainIds: ['observability'],
      highestRiskLevel: 'medium',
      requiredImpactBundles: ['observability_contracts'],
      bundlePriorityByBundle: {
        observability_contracts: 'medium',
      },
      recommendedBundleOrder: ['observability_contracts'],
      recommendedValidationByBundle: {
        observability_contracts: [],
      },
      requiredDocs: ['docs/metrics/api-error-sources-latest.md'],
      requiredGeneratedArtifacts: [],
      generatedOnlyPaths: ['docs/metrics'],
      manualOnlyPaths: [],
      requiredDocGenerators: [],
      requiredScannerTargets: [],
      requiredValidationTargets: [],
    });

    expect(violations).toContain(
      'Required doc docs/metrics/api-error-sources-latest.md falls under a generated-only path.',
    );
  });
});
