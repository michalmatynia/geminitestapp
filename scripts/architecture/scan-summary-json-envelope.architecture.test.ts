import fs from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  cleanupTempRoots,
  createTempRoot,
  guardrailsScriptPath,
  propDrillingScriptPath,
  runSummaryJson,
  seedArchitectureSources,
  seedGuardrailBaseline,
  seedQualitySources,
  seedTypeClusterNoiseSources,
  seedTypeClusterSources,
  typeClustersScriptPath,
  uiConsolidationGuardrailScriptPath,
  uiConsolidationScriptPath,
  collectMetricsScriptPath,
} from './scan-summary-json-envelope.test-support';

describe('scanner summary-json envelope', () => {
  afterEach(cleanupTempRoots);
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

  it('wraps type-cluster scans in the shared scan envelope', () => {
    const root = createTempRoot();
    seedTypeClusterSources(root);

    const typeClusters = runSummaryJson(root, typeClustersScriptPath, [
      '--summary-json',
      '--no-write',
      '--no-history',
    ]);

    expect(typeClusters.scanner).toMatchObject({
      name: 'scan-type-clusters',
      version: '1.0.0',
    });
    expect(typeClusters.status).toBe('ok');
    expect(typeClusters.summary).toMatchObject({
      filesScanned: 3,
      exportedDeclarationsScanned: 5,
      candidateDeclarationsScanned: 5,
      exactShapeClusters: 1,
      nearShapeClusters: 1,
      clustersAfterFilters: 2,
      declarationsInClusters: 4,
      highestRiskScore: expect.any(Number),
    });
    expect(typeClusters.details).toMatchObject({
      status: 'ok',
      clusters: [
        expect.objectContaining({
          clusterKind: 'exact-shape',
          declarationCount: 2,
          declarations: expect.arrayContaining([
            expect.objectContaining({
              name: 'SharedOptionDto',
              path: 'src/features/orders/types.ts',
            }),
            expect.objectContaining({
              name: 'LabeledOptionDto',
              path: 'src/features/products/types.ts',
            }),
          ]),
        }),
        expect.objectContaining({
          clusterKind: 'near-shape',
          declarationCount: 2,
          declarations: expect.arrayContaining([
            expect.objectContaining({
              name: 'ScopeFilterDto',
              path: 'src/features/orders/types.ts',
            }),
            expect.objectContaining({
              name: 'ScopeSelectionDto',
              path: 'src/features/products/types.ts',
            }),
          ]),
        }),
      ],
    });
    expect(typeClusters.paths).toBeNull();
    expect(typeClusters.filters).toMatchObject({
      domains: [],
      minRisk: 0,
      historyDisabled: true,
      noWrite: true,
    });
    expect(typeClusters.notes).toContain('type-clusters scan result');
    expect(fs.existsSync(path.join(root, 'docs', 'metrics', 'type-clusters-latest.json'))).toBe(false);
  });

  it('ignores primitive aliases and empty exported shapes when clustering types', () => {
    const root = createTempRoot();
    seedTypeClusterNoiseSources(root);

    const typeClusters = runSummaryJson(root, typeClustersScriptPath, [
      '--summary-json',
      '--no-write',
      '--no-history',
    ]);

    expect(typeClusters.status).toBe('ok');
    expect(typeClusters.summary).toMatchObject({
      filesScanned: 2,
      exportedDeclarationsScanned: 8,
      candidateDeclarationsScanned: 4,
      exactShapeClusters: 1,
      nearShapeClusters: 1,
      clustersAfterFilters: 2,
      declarationsInClusters: 4,
    });
    expect(typeClusters.details).toMatchObject({
      status: 'ok',
      clusters: [
        expect.objectContaining({
          declarations: expect.arrayContaining([
            expect.objectContaining({ name: 'SharedOptionDto' }),
            expect.objectContaining({ name: 'LabeledOptionDto' }),
          ]),
        }),
        expect.objectContaining({
          declarations: expect.arrayContaining([
            expect.objectContaining({ name: 'ScopeFilterDto' }),
            expect.objectContaining({ name: 'ScopeSelectionDto' }),
          ]),
        }),
      ],
    });

    const clusteredDeclarationNames = new Set(
      (typeClusters.details?.clusters ?? []).flatMap((cluster) =>
        (cluster.declarations ?? []).map((declaration: { name?: string }) => declaration.name)
      )
    );

    expect(clusteredDeclarationNames.has('PrimitiveId')).toBe(false);
    expect(clusteredDeclarationNames.has('AliasText')).toBe(false);
    expect(clusteredDeclarationNames.has('EmptyMarker')).toBe(false);
    expect(clusteredDeclarationNames.has('AnotherEmpty')).toBe(false);
  });

  it('applies type-cluster domain and risk filters after scanning', () => {
    const root = createTempRoot();
    seedTypeClusterSources(root);

    const highRiskOnly = runSummaryJson(root, typeClustersScriptPath, [
      '--summary-json',
      '--no-write',
      '--no-history',
      '--min-risk',
      '12',
    ]);
    const missingDomain = runSummaryJson(root, typeClustersScriptPath, [
      '--summary-json',
      '--no-write',
      '--no-history',
      '--domain',
      'shared:contracts',
    ]);

    expect(highRiskOnly.summary).toMatchObject({
      exactShapeClusters: 1,
      nearShapeClusters: 1,
      clustersAfterFilters: 1,
      declarationsInClusters: 2,
      highestRiskScore: 12,
    });
    expect(highRiskOnly.details).toMatchObject({
      status: 'ok',
      clusters: [
        expect.objectContaining({
          clusterKind: 'exact-shape',
          declarationCount: 2,
        }),
      ],
    });
    expect(highRiskOnly.filters).toMatchObject({
      domains: [],
      minRisk: 12,
      historyDisabled: true,
      noWrite: true,
    });

    expect(missingDomain.summary).toMatchObject({
      exactShapeClusters: 1,
      nearShapeClusters: 1,
      clustersAfterFilters: 0,
      declarationsInClusters: 0,
      highestRiskScore: 0,
    });
    expect(missingDomain.details).toMatchObject({
      status: 'ok',
      clusters: [],
    });
    expect(missingDomain.filters).toMatchObject({
      domains: ['shared:contracts'],
      minRisk: 0,
      historyDisabled: true,
      noWrite: true,
    });
  });

  it('parses inline type-cluster flags and treats repeated domains as an OR filter', () => {
    const root = createTempRoot();
    seedTypeClusterSources(root);

    const typeClusters = runSummaryJson(root, typeClustersScriptPath, [
      '--summary-json',
      '--no-write',
      '--no-history',
      '--domain=shared:contracts',
      '--domain=feature:products',
      '--min-risk=12',
    ]);

    expect(typeClusters.status).toBe('ok');
    expect(typeClusters.summary).toMatchObject({
      exactShapeClusters: 1,
      nearShapeClusters: 1,
      clustersAfterFilters: 1,
      declarationsInClusters: 2,
      highestRiskScore: 12,
    });
    expect(typeClusters.details).toMatchObject({
      status: 'ok',
      clusters: [
        expect.objectContaining({
          clusterKind: 'exact-shape',
          domains: ['feature:orders', 'feature:products'],
          declarationCount: 2,
        }),
      ],
    });
    expect(typeClusters.filters).toMatchObject({
      domains: ['shared:contracts', 'feature:products'],
      minRisk: 12,
      topLimit: 25,
      planTopLimit: 20,
      historyDisabled: true,
      noWrite: true,
    });
  });

  it('limits type-cluster markdown artifacts without truncating structured cluster output', () => {
    const root = createTempRoot();
    seedTypeClusterSources(root);

    const typeClusters = runSummaryJson(root, typeClustersScriptPath, [
      '--summary-json',
      '--top=1',
      '--plan-top=1',
    ]);

    expect(typeClusters.status).toBe('ok');
    expect(typeClusters.summary).toMatchObject({
      exactShapeClusters: 1,
      nearShapeClusters: 1,
      clustersAfterFilters: 2,
      declarationsInClusters: 4,
    });
    expect(typeClusters.details).toMatchObject({
      status: 'ok',
      clusters: [
        expect.objectContaining({ clusterId: 'exact-0001' }),
        expect.objectContaining({ clusterId: 'near-0001' }),
      ],
    });
    expect(typeClusters.filters).toMatchObject({
      domains: [],
      minRisk: 0,
      topLimit: 1,
      planTopLimit: 1,
      historyDisabled: true,
      noWrite: false,
    });

    const latestMarkdownPath = path.join(root, String(typeClusters.paths?.latestMarkdown ?? ''));
    const latestPlanMarkdownPath = path.join(root, String(typeClusters.paths?.latestPlanMarkdown ?? ''));
    const latestCsvPath = path.join(root, String(typeClusters.paths?.latestCsv ?? ''));
    const markdown = fs.readFileSync(latestMarkdownPath, 'utf8');
    const planMarkdown = fs.readFileSync(latestPlanMarkdownPath, 'utf8');
    const csv = fs.readFileSync(latestCsvPath, 'utf8');

    expect(markdown).toContain('`exact-0001`');
    expect(markdown).not.toContain('`near-0001`');
    expect(planMarkdown).toContain('1. [ ] exact-0001 (exact-shape)');
    expect(planMarkdown).not.toContain('near-0001');
    expect(csv).toContain('exact-0001');
    expect(csv).toContain('near-0001');
  });

  it('emits writable artifact paths for type-cluster scans when history is enabled', () => {
    const root = createTempRoot();
    seedTypeClusterSources(root);

    const typeClusters = runSummaryJson(root, typeClustersScriptPath, [
      '--summary-json',
      '--write-history',
    ]);

    expect(typeClusters.status).toBe('ok');
    expect(typeClusters.summary).toMatchObject({
      exactShapeClusters: 1,
      nearShapeClusters: 1,
      clustersAfterFilters: 2,
      declarationsInClusters: 4,
    });
    expect(typeClusters.paths).toMatchObject({
      latestJson: 'docs/metrics/type-clusters-latest.json',
      latestMarkdown: 'docs/metrics/type-clusters-latest.md',
      latestCsv: 'docs/metrics/type-clusters-latest.csv',
      latestPlanMarkdown: 'docs/metrics/type-clusters-plan-latest.md',
      historyJson: expect.stringMatching(/^docs\/metrics\/type-clusters-.+\.json$/),
    });
    expect(typeClusters.filters).toMatchObject({
      historyDisabled: false,
      noWrite: false,
    });

    const latestJsonPath = path.join(root, String(typeClusters.paths?.latestJson ?? ''));
    const latestMarkdownPath = path.join(root, String(typeClusters.paths?.latestMarkdown ?? ''));
    const latestCsvPath = path.join(root, String(typeClusters.paths?.latestCsv ?? ''));
    const latestPlanMarkdownPath = path.join(
      root,
      String(typeClusters.paths?.latestPlanMarkdown ?? '')
    );
    const historyJsonPath = path.join(root, String(typeClusters.paths?.historyJson ?? ''));

    expect(fs.existsSync(latestJsonPath)).toBe(true);
    expect(fs.existsSync(latestMarkdownPath)).toBe(true);
    expect(fs.existsSync(latestCsvPath)).toBe(true);
    expect(fs.existsSync(latestPlanMarkdownPath)).toBe(true);
    expect(fs.existsSync(historyJsonPath)).toBe(true);
  });

  it('keeps type-cluster init mode scaffolded and history-free', () => {
    const root = createTempRoot();
    seedTypeClusterSources(root);

    const typeClusters = runSummaryJson(root, typeClustersScriptPath, [
      '--summary-json',
      '--init',
      '--write-history',
    ]);

    expect(typeClusters.status).toBe('ok');
    expect(typeClusters.summary).toMatchObject({
      filesScanned: 0,
      exportedDeclarationsScanned: 0,
      candidateDeclarationsScanned: 0,
      exactShapeClusters: 0,
      nearShapeClusters: 0,
      clustersAfterFilters: 0,
      declarationsInClusters: 0,
      highestRiskScore: 0,
    });
    expect(typeClusters.details).toMatchObject({
      status: 'scaffold',
      clusters: [],
    });
    expect(typeClusters.paths).toMatchObject({
      latestJson: 'docs/metrics/type-clusters-latest.json',
      latestMarkdown: 'docs/metrics/type-clusters-latest.md',
      latestCsv: 'docs/metrics/type-clusters-latest.csv',
      latestPlanMarkdown: 'docs/metrics/type-clusters-plan-latest.md',
      historyJson: null,
    });
    expect(typeClusters.filters).toMatchObject({
      historyDisabled: false,
      noWrite: false,
    });

    const latestJsonPath = path.join(root, String(typeClusters.paths?.latestJson ?? ''));
    const latestJson = JSON.parse(fs.readFileSync(latestJsonPath, 'utf8')) as {
      scanner?: { mode?: string };
      status?: string;
      summary?: { filesScanned?: number };
    };

    expect(latestJson.scanner?.mode).toBe('init');
    expect(latestJson.status).toBe('scaffold');
    expect(latestJson.summary?.filesScanned).toBe(0);
  });

  it('suppresses type-cluster history artifacts in ci mode', () => {
    const root = createTempRoot();
    seedTypeClusterSources(root);

    const typeClusters = runSummaryJson(root, typeClustersScriptPath, [
      '--summary-json',
      '--write-history',
      '--ci',
    ]);

    expect(typeClusters.status).toBe('ok');
    expect(typeClusters.summary).toMatchObject({
      exactShapeClusters: 1,
      nearShapeClusters: 1,
      clustersAfterFilters: 2,
      declarationsInClusters: 4,
    });
    expect(typeClusters.paths).toMatchObject({
      latestJson: 'docs/metrics/type-clusters-latest.json',
      latestMarkdown: 'docs/metrics/type-clusters-latest.md',
      latestCsv: 'docs/metrics/type-clusters-latest.csv',
      latestPlanMarkdown: 'docs/metrics/type-clusters-plan-latest.md',
      historyJson: null,
    });
    expect(typeClusters.filters).toMatchObject({
      historyDisabled: true,
      noWrite: false,
    });

    const metricsDirPath = path.join(root, 'docs', 'metrics');
    const metricFiles = fs.readdirSync(metricsDirPath);

    expect(metricFiles).toEqual(
      expect.arrayContaining([
        'type-clusters-latest.csv',
        'type-clusters-latest.json',
        'type-clusters-latest.md',
        'type-clusters-plan-latest.md',
      ])
    );
    expect(metricFiles.some((fileName) => /^type-clusters-(?!latest).+\.json$/.test(fileName))).toBe(
      false
    );
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
  }, 30_000);

  it('wraps architecture guardrails in the shared scan envelope', () => {
    const root = createTempRoot();
    seedArchitectureSources(root);
    seedQualitySources(root);
    seedGuardrailBaseline(root);

    const guardrails = runSummaryJson(root, guardrailsScriptPath, ['--summary-json']);
    const uiConsolidationGuardrail = runSummaryJson(root, uiConsolidationGuardrailScriptPath, [
      '--summary-json',
    ]);

    expect(guardrails.scanner).toMatchObject({
      name: 'architecture-guardrails',
      version: '1.0.0',
    });
    expect(guardrails.status).toBe('ok');
    expect(guardrails.summary).toMatchObject({
      totalMetrics: expect.any(Number),
      okMetrics: expect.any(Number),
      failedMetrics: 0,
      hardLimitFailures: 0,
      updatedBaseline: false,
    });
    expect(guardrails.details).toMatchObject({
      snapshot: expect.any(Object),
      baselineGeneratedAt: '2026-03-09T09:20:00.000Z',
      baselinePath: 'scripts/architecture/guardrails-baseline.json',
      rows: expect.any(Array),
    });
    expect(guardrails.paths).toBeNull();
    expect(guardrails.filters).toMatchObject({
      historyDisabled: true,
      noWrite: true,
      updateBaseline: false,
      ci: false,
    });
    expect(guardrails.notes).toContain('architecture guardrail result');

    expect(uiConsolidationGuardrail.scanner).toMatchObject({
      name: 'ui-consolidation-guardrail',
      version: '1.0.0',
    });
    expect(uiConsolidationGuardrail.status).toBe('ok');
    expect(uiConsolidationGuardrail.summary).toMatchObject({
      totalRules: 7,
      failedRules: 0,
      passedRules: 7,
      propForwardingCount: expect.any(Number),
      totalOpportunityCount: expect.any(Number),
    });
    expect(uiConsolidationGuardrail.details).toMatchObject({
      snapshot: expect.any(Object),
      failures: expect.any(Array),
      baselineGeneratedAt: '2026-03-09T09:20:00.000Z',
      baselinePath: 'scripts/architecture/guardrails-baseline.json',
      rules: expect.any(Array),
    });
    expect(uiConsolidationGuardrail.paths).toBeNull();
    expect(uiConsolidationGuardrail.filters).toMatchObject({
      historyDisabled: true,
      noWrite: false,
      ci: false,
    });
    expect(uiConsolidationGuardrail.notes).toContain('ui consolidation guardrail result');
    expect(fs.existsSync(path.join(root, 'docs', 'ui-consolidation', 'scan-latest.md'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'docs', 'ui-consolidation', 'scan-latest.json'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'docs', 'ui-consolidation', 'inventory-latest.csv'))).toBe(true);
  }, 30_000);

});
