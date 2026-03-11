import { describe, expect, it } from 'vitest';

import { diffAgenticHistorySnapshots } from './diff-history';

describe('agentic history diff', () => {
  it('detects bundle, recommendation, execution, and validation changes', () => {
    const diff = diffAgenticHistorySnapshots(
      {
        kind: 'agentic-history-snapshot',
        generatedAt: '2026-03-11T02:00:00.000Z',
        workOrder: {
          generatedAt: '2026-03-11T01:00:00.000Z',
          changedFiles: ['src/features/products/new.ts'],
          impactedDomainIds: ['products'],
          highestRiskLevel: 'high',
          requiredImpactBundles: ['product_data_pipeline', 'admin_experience'],
          recommendedBundleOrder: ['product_data_pipeline', 'admin_experience'],
          recommendedValidationByBundle: {
            product_data_pipeline: ['//:integration_prisma', '//:products_trigger_queue_unit'],
            admin_experience: ['//:accessibility_smoke'],
          },
        },
        executionReport: {
          generatedAt: '2026-03-11T02:05:00.000Z',
          validationDecision: 'included',
          validationRiskThreshold: 'medium',
          guardrailViolations: [],
          skippedValidationTargets: [],
        },
        bundleSelection: {
          selectedBundles: ['product_data_pipeline'],
          skippedBundles: [
            {
              bundle: 'admin_experience',
              reason: 'unchanged',
            },
          ],
        },
        bundlePlan: [
          {
            bundle: 'product_data_pipeline',
            priority: 'high',
            targets: ['//:integration_prisma', '//:products_trigger_queue_unit'],
          },
          {
            bundle: 'admin_experience',
            priority: 'medium',
            targets: ['//:accessibility_smoke'],
          },
        ],
        bundleReports: [
          {
            bundle: 'product_data_pipeline',
            priority: 'high',
            recommendedTargets: ['//:integration_prisma', '//:products_trigger_queue_unit'],
            executedTargets: [
              {
                target: '//:integration_prisma',
                status: 'passed',
                durationMs: 1000,
              },
              {
                target: '//:products_trigger_queue_unit',
                status: 'passed',
                durationMs: 900,
              },
            ],
          },
        ],
      },
      {
        kind: 'agentic-history-snapshot',
        generatedAt: '2026-03-10T02:00:00.000Z',
        workOrder: {
          generatedAt: '2026-03-10T01:00:00.000Z',
          changedFiles: ['src/features/products/old.ts'],
          impactedDomainIds: ['products'],
          highestRiskLevel: 'high',
          requiredImpactBundles: ['product_data_pipeline'],
          recommendedBundleOrder: ['product_data_pipeline'],
          recommendedValidationByBundle: {
            product_data_pipeline: ['//:integration_prisma'],
          },
        },
        executionReport: {
          generatedAt: '2026-03-10T02:05:00.000Z',
          validationDecision: 'skipped-by-default',
          validationRiskThreshold: null,
          guardrailViolations: [],
          skippedValidationTargets: ['//:integration_prisma'],
        },
        bundleSelection: {
          selectedBundles: ['product_data_pipeline'],
          skippedBundles: [],
        },
        bundlePlan: [
          {
            bundle: 'product_data_pipeline',
            priority: 'high',
            targets: ['//:integration_prisma'],
          },
        ],
        bundleReports: [
          {
            bundle: 'product_data_pipeline',
            priority: 'high',
            recommendedTargets: ['//:integration_prisma'],
            executedTargets: [
              {
                target: '//:integration_prisma',
                status: 'failed',
                durationMs: 1100,
              },
            ],
          },
        ],
      },
      {
        currentPath: 'artifacts/agent-history/latest.json',
        previousPath: 'artifacts/agent-history/previous.json',
      },
    );

    expect(diff.addedBundles).toEqual(['admin_experience']);
    expect(diff.removedBundles).toEqual([]);
    expect(diff.newlyHighRiskBundles).toEqual([]);
    expect(diff.riskEscalations).toEqual([]);
    expect(diff.selectionChanges).toEqual([
      {
        bundle: 'admin_experience',
        previousState: 'missing',
        currentState: 'skipped',
      },
    ]);
    expect(diff.bundlesWithRecommendationChanges).toEqual([
      {
        bundle: 'admin_experience',
        addedTargets: ['//:accessibility_smoke'],
        removedTargets: [],
      },
      {
        bundle: 'product_data_pipeline',
        addedTargets: ['//:products_trigger_queue_unit'],
        removedTargets: [],
      },
    ]);
    expect(diff.bundlesWithExecutionChanges).toEqual([
      {
        bundle: 'product_data_pipeline',
        addedTargets: ['//:products_trigger_queue_unit'],
        removedTargets: [],
        statusChanges: [
          {
            target: '//:integration_prisma',
            previousStatus: 'failed',
            currentStatus: 'passed',
          },
        ],
      },
    ]);
    expect(diff.validationDecisionChanged).toEqual({
      changed: true,
      previous: 'skipped-by-default',
      current: 'included',
    });
  });

  it('flags newly introduced and escalated high-risk bundles', () => {
    const diff = diffAgenticHistorySnapshots(
      {
        kind: 'agentic-history-snapshot',
        generatedAt: '2026-03-11T02:00:00.000Z',
        workOrder: {
          generatedAt: '2026-03-11T01:00:00.000Z',
          changedFiles: [],
          impactedDomainIds: ['ai-paths'],
          highestRiskLevel: 'high',
          requiredImpactBundles: ['ai_paths_runtime', 'admin_experience'],
          recommendedBundleOrder: ['ai_paths_runtime', 'admin_experience'],
          recommendedValidationByBundle: {
            ai_paths_runtime: ['//:unit'],
            admin_experience: ['//:accessibility_smoke'],
          },
        },
        executionReport: null,
        bundleSelection: {
          selectedBundles: ['ai_paths_runtime'],
          skippedBundles: [
            {
              bundle: 'admin_experience',
              reason: 'unchanged',
            },
          ],
        },
        bundlePlan: [
          {
            bundle: 'ai_paths_runtime',
            priority: 'high',
            targets: ['//:unit'],
          },
          {
            bundle: 'admin_experience',
            priority: 'high',
            targets: ['//:accessibility_smoke'],
          },
        ],
        bundleReports: [],
      },
      {
        kind: 'agentic-history-snapshot',
        generatedAt: '2026-03-10T02:00:00.000Z',
        workOrder: {
          generatedAt: '2026-03-10T01:00:00.000Z',
          changedFiles: [],
          impactedDomainIds: ['ai-paths'],
          highestRiskLevel: 'medium',
          requiredImpactBundles: ['admin_experience'],
          recommendedBundleOrder: ['admin_experience'],
          recommendedValidationByBundle: {
            admin_experience: ['//:accessibility_smoke'],
          },
        },
        executionReport: null,
        bundleSelection: {
          selectedBundles: ['admin_experience'],
          skippedBundles: [],
        },
        bundlePlan: [
          {
            bundle: 'admin_experience',
            priority: 'medium',
            targets: ['//:accessibility_smoke'],
          },
        ],
        bundleReports: [],
      },
      {
        currentPath: 'artifacts/agent-history/latest.json',
        previousPath: 'artifacts/agent-history/previous.json',
      },
    );

    expect(diff.newlyHighRiskBundles).toEqual(['ai_paths_runtime']);
    expect(diff.riskEscalations).toEqual([
      {
        bundle: 'admin_experience',
        previousPriority: 'medium',
        currentPriority: 'high',
      },
    ]);
    expect(diff.selectionChanges).toEqual([
      {
        bundle: 'admin_experience',
        previousState: 'selected',
        currentState: 'skipped',
      },
      {
        bundle: 'ai_paths_runtime',
        previousState: 'missing',
        currentState: 'selected',
      },
    ]);
  });
});
