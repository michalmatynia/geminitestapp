import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { parseScanOutput } from './lib/scan-output.mjs';

const tempRoots: string[] = [];

const repoRoot = process.cwd();
const propDrillingScriptPath = path.join(repoRoot, 'scripts', 'architecture', 'scan-prop-drilling.mjs');
const uiConsolidationScriptPath = path.join(
  repoRoot,
  'scripts',
  'architecture',
  'scan-ui-consolidation.mjs'
);
const collectMetricsScriptPath = path.join(repoRoot, 'scripts', 'architecture', 'collect-metrics.mjs');
const observabilityScriptPath = path.join(
  repoRoot,
  'scripts',
  'observability',
  'check-observability.mjs'
);
const canonicalSitewideScriptPath = path.join(
  repoRoot,
  'scripts',
  'canonical',
  'check-sitewide.mjs'
);
const canonicalStabilizationScriptPath = path.join(
  repoRoot,
  'scripts',
  'canonical',
  'check-stabilization.mjs'
);
const aiPathsCanonicalScriptPath = path.join(repoRoot, 'scripts', 'ai-paths', 'check-canonical.mjs');
const docsTooltipCoverageScriptPath = path.join(
  repoRoot,
  'scripts',
  'docs',
  'check-ai-paths-tooltip-coverage.ts'
);
const docsValidatorCoverageScriptPath = path.join(
  repoRoot,
  'scripts',
  'docs',
  'check-validator-doc-coverage.ts'
);
const qualityApiErrorSourcesScriptPath = path.join(
  repoRoot,
  'scripts',
  'quality',
  'check-api-error-sources.mjs'
);
const qualityTestDistributionScriptPath = path.join(
  repoRoot,
  'scripts',
  'quality',
  'check-test-distribution.mjs'
);

const createTempRoot = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-envelope-'));
  tempRoots.push(root);
  return root;
};

const writeFile = (root: string, relativePath: string, contents: string): void => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, 'utf8');
};

const seedArchitectureSources = (root: string): void => {
  writeFile(
    root,
    'src/features/demo/Parent.tsx',
    'export function Parent({ value }: { value: string }) { return <Middle value={value} />; }\nfunction Middle({ value }: { value: string }) { return <Leaf value={value} />; }\nfunction Leaf({ value }: { value: string }) { return <div>{value}</div>; }\n'
  );
  writeFile(
    root,
    'src/features/products/SettingsPanel.tsx',
    'export function ProductSettingsPanel({ title }: { title: string }) { return <section>{title}</section>; }\n'
  );
  writeFile(
    root,
    'src/features/orders/SettingsPanel.tsx',
    'export function OrderSettingsPanel({ title }: { title: string }) { return <section>{title}</section>; }\n'
  );
};

const seedObservabilitySources = (root: string): void => {
  writeFile(
    root,
    'src/good-log.ts',
    'import { logger } from \'@/shared/utils/logger\';\nlogger.info(\'[observability.check] startup complete\');\n'
  );
};

const seedQualitySources = (root: string): void => {
  writeFile(root, 'src/features/products/index.ts', 'export const products = true;\n');
  writeFile(
    root,
    'src/features/products/products.test.ts',
    'describe(\'products\', () => { it(\'works\', () => { expect(true).toBe(true); }); });\n'
  );
  writeFile(
    root,
    'src/app/api/products/route.ts',
    [
      'import { apiHandler } from \'@/shared/lib/api/api-handler\';',
      'import { GET_handler } from \'./handler\';',
      '',
      'export const GET = apiHandler(GET_handler, { source: \'products.GET\' });',
      '',
    ].join('\n')
  );
  writeFile(
    root,
    'src/app/api/products/handler.ts',
    [
      'export async function GET_handler(): Promise<Response> {',
      '  return Response.json({ ok: true });',
      '}',
      '',
    ].join('\n')
  );
};

