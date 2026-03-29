import fs from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  aiPathsCanonicalScriptPath,
  canonicalSitewideScriptPath,
  canonicalStabilizationScriptPath,
  cleanupTempRoots,
  createTempRoot,
  docsTooltipCoverageScriptPath,
  docsValidatorCoverageScriptPath,
  observabilityScriptPath,
  qualityApiErrorSourcesScriptPath,
  qualityHighRiskCoverageScriptPath,
  qualityTestDistributionScriptPath,
  repoRoot,
  runSummaryJson,
  seedAiPathsCanonicalSources,
  seedHighRiskCoverageSummary,
  seedObservabilitySources,
  seedQualitySources,
  testingQualitySnapshotScriptPath,
} from './scan-summary-json-envelope.test-support';

describe('scanner summary-json envelope', () => {
  afterEach(cleanupTempRoots);
  it('wraps observability summary-json output in the shared scan envelope', () => {
    const root = createTempRoot();
    seedObservabilitySources(root);

    const observability = runSummaryJson(root, observabilityScriptPath, [
      '--mode=check',
      '--allow-partial',
      '--no-runtime-log-scan',
      '--no-ci-annotations',
      '--summary-json',
    ]);

    expect(observability.scanner).toMatchObject({
      name: 'observability-check',
      version: '2',
    });
    expect(observability.status).toBe('ok');
    expect(observability.summary).toMatchObject({
      mode: 'check',
      loggerViolations: 0,
      runtimeErrors: 0,
    });
    expect(observability.details).toMatchObject({
      context: expect.any(Object),
      routeCoverage: expect.any(Object),
      violations: expect.any(Object),
      runtime: expect.objectContaining({
        disabled: true,
      }),
    });
    expect(observability.paths).toMatchObject({
      checkLog: expect.any(String),
      errorLog: null,
    });
    expect(observability.filters).toMatchObject({
      mode: 'check',
      allowPartial: true,
      scanRuntimeLogs: false,
      emitCiAnnotations: false,
    });
    expect(observability.notes).toContain('observability check scan envelope');

    const checkLogPath = path.join(root, String(observability.paths?.checkLog ?? ''));
    expect(fs.existsSync(checkLogPath)).toBe(true);
  });

  it('wraps quality checks in the shared scan envelope', () => {
    const root = createTempRoot();
    seedQualitySources(root);

    const apiErrorSources = runSummaryJson(root, qualityApiErrorSourcesScriptPath, [
      '--summary-json',
      '--no-write',
      '--no-history',
    ]);
    const testDistribution = runSummaryJson(root, qualityTestDistributionScriptPath, [
      '--summary-json',
      '--no-write',
      '--no-history',
    ]);
    seedHighRiskCoverageSummary(root);
    const highRiskCoverage = runSummaryJson(root, qualityHighRiskCoverageScriptPath, [
      '--summary-json',
      '--no-write',
      '--no-history',
    ]);
    const testingQualitySnapshot = runSummaryJson(root, testingQualitySnapshotScriptPath, [
      '--summary-json',
      '--no-write',
      '--no-history',
    ]);

    expect(apiErrorSources.scanner).toMatchObject({
      name: 'api-error-sources',
      version: '1.0.0',
    });
    expect(apiErrorSources.summary).toMatchObject({
      routeFileCount: expect.any(Number),
      handlerFileCount: expect.any(Number),
    });
    expect(apiErrorSources.details).toMatchObject({
      issues: expect.any(Array),
      rules: expect.any(Array),
      scope: expect.any(Object),
    });
    expect(apiErrorSources.paths).toBeNull();
    expect(apiErrorSources.filters).toMatchObject({
      historyDisabled: true,
      noWrite: true,
      strictMode: false,
    });
    expect(apiErrorSources.notes).toContain('api-error-sources quality check result');

    expect(testDistribution.scanner).toMatchObject({
      name: 'test-distribution',
      version: '1.0.0',
    });
    expect(testDistribution.summary).toMatchObject({
      featureCount: expect.any(Number),
      totalTestFiles: expect.any(Number),
      featuresWithoutFastTestCount: expect.any(Number),
      featuresWithoutNegativeTestCount: expect.any(Number),
    });
    expect(testDistribution.details).toMatchObject({
      featuresWithTests: expect.any(Array),
      featuresWithoutTests: expect.any(Array),
      featuresWithoutFastTests: expect.any(Array),
      featuresWithoutNegativeTests: expect.any(Array),
      issues: expect.any(Array),
    });
    expect(testDistribution.paths).toBeNull();
    expect(testDistribution.filters).toMatchObject({
      historyDisabled: true,
      noWrite: true,
      strictMode: false,
    });
    expect(testDistribution.notes).toContain('test-distribution quality check result');

    expect(highRiskCoverage.scanner).toMatchObject({
      name: 'high-risk-coverage',
      version: '1.0.0',
    });
    expect(highRiskCoverage.summary).toMatchObject({
      targetCount: expect.any(Number),
      matchedTargetCount: expect.any(Number),
      passingTargetCount: expect.any(Number),
      failingTargetCount: expect.any(Number),
      uncoveredTargetCount: expect.any(Number),
      errorCount: expect.any(Number),
      warningCount: expect.any(Number),
      infoCount: expect.any(Number),
    });
    expect(highRiskCoverage.details).toMatchObject({
      coverageSummaryPath: expect.any(String),
      targets: expect.any(Array),
      issues: expect.any(Array),
      rules: expect.any(Array),
    });
    expect(highRiskCoverage.paths).toBeNull();
    expect(highRiskCoverage.filters).toMatchObject({
      historyDisabled: true,
      noWrite: true,
      strictMode: false,
    });
    expect(highRiskCoverage.notes).toContain('high-risk-coverage quality check result');

    expect(testingQualitySnapshot.scanner).toMatchObject({
      name: 'testing-quality-snapshot',
      version: '1.0.0',
    });
    expect(testingQualitySnapshot.summary).toMatchObject({
      repoTestFileCount: expect.any(Number),
      e2eTestFileCount: expect.any(Number),
      featuresWithoutTestCount: expect.any(Number),
      featuresWithoutFastTestCount: expect.any(Number),
      featuresWithoutNegativeTestCount: expect.any(Number),
      failingBaselineCount: expect.any(Number),
      missingBaselineCount: expect.any(Number),
      requiredFailingBaselineCount: expect.any(Number),
      requiredMissingBaselineCount: expect.any(Number),
      todoCount: expect.any(Number),
    });
    expect(testingQualitySnapshot.details).toMatchObject({
      inventory: expect.objectContaining({
        repoTestFileCount: expect.any(Number),
        e2eTestFileCount: expect.any(Number),
        scriptTestFileCount: expect.any(Number),
        featureCoverage: expect.objectContaining({
          featureCount: expect.any(Number),
          featuresWithTestCount: expect.any(Number),
          featuresWithoutTestCount: expect.any(Number),
          featuresWithoutTests: expect.any(Array),
          featuresWithoutFastTests: expect.any(Array),
          featuresWithoutNegativeTests: expect.any(Array),
        }),
        hygiene: expect.objectContaining({
          onlyCount: expect.any(Number),
          skipCount: expect.any(Number),
          todoCount: expect.any(Number),
        }),
      }),
      baselines: expect.any(Array),
      slowestSuites: expect.any(Array),
      featureCoverage: expect.objectContaining({
        withTests: expect.any(Array),
        withoutTests: expect.any(Array),
        withoutFastTests: expect.any(Array),
        withoutNegativeTests: expect.any(Array),
      }),
    });
    expect(testingQualitySnapshot.paths).toBeNull();
    expect(testingQualitySnapshot.filters).toMatchObject({
      historyDisabled: true,
      noWrite: true,
      strictMode: false,
      ci: false,
    });
    expect(testingQualitySnapshot.notes).toContain('testing quality snapshot result');
  });

  it('wraps AI-Paths canonical checks in the shared scan envelope', () => {
    const root = createTempRoot();
    seedAiPathsCanonicalSources(root);

    const aiPathsCanonical = runSummaryJson(root, aiPathsCanonicalScriptPath, [
      '--summary-json',
      '--no-write',
      '--no-history',
    ]);

    expect(aiPathsCanonical.scanner).toMatchObject({
      name: 'ai-paths-check-canonical',
      version: '1.0.0',
    });
    expect(aiPathsCanonical.status).toBe('ok');
    expect(aiPathsCanonical.summary).toMatchObject({
      sourceFileCount: expect.any(Number),
      violationCount: 0,
    });
    expect(aiPathsCanonical.details).toMatchObject({
      violations: [],
      scope: {
        srcDir: 'src',
        constantsFile: 'src/shared/lib/ai-paths/core/validation-engine/docs-registry-adapter.constants.ts',
        nodeValidatorManifest: 'docs/ai-paths/node-validator-central-manifest.json',
        tooltipManifest: 'docs/ai-paths/tooltip-central-manifest.json',
        legacyPruneManifest: 'scripts/ai-paths/legacy-prune-manifest.json',
      },
    });
    expect(aiPathsCanonical.paths).toBeNull();
    expect(aiPathsCanonical.filters).toMatchObject({
      historyDisabled: true,
      noWrite: true,
      strictMode: false,
    });
    expect(aiPathsCanonical.notes).toContain('ai-paths canonical check result');
  });

  it('wraps canonical sitewide checks in the shared scan envelope', () => {
    const canonicalSitewide = runSummaryJson(repoRoot, canonicalSitewideScriptPath, ['--summary-json']);

    expect(canonicalSitewide.scanner).toMatchObject({
      name: 'canonical-check-sitewide',
      version: '1.0.0',
    });
    expect(['ok', 'failed']).toContain(canonicalSitewide.status);
    expect(canonicalSitewide.summary).toMatchObject({
      runtimeFileCount: expect.any(Number),
      docsArtifactCount: expect.any(Number),
      violationCount: expect.any(Number),
    });
    expect(canonicalSitewide.details).toMatchObject({
      violations: expect.any(Array),
      scope: {
        srcDir: 'src',
        rootTestsDir: '__tests__',
        requiredDocs: expect.any(Array),
        exceptionRegisterPath: expect.any(String),
        canonicalArtifactsManifest: 'docs/canonical-artifacts-latest.json',
      },
    });
    expect(canonicalSitewide.paths).toBeNull();
    expect(canonicalSitewide.filters).toMatchObject({
      historyDisabled: true,
      noWrite: true,
      strictMode: false,
    });
    expect(canonicalSitewide.notes).toContain('canonical sitewide check result');
    expect(canonicalSitewide.summary.violationCount).toBe(
      canonicalSitewide.details.violations.length
    );
  }, 45_000);

  it('wraps canonical stabilization aggregate checks in the shared scan envelope', () => {
    const canonicalStabilization = runSummaryJson(repoRoot, canonicalStabilizationScriptPath, [
      '--summary-json',
    ]);

	    expect(canonicalStabilization.scanner).toMatchObject({
	      name: 'canonical-stabilization-check',
	      version: '1.0.0',
	    });
	    expect(['ok', 'failed']).toContain(canonicalStabilization.status);
	    expect(canonicalStabilization.summary).toMatchObject({
	      canonicalStatus: expect.any(String),
	      canonicalRuntimeFileCount: expect.any(Number),
	      canonicalDocsArtifactCount: expect.any(Number),
	      aiStatus: expect.any(String),
	      aiSourceFileCount: expect.any(Number),
	      observabilityStatus: expect.any(String),
	    });
      expect(canonicalStabilization.details).toMatchObject({
        canonical: {
          status: expect.any(String),
          runtimeFileCount: expect.any(Number),
          docsArtifactCount: expect.any(Number),
          ok: expect.any(Boolean),
        },
        ai: {
          status: expect.any(String),
          ok: expect.any(Boolean),
        },
        observability: {
          status: expect.any(String),
	        ok: expect.any(Boolean),
	      },
	    });
	    expect(canonicalStabilization.summary.canonicalStatus).toBe(
	      canonicalStabilization.details.canonical.status
	    );
	    expect(canonicalStabilization.summary.aiStatus).toBe(canonicalStabilization.details.ai.status);
	    expect(canonicalStabilization.summary.observabilityStatus).toBe(
	      canonicalStabilization.details.observability.status
	    );
	    expect(canonicalStabilization.summary.canonicalRuntimeFileCount).toBe(
	      canonicalStabilization.details.canonical.runtimeFileCount
	    );
	    expect(canonicalStabilization.summary.canonicalDocsArtifactCount).toBe(
	      canonicalStabilization.details.canonical.docsArtifactCount
	    );
    if (canonicalStabilization.details.ai.sourceFileCount === null) {
      expect(canonicalStabilization.summary.aiSourceFileCount).toBe(0);
    } else {
      expect(typeof canonicalStabilization.details.ai.sourceFileCount).toBe('number');
      expect(canonicalStabilization.summary.aiSourceFileCount).toBe(
        canonicalStabilization.details.ai.sourceFileCount
      );
    }
	    expect(
	      canonicalStabilization.details.observability.legacyCompatibilityViolations === null ||
	        typeof canonicalStabilization.details.observability.legacyCompatibilityViolations === 'number'
	    ).toBe(true);
	    expect(
	      canonicalStabilization.details.observability.runtimeErrors === null ||
	        typeof canonicalStabilization.details.observability.runtimeErrors === 'number'
	    ).toBe(true);
	    expect(canonicalStabilization.paths).toBeNull();
	    expect(canonicalStabilization.filters).toMatchObject({
	      structured: true,
	    });
    expect(canonicalStabilization.notes).toContain(
      'canonical stabilization aggregate check result'
    );
  }, 90_000);

  it('wraps docs checks in the shared scan envelope', () => {
    const tooltipCoverage = runSummaryJson(
      repoRoot,
      docsTooltipCoverageScriptPath,
      ['--summary-json'],
      ['--import', 'tsx']
    );
    const validatorCoverage = runSummaryJson(
      repoRoot,
      docsValidatorCoverageScriptPath,
      ['--summary-json'],
      ['--import', 'tsx']
    );

    expect(tooltipCoverage.scanner).toMatchObject({
      name: 'docs-ai-paths-tooltip-coverage',
      version: '1.0.0',
    });
    expect(tooltipCoverage.status).toBe('ok');
    expect(tooltipCoverage.summary).toMatchObject({
      entryCount: expect.any(Number),
      nodeDocCount: expect.any(Number),
      requiredTooltipCount: expect.any(Number),
      issueCount: 0,
    });
    expect(tooltipCoverage.details).toMatchObject({
      duplicateIds: [],
      missingRequired: [],
      missingNodePaletteEntries: [],
      missingNodeConfigEntries: [],
      malformedEntries: [],
    });
    expect(tooltipCoverage.paths).toBeNull();
    expect(tooltipCoverage.filters).toMatchObject({
      historyDisabled: true,
      noWrite: true,
      strictMode: false,
    });
    expect(tooltipCoverage.notes).toContain('ai-paths tooltip coverage check result');

    expect(validatorCoverage.scanner).toMatchObject({
      name: 'docs-validator-doc-coverage',
      version: '1.0.0',
    });
    expect(validatorCoverage.status).toBe('ok');
    expect(validatorCoverage.summary).toMatchObject({
      exportedCallableCount: expect.any(Number),
      missingJsDocCount: 0,
      missingCatalogCount: 0,
      issueCount: 0,
    });
    expect(validatorCoverage.details).toMatchObject({
      missingJsDoc: [],
      missingCatalog: [],
    });
    expect(validatorCoverage.paths).toBeNull();
    expect(validatorCoverage.filters).toMatchObject({
      historyDisabled: true,
      noWrite: true,
      strictMode: false,
    });
    expect(validatorCoverage.notes).toContain('validator docs coverage check result');
  }, 20_000);

});
