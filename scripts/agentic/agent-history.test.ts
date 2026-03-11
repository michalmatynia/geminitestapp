import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { collectAgenticHistorySnapshot } from './agent-history';
import { agenticRepoRoot } from './domain-manifests';

const tempDirectories: string[] = [];

afterAll(async () => {
  await Promise.all(
    tempDirectories.map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

describe('agentic history snapshot', () => {
  it('collects work-order, bundle plan, execution report, and bundle reports', async () => {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'agentic-history-'));
    tempDirectories.push(tempDirectory);

    const workOrderPath = path.join(tempDirectory, 'agent-work-order.json');
    const executionReportPath = path.join(tempDirectory, 'agent-execution-report.json');
    const bundlePlanPath = path.join(tempDirectory, 'agent-bundle-plan.json');
    const bundleSelectionPath = path.join(tempDirectory, 'agent-bundle-selection.json');
    const bundleReportDirectory = path.join(tempDirectory, 'agent-bundle-reports');

    await fs.mkdir(bundleReportDirectory, { recursive: true });

    await fs.writeFile(
      workOrderPath,
      JSON.stringify({
        kind: 'agentic-work-order',
        generatedAt: '2026-03-11T00:00:00.000Z',
        changedFiles: ['src/features/products/x.ts'],
        impactedDomainIds: ['products'],
        highestRiskLevel: 'high',
        requiredImpactBundles: ['product_data_pipeline'],
        bundlePriorityByBundle: { product_data_pipeline: 'high' },
        recommendedBundleOrder: ['product_data_pipeline'],
        recommendedValidationByBundle: {
          product_data_pipeline: ['//:integration_prisma', '//:products_trigger_queue_unit'],
        },
        requiredDocs: [],
        requiredGeneratedArtifacts: [],
        generatedOnlyPaths: [],
        manualOnlyPaths: [],
        requiredDocGenerators: [],
        requiredScannerTargets: [],
        requiredValidationTargets: ['//:integration_prisma'],
      }),
      'utf8',
    );

    await fs.writeFile(
      executionReportPath,
      JSON.stringify({
        kind: 'agentic-execution-report',
        generatedAt: '2026-03-11T01:00:00.000Z',
        validationDecision: 'included',
        validationRiskThreshold: 'medium',
        guardrailViolations: [],
        skippedValidationTargets: [],
      }),
      'utf8',
    );

    await fs.writeFile(
      bundlePlanPath,
      JSON.stringify({
        kind: 'agentic-bundle-plan',
        generatedAt: '2026-03-11T00:30:00.000Z',
        workOrderPath: 'artifacts/agent-work-order.json',
        bundles: [
          {
            bundle: 'product_data_pipeline',
            priority: 'high',
            targets: ['//:integration_prisma', '//:products_trigger_queue_unit'],
          },
        ],
      }),
      'utf8',
    );

    await fs.writeFile(
      bundleSelectionPath,
      JSON.stringify({
        kind: 'agentic-bundle-selection',
        generatedAt: '2026-03-11T00:40:00.000Z',
        planPath: 'artifacts/agent-bundle-plan.json',
        previousHistoryPath: 'artifacts/agent-history/previous.json',
        selectedBundles: ['product_data_pipeline'],
        attemptedSuppressions: [
          {
            bundle: 'product_data_pipeline',
            reason: 'unchanged-high-risk-retained',
          },
        ],
        skippedBundles: [],
      }),
      'utf8',
    );

    await fs.writeFile(
      path.join(bundleReportDirectory, 'product_data_pipeline.json'),
      JSON.stringify({
        bundle: 'product_data_pipeline',
        priority: 'high',
        targets: [
          {
            target: '//:integration_prisma',
            status: 'passed',
            durationMs: 1200,
          },
        ],
      }),
      'utf8',
    );

    const snapshot = await collectAgenticHistorySnapshot({
      workOrderPath: path.relative(agenticRepoRoot, workOrderPath).replace(/\\/g, '/'),
      executionReportPath: path
        .relative(agenticRepoRoot, executionReportPath)
        .replace(/\\/g, '/'),
      bundlePlanPath: path.relative(agenticRepoRoot, bundlePlanPath).replace(/\\/g, '/'),
      bundleSelectionPath: path
        .relative(agenticRepoRoot, bundleSelectionPath)
        .replace(/\\/g, '/'),
      bundleReportDirectory: path
        .relative(agenticRepoRoot, bundleReportDirectory)
        .replace(/\\/g, '/'),
    });

    expect(snapshot.workOrder.impactedDomainIds).toEqual(['products']);
    expect(snapshot.executionReport?.validationDecision).toBe('included');
    expect(snapshot.bundlePlan).toEqual([
      expect.objectContaining({
        bundle: 'product_data_pipeline',
        priority: 'high',
      }),
    ]);
    expect(snapshot.bundleSelection).toEqual({
      selectedBundles: ['product_data_pipeline'],
      attemptedSuppressions: [
        {
          bundle: 'product_data_pipeline',
          reason: 'unchanged-high-risk-retained',
        },
      ],
      skippedBundles: [],
    });
    expect(snapshot.bundleReports).toEqual([
      expect.objectContaining({
        bundle: 'product_data_pipeline',
        recommendedTargets: ['//:integration_prisma', '//:products_trigger_queue_unit'],
        executedTargets: [
          expect.objectContaining({
            target: '//:integration_prisma',
            status: 'passed',
          }),
        ],
      }),
    ]);
  });

  it('derives full selection when no explicit bundle-selection artifact exists', async () => {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'agentic-history-'));
    tempDirectories.push(tempDirectory);

    const workOrderPath = path.join(tempDirectory, 'agent-work-order.json');
    const bundlePlanPath = path.join(tempDirectory, 'agent-bundle-plan.json');

    await fs.writeFile(
      workOrderPath,
      JSON.stringify({
        kind: 'agentic-work-order',
        generatedAt: '2026-03-11T00:00:00.000Z',
        changedFiles: [],
        impactedDomainIds: ['products'],
        highestRiskLevel: 'high',
        requiredImpactBundles: ['product_data_pipeline', 'admin_experience'],
        bundlePriorityByBundle: {
          product_data_pipeline: 'high',
          admin_experience: 'medium',
        },
        recommendedBundleOrder: ['product_data_pipeline', 'admin_experience'],
        recommendedValidationByBundle: {
          product_data_pipeline: ['//:integration_prisma'],
          admin_experience: ['//:accessibility_smoke'],
        },
        requiredDocs: [],
        requiredGeneratedArtifacts: [],
        generatedOnlyPaths: [],
        manualOnlyPaths: [],
        requiredDocGenerators: [],
        requiredScannerTargets: [],
        requiredValidationTargets: ['//:integration_prisma'],
      }),
      'utf8',
    );

    await fs.writeFile(
      bundlePlanPath,
      JSON.stringify({
        kind: 'agentic-bundle-plan',
        generatedAt: '2026-03-11T00:30:00.000Z',
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
      }),
      'utf8',
    );

    const snapshot = await collectAgenticHistorySnapshot({
      workOrderPath: path.relative(agenticRepoRoot, workOrderPath).replace(/\\/g, '/'),
      bundlePlanPath: path.relative(agenticRepoRoot, bundlePlanPath).replace(/\\/g, '/'),
    });

    expect(snapshot.bundleSelection).toEqual({
      selectedBundles: ['product_data_pipeline', 'admin_experience'],
      attemptedSuppressions: [],
      skippedBundles: [],
    });
  });
});