const seedAiPathsCanonicalSources = (root: string): void => {
  const nodeDocsCatalogSourcePath = 'src/shared/lib/ai-paths/core/docs/node-docs.ts';
  const docsSnippetsSourcePath = 'src/shared/lib/ai-paths/core/docs/docs-snippets.ts';

  writeFile(root, 'src/example.ts', 'export const example = true;\n');
  writeFile(
    root,
    'src/shared/lib/ai-paths/core/validation-engine/docs-registry-adapter.constants.ts',
    [
      `export const NODE_DOCS_CATALOG_SOURCE_PATH = '${nodeDocsCatalogSourcePath}';`,
      `export const DOCS_SNIPPETS_SOURCE_PATH = '${docsSnippetsSourcePath}';`,
      '',
    ].join('\n')
  );
  writeFile(root, nodeDocsCatalogSourcePath, 'export const AI_PATHS_NODE_DOCS = [];\n');
  writeFile(root, docsSnippetsSourcePath, 'export const DOCS_SNIPPETS = {};\n');
  writeFile(
    root,
    'docs/ai-paths/node-validator-central-manifest.json',
    `${JSON.stringify(
      {
        sources: [
          { id: 'node-docs-catalog', path: nodeDocsCatalogSourcePath },
          { id: 'docs-snippets', path: docsSnippetsSourcePath },
        ],
      },
      null,
      2
    )}\n`
  );
  writeFile(
    root,
    'docs/ai-paths/tooltip-central-manifest.json',
    `${JSON.stringify(
      {
        sources: [{ id: 'ai-paths-doc-snippets', path: docsSnippetsSourcePath }],
      },
      null,
      2
    )}\n`
  );
  writeFile(
    root,
    'scripts/ai-paths/legacy-prune-manifest.json',
    `${JSON.stringify(
      {
        version: '1',
        rules: [
          {
            id: 'keep-example',
            description: 'fixture rule',
            targets: [
              {
                mode: 'file',
                file: 'src/example.ts',
                requiredSnippets: ['export const example = true;'],
              },
            ],
          },
        ],
      },
      null,
      2
    )}\n`
  );
};

const runSummaryJson = (
  root: string,
  scriptPath: string,
  args: string[],
  nodeArgs: string[] = []
) => parseScanOutput(
  execFileSync('node', [...nodeArgs, scriptPath, ...args], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  }),
  path.basename(scriptPath)
);

