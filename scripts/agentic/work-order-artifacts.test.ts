import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { agenticRepoRoot } from './domain-manifests';
import {
  listRequiredGeneratedArtifacts,
  stageGeneratedArtifacts,
} from './work-order-artifacts';

const tempDirectories: string[] = [];

afterAll(async () => {
  await Promise.all(
    tempDirectories.map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

describe('generated artifact staging', () => {
  it('deduplicates required generated artifacts', () => {
    const artifacts = listRequiredGeneratedArtifacts({
      kind: 'agentic-work-order',
      generatedAt: '2026-03-11T00:00:00.000Z',
      changedFiles: [],
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
      requiredDocs: [],
      requiredGeneratedArtifacts: [
        'docs/metrics/api-error-sources-latest.json',
        'docs/metrics/api-error-sources-latest.json',
      ],
      generatedOnlyPaths: [],
      manualOnlyPaths: [],
      requiredDocGenerators: [],
      requiredScannerTargets: [],
      requiredValidationTargets: [],
    });

    expect(artifacts).toEqual(['docs/metrics/api-error-sources-latest.json']);
  });

  it('stages existing generated artifacts and reports missing ones', async () => {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'agentic-artifacts-'));
    tempDirectories.push(tempDirectory);

    const outputDirectory = path.relative(agenticRepoRoot, tempDirectory).replace(/\\/g, '/');
    const statuses = await stageGeneratedArtifacts(
      {
        kind: 'agentic-work-order',
        generatedAt: '2026-03-11T00:00:00.000Z',
        changedFiles: [],
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
        requiredDocs: [],
        requiredGeneratedArtifacts: [
          'docs/metrics/api-error-sources-latest.json',
          'docs/metrics/does-not-exist.json',
        ],
        generatedOnlyPaths: [],
        manualOnlyPaths: [],
        requiredDocGenerators: [],
        requiredScannerTargets: [],
        requiredValidationTargets: [],
      },
      outputDirectory,
    );

    expect(statuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          artifactPath: 'docs/metrics/api-error-sources-latest.json',
          exists: true,
        }),
        expect.objectContaining({
          artifactPath: 'docs/metrics/does-not-exist.json',
          exists: false,
          stagedPath: null,
        }),
      ]),
    );

    await expect(
      fs.access(path.join(tempDirectory, 'docs/metrics/api-error-sources-latest.json')),
    ).resolves.toBeUndefined();
  });
});