describe('scanner summary-json envelope', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('keeps architecture scanners partitioned into summary, details, paths, filters, and notes', () => {
    const root = createTempRoot();
    seedArchitectureSources(root);

    const propDrilling = runSummaryJson(root, propDrillingScriptPath, [
      '--summary-json',
      '--no-write',
      '--no-history',
    ]);
    const uiConsolidation = runSummaryJson(root, uiConsolidationScriptPath, [
      '--summary-json',
      '--no-write',
      '--no-history',
    ]);

    expect(propDrilling.scanner).toMatchObject({
      name: 'scan-prop-drilling',
      version: '1.0.0',
    });
    expect(propDrilling.summary).toMatchObject({
      componentCount: expect.any(Number),
    });
    expect(propDrilling.details).toMatchObject({
      backlog: expect.any(Array),
      transitionBacklog: expect.any(Array),
      componentBacklog: expect.any(Array),
      forwardingComponentBacklog: expect.any(Array),
      chains: expect.any(Array),
    });
    expect(propDrilling.paths).toBeNull();
    expect(propDrilling.filters).toMatchObject({
      historyDisabled: true,
      noWrite: true,
    });
    expect(propDrilling.notes).toContain('prop-drilling scan result');

    expect(uiConsolidation.scanner).toMatchObject({
      name: 'scan-ui-consolidation',
      version: '1.0.0',
    });
    expect(uiConsolidation.summary).toMatchObject({
      scannedFileCount: expect.any(Number),
    });
    expect(uiConsolidation.details).toMatchObject({
      candidates: expect.any(Array),
      opportunities: expect.any(Array),
      clusterDiagnostics: expect.any(Object),
    });
    expect(uiConsolidation.paths).toBeNull();
    expect(uiConsolidation.filters).toMatchObject({
      historyDisabled: true,
      noWrite: true,
    });
    expect(uiConsolidation.notes).toContain('ui consolidation scan result');
  });

  it('wraps architecture metrics collection in the shared scan envelope', () => {
    const root = createTempRoot();
    seedArchitectureSources(root);
    seedQualitySources(root);

    const metricsCollection = runSummaryJson(root, collectMetricsScriptPath, [
      '--summary-json',
      '--no-write',
      '--no-history',
    ]);

    expect(metricsCollection.scanner).toMatchObject({
      name: 'architecture-metrics-collect',
      version: '1.0.0',
    });
    expect(metricsCollection.status).toBe('ok');
    expect(metricsCollection.summary).toMatchObject({
      sourceFileCount: expect.any(Number),
      apiRouteCount: expect.any(Number),
      crossFeatureEdgePairCount: expect.any(Number),
      propDrillingCandidateChainCount: expect.any(Number),
      propDrillingDepthGte4ChainCount: expect.any(Number),
    });
    expect(metricsCollection.details).toMatchObject({
      source: expect.any(Object),
      api: expect.any(Object),
      imports: expect.any(Object),
      architecture: expect.any(Object),
      runtime: expect.any(Object),
      codeHealth: expect.any(Object),
      hotspots: expect.any(Object),
      propDrilling: expect.any(Object),
    });
    expect(metricsCollection.paths).toBeNull();
    expect(metricsCollection.filters).toMatchObject({
      historyDisabled: true,
      noWrite: true,
      rawJson: false,
      ci: false,
    });
    expect(metricsCollection.notes).toContain('architecture baseline metrics collection result');
    expect(fs.existsSync(path.join(root, 'docs', 'metrics', 'baseline-latest.json'))).toBe(false);
  });

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
    });
    expect(testDistribution.details).toMatchObject({
      featuresWithTests: expect.any(Array),
      featuresWithoutTests: expect.any(Array),
      issues: expect.any(Array),
    });
    expect(testDistribution.paths).toBeNull();
    expect(testDistribution.filters).toMatchObject({
      historyDisabled: true,
      noWrite: true,
      strictMode: false,
    });
    expect(testDistribution.notes).toContain('test-distribution quality check result');
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
    expect(canonicalSitewide.status).toBe('ok');
    expect(canonicalSitewide.summary).toMatchObject({
      runtimeFileCount: expect.any(Number),
      docsArtifactCount: expect.any(Number),
      violationCount: 0,
    });
    expect(canonicalSitewide.details).toMatchObject({
      violations: [],
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
  });

  it('wraps canonical stabilization aggregate checks in the shared scan envelope', () => {
    const canonicalStabilization = runSummaryJson(repoRoot, canonicalStabilizationScriptPath, [
      '--summary-json',
    ]);

    expect(canonicalStabilization.scanner).toMatchObject({
      name: 'canonical-stabilization-check',
      version: '1.0.0',
    });
    expect(canonicalStabilization.status).toBe('ok');
    expect(canonicalStabilization.summary).toMatchObject({
      canonicalStatus: 'pass',
      canonicalRuntimeFileCount: expect.any(Number),
      canonicalDocsArtifactCount: expect.any(Number),
      aiStatus: 'pass',
      aiSourceFileCount: expect.any(Number),
      observabilityStatus: 'pass',
      observabilityLegacyCompatibilityViolations: 0,
      observabilityRuntimeErrors: 0,
    });
    expect(canonicalStabilization.details).toMatchObject({
      canonical: {
        status: 'pass',
        runtimeFileCount: expect.any(Number),
        docsArtifactCount: expect.any(Number),
        ok: true,
      },
      ai: {
        status: 'pass',
        sourceFileCount: expect.any(Number),
        ok: true,
      },
      observability: {
        status: 'pass',
        legacyCompatibilityViolations: 0,
        runtimeErrors: 0,
        ok: true,
      },
    });
    expect(canonicalStabilization.paths).toBeNull();
    expect(canonicalStabilization.filters).toMatchObject({
      structured: true,
    });
    expect(canonicalStabilization.notes).toContain(
      'canonical stabilization aggregate check result'
    );
  }, 20_000);

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
  });
});
