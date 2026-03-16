import { execFile, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { parseScanOutput } from './lib/scan-output.mjs';
import { accessibilityRouteCrawlRoutes } from '../testing/config/accessibility-route-crawl.config.mjs';
import {
  buildAccessibilityRouteCrawlTitle,
  normalizeAccessibilityRouteEntries,
} from '../testing/lib/accessibility-route-crawl.mjs';

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
const guardrailsScriptPath = path.join(repoRoot, 'scripts', 'architecture', 'check-guardrails.mjs');
const uiConsolidationGuardrailScriptPath = path.join(
  repoRoot,
  'scripts',
  'architecture',
  'check-ui-consolidation.mjs'
);
const criticalPathPerformanceScriptPath = path.join(
  repoRoot,
  'scripts',
  'perf',
  'check-critical-path-performance.mjs'
);
const routeHotspotsScriptPath = path.join(repoRoot, 'scripts', 'perf', 'route-hotspots.mjs');
const unitDomainTimingsScriptPath = path.join(
  repoRoot,
  'scripts',
  'testing',
  'run-unit-domain-timings.mjs'
);
const accessibilitySmokeScriptPath = path.join(
  repoRoot,
  'scripts',
  'testing',
  'run-accessibility-smoke-tests.mjs'
);
const accessibilityRouteCrawlScriptPath = path.join(
  repoRoot,
  'scripts',
  'testing',
  'run-accessibility-route-crawl.mjs'
);
const playwrightSuiteScriptPath = path.join(
  repoRoot,
  'scripts',
  'testing',
  'run-playwright-suite.mjs'
);
const criticalFlowTestsScriptPath = path.join(
  repoRoot,
  'scripts',
  'testing',
  'run-critical-flow-tests.mjs'
);
const securitySmokeScriptPath = path.join(
  repoRoot,
  'scripts',
  'testing',
  'run-security-smoke-tests.mjs'
);
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
const qualityHighRiskCoverageScriptPath = path.join(
  repoRoot,
  'scripts',
  'quality',
  'check-high-risk-coverage.mjs'
);
const testingQualitySnapshotScriptPath = path.join(
  repoRoot,
  'scripts',
  'quality',
  'generate-test-quality-snapshot.mjs'
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

const writeExecutable = (root: string, relativePath: string, contents: string): void => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, 'utf8');
  fs.chmodSync(absolutePath, 0o755);
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

const seedHighRiskCoverageSummary = (root: string): void => {
  const absoluteApiRoutePath = path.join(root, 'src', 'app', 'api', 'products', 'route.ts');
  writeFile(
    root,
    'coverage/coverage-summary.json',
    `${JSON.stringify(
      {
        total: {},
        [absoluteApiRoutePath]: {
          lines: { total: 10, covered: 9, skipped: 0, pct: 90 },
          statements: { total: 10, covered: 9, skipped: 0, pct: 90 },
          functions: { total: 10, covered: 9, skipped: 0, pct: 90 },
          branches: { total: 10, covered: 8, skipped: 0, pct: 80 },
        },
        'src/shared/contracts/auth.ts': {
          lines: { total: 10, covered: 10, skipped: 0, pct: 100 },
          statements: { total: 10, covered: 10, skipped: 0, pct: 100 },
          functions: { total: 10, covered: 10, skipped: 0, pct: 100 },
          branches: { total: 10, covered: 9, skipped: 0, pct: 90 },
        },
        'src/shared/lib/api/handler.ts': {
          lines: { total: 20, covered: 16, skipped: 0, pct: 80 },
          statements: { total: 20, covered: 16, skipped: 0, pct: 80 },
          functions: { total: 20, covered: 16, skipped: 0, pct: 80 },
          branches: { total: 20, covered: 14, skipped: 0, pct: 70 },
        },
        'src/features/kangur/ui/widget.tsx': {
          lines: { total: 10, covered: 8, skipped: 0, pct: 80 },
          statements: { total: 10, covered: 8, skipped: 0, pct: 80 },
          functions: { total: 10, covered: 8, skipped: 0, pct: 80 },
          branches: { total: 10, covered: 7, skipped: 0, pct: 70 },
        },
        'src/features/ai/ai-paths/runtime/engine.ts': {
          lines: { total: 10, covered: 8, skipped: 0, pct: 80 },
          statements: { total: 10, covered: 8, skipped: 0, pct: 80 },
          functions: { total: 10, covered: 8, skipped: 0, pct: 80 },
          branches: { total: 10, covered: 7, skipped: 0, pct: 70 },
        },
      },
      null,
      2
    )}\n`
  );
};

const seedCriticalPathPerformanceSources = (root: string): void => {
  const uiFixtures = [
    'src/features/auth/pages/public/SignInPage.tsx',
    'src/features/products/pages/AdminProductsPage.tsx',
    'src/features/ai/image-studio/pages/AdminImageStudioPage.tsx',
    'src/features/ai/ai-paths/pages/AdminAiPathsPage.tsx',
    'src/features/case-resolver/pages/AdminCaseResolverPage.tsx',
  ];

  for (const relativePath of uiFixtures) {
    writeFile(
      root,
      relativePath,
      [
        'export function Page(): JSX.Element {',
        '  return <div>fixture</div>;',
        '}',
        '',
      ].join('\n')
    );
  }

  const apiFixtures = [
    'src/app/api/auth/verify-credentials/handler.ts',
    'src/app/api/v2/products/handler.ts',
    'src/app/api/image-studio/projects/[projectId]/handler.ts',
    'src/app/api/ai-paths/runs/handler.ts',
    'src/app/api/case-resolver/ocr/jobs/handler.ts',
  ];

  for (const relativePath of apiFixtures) {
    writeFile(
      root,
      relativePath,
      [
        'export async function GET_handler(): Promise<Response> {',
        '  return Response.json({ ok: true });',
        '}',
        '',
      ].join('\n')
    );
  }
};

const seedRouteHotspotSources = (root: string): void => {
  writeFile(
    root,
    'src/app/reports/page.tsx',
    [
      'export default function ReportsPage(): JSX.Element {',
      '  return <main>reports</main>;',
      '}',
      '',
    ].join('\n')
  );
  writeFile(
    root,
    'src/app/api/reports/route.ts',
    [
      'export async function GET(): Promise<Response> {',
      '  return Response.json({ ok: true });',
      '}',
      '',
    ].join('\n')
  );
  writeFile(
    root,
    'src/features/reports/ReportPanel.tsx',
    [
      'export function ReportPanel(): JSX.Element {',
      '  return <section>report</section>;',
      '}',
      '',
    ].join('\n')
  );
};

const seedGuardrailBaseline = (root: string): void => {
  writeFile(
    root,
    'scripts/architecture/guardrails-baseline.json',
    `${JSON.stringify(
      {
        generatedAt: '2026-03-09T09:20:00.000Z',
        hardLimits: {
          sourceLargestFileLines: 99_999,
        },
        max: {
          'source.filesOver1000': 9_999,
          'source.filesOver1500': 9_999,
          'source.useClientFiles': 9_999,
          'source.largestFileLines': 99_999,
          'api.totalRoutes': 9_999,
          'api.delegatedServerRoutes': 9_999,
          'api.routesWithoutApiHandler': 9_999,
          'api.routesWithoutExplicitCachePolicy': 9_999,
          'imports.appFeatureBarrelImports': 9_999,
          'imports.appFeatureDeepImports': 9_999,
          'imports.sharedToFeaturesTotalImports': 9_999,
          'architecture.crossFeatureEdgePairs': 9_999,
          'runtime.setIntervalOccurrences': 9_999,
          'propDrilling.depthGte4Chains': 9_999,
          'propDrilling.componentsWithForwarding': 9_999,
          'uiConsolidation.totalOpportunities': 9_999,
          'uiConsolidation.highPriorityOpportunities': 9_999,
          'uiConsolidation.duplicateNameClusters': 9_999,
          'uiConsolidation.propSignatureClusters': 9_999,
          'uiConsolidation.tokenSimilarityClusters': 9_999,
        },
      },
      null,
      2
    )}\n`
  );
};

const seedUnitDomainTimingHarness = (root: string): Record<string, string> => {
  writeExecutable(
    root,
    'bin/npx',
    [
      '#!/bin/sh',
      'if [ "$1" = "vitest" ]; then',
      '  exit 0',
      'fi',
      'echo "unexpected npx invocation: $*" >&2',
      'exit 1',
      '',
    ].join('\n')
  );

  return {
    ...process.env,
    PATH: `${path.join(root, 'bin')}${path.delimiter}${process.env.PATH ?? ''}`,
  };
};

const seedAccessibilityCommandHarness = (
  root: string,
  {
    baseUrl,
    routeCrawlReportPath = null,
  }: {
    baseUrl: string;
    routeCrawlReportPath?: string | null;
  }
): Record<string, string> => {
  writeFile(
    root,
    'bin/mock-playwright-runtime-fetch.mjs',
    [
      'const runtimeBaseUrl = process.env.PLAYWRIGHT_BASE_URL;',
      'const originalFetch = globalThis.fetch?.bind(globalThis);',
      'const probePaths = new Set([\'/api/health\', \'/auth/signin\']);',
      '',
      'if (runtimeBaseUrl && typeof originalFetch === \'function\') {',
      '  const runtimeOrigin = new URL(runtimeBaseUrl).origin;',
      '  globalThis.fetch = async (input, init) => {',
      '    const requestUrl = (() => {',
      '      if (typeof input === \'string\' || input instanceof URL) return new URL(String(input));',
      '      if (input && typeof input === \'object\' && \'url\' in input && typeof input.url === \'string\') {',
      '        return new URL(input.url);',
      '      }',
      '      return null;',
      '    })();',
      '',
      '    if (requestUrl && requestUrl.origin === runtimeOrigin && probePaths.has(requestUrl.pathname)) {',
      '      const isHealthCheck = requestUrl.pathname === \'/api/health\';',
      '      return new Response(',
      '        isHealthCheck ? JSON.stringify({ ok: true }) : \'<html><body>ok</body></html>\',',
      '        {',
      '          status: 200,',
      '          headers: { \'content-type\': isHealthCheck ? \'application/json\' : \'text/html; charset=utf-8\' },',
      '        }',
      '      );',
      '    }',
      '',
      '    return originalFetch(input, init);',
      '  };',
      '}',
      '',
    ].join('\n')
  );
  writeExecutable(
    root,
    'bin/node',
    [
      '#!/bin/sh',
      `exec "${process.execPath}" "$@"`,
      '',
    ].join('\n')
  );
  writeExecutable(
    root,
    'bin/npx',
    [
      '#!/bin/sh',
      'if [ "$1" = "vitest" ]; then',
      '  echo "RUN  v4.0.18 fixture"',
      '  echo ""',
      '  echo " Test Files  1 passed (1)"',
      '  echo "      Tests  1 passed (1)"',
      '  exit 0',
      'fi',
      'if [ "$1" = "playwright" ]; then',
      '  if [ -n "$SCAN_ENVELOPE_ROUTE_CRAWL_REPORT" ] && printf "%s\\n" "$*" | grep -q "accessibility-route-crawl.spec.ts"; then',
      '    cat "$SCAN_ENVELOPE_ROUTE_CRAWL_REPORT"',
      '    exit 0',
      '  fi',
      '  echo "Running 1 test using 1 worker"',
      '  echo ""',
      '  echo "  1 passed (250ms)"',
      '  exit 0',
      'fi',
      'echo "unexpected npx invocation: $*" >&2',
      'exit 1',
      '',
    ].join('\n')
  );

  const env: Record<string, string> = {
    ...process.env,
    A11Y_SMOKE_BROWSER_NODE_BIN: path.join(root, 'bin'),
    NODE_OPTIONS: [
      process.env.NODE_OPTIONS,
      `--import=${path.join(root, 'bin', 'mock-playwright-runtime-fetch.mjs')}`,
    ]
      .filter(Boolean)
      .join(' '),
    PATH: `${path.join(root, 'bin')}${path.delimiter}${process.env.PATH ?? ''}`,
    PLAYWRIGHT_BASE_URL: baseUrl,
    PLAYWRIGHT_USE_EXISTING_SERVER: 'true',
  };

  if (routeCrawlReportPath) {
    env.SCAN_ENVELOPE_ROUTE_CRAWL_REPORT = routeCrawlReportPath;
  }

  return env;
};

const startFixtureServer = async (): Promise<string> => 'http://127.0.0.1:4010';

const seedAccessibilityRouteCrawlReport = (root: string): string => {
  const routeEntries = normalizeAccessibilityRouteEntries(accessibilityRouteCrawlRoutes);
  const reportPath = path.join(root, 'tmp', 'accessibility-route-crawl-report.json');
  writeFile(
    root,
    'tmp/accessibility-route-crawl-report.json',
    `${JSON.stringify(
      {
        suites: [
          {
            title: 'accessibility-route-crawl.spec.ts',
            specs: routeEntries.map((routeEntry) => ({
              title: buildAccessibilityRouteCrawlTitle(routeEntry),
              tests: [
                {
                  results: [{ status: 'passed', duration: 25, errors: [] }],
                },
              ],
            })),
          },
        ],
        stats: {
          duration: 1_250,
          unexpected: 0,
          flaky: 0,
          skipped: 0,
        },
        errors: [],
      },
      null,
      2
    )}\n`
  );

  return reportPath;
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
  nodeArgs: string[] = [],
  env?: Record<string, string | undefined>
) => {
  try {
    return parseScanOutput(
      execFileSync('node', [...nodeArgs, scriptPath, ...args], {
        cwd: root,
        encoding: 'utf8',
        env,
        maxBuffer: 20 * 1024 * 1024,
      }),
      path.basename(scriptPath)
    );
  } catch (error) {
    const stdout =
      error && typeof error === 'object' && 'stdout' in error && typeof error.stdout === 'string'
        ? error.stdout
        : null;
    if (stdout) {
      return parseScanOutput(stdout, path.basename(scriptPath));
    }
    throw error;
  }
};

const runSummaryJsonAsync = async (
  root: string,
  scriptPath: string,
  args: string[],
  nodeArgs: string[] = [],
  env?: Record<string, string | undefined>
) =>
  parseScanOutput(
    await new Promise<string>((resolve, reject) => {
      execFile(
        'node',
        [...nodeArgs, scriptPath, ...args],
        {
          cwd: root,
          encoding: 'utf8',
          env,
          maxBuffer: 20 * 1024 * 1024,
        },
        (error, stdout) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(stdout);
        }
      );
    }),
    path.basename(scriptPath)
  );

describe('scanner summary-json envelope', () => {
  afterEach(async () => {
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
      noWrite: true,
      ci: false,
    });
    expect(uiConsolidationGuardrail.notes).toContain('ui consolidation guardrail result');
  }, 30_000);

  it('wraps critical path performance checks in the shared scan envelope', () => {
    const root = createTempRoot();
    seedCriticalPathPerformanceSources(root);

    const criticalPathPerformance = runSummaryJson(root, criticalPathPerformanceScriptPath, [
      '--summary-json',
      '--no-write',
      '--no-history',
    ]);

    expect(criticalPathPerformance.scanner).toMatchObject({
      name: 'critical-path-performance',
      version: '1.0.0',
    });
    expect(criticalPathPerformance.status).toBe('ok');
    expect(criticalPathPerformance.summary).toMatchObject({
      totalPathsChecked: 10,
      passedPathCount: 10,
      failedPathCount: 0,
      uiPathsChecked: 5,
      uiPathsPassed: 5,
      uiPathsFailed: 0,
      apiPathsChecked: 5,
      apiPathsPassed: 5,
      apiPathsFailed: 0,
    });
    expect(criticalPathPerformance.details).toMatchObject({
      results: expect.any(Array),
      uiResults: expect.any(Array),
      apiResults: expect.any(Array),
      metrics: expect.any(Object),
    });
    expect(criticalPathPerformance.paths).toBeNull();
    expect(criticalPathPerformance.filters).toMatchObject({
      strictMode: false,
      historyDisabled: true,
      noWrite: true,
    });
    expect(criticalPathPerformance.notes).toContain('critical path performance check result');
    expect(
      fs.existsSync(path.join(root, 'docs', 'metrics', 'critical-path-performance-latest.json'))
    ).toBe(false);
  });

  it('wraps route hotspots reporting in the shared scan envelope', () => {
    const root = createTempRoot();
    seedRouteHotspotSources(root);

    const routeHotspots = runSummaryJson(root, routeHotspotsScriptPath, [
      '--summary-json',
      '--no-write',
      '--no-history',
    ]);

    expect(routeHotspots.scanner).toMatchObject({
      name: 'route-hotspots',
      version: '1.0.0',
    });
    expect(routeHotspots.status).toBe('ok');
    expect(routeHotspots.summary).toMatchObject({
      topApiRouteCount: 1,
      topPageCount: 1,
      recommendedTargetCount: 1,
      hottestApiRouteLines: expect.any(Number),
      hottestPageLines: expect.any(Number),
    });
    expect(routeHotspots.details).toMatchObject({
      topApiRoutes: [
        expect.objectContaining({
          path: 'src/app/api/reports/route.ts',
        }),
      ],
      topPages: [
        expect.objectContaining({
          path: 'src/app/reports/page.tsx',
        }),
      ],
      recommendedProfilingTargets: [
        expect.objectContaining({
          path: 'src/app/api/reports/route.ts',
        }),
      ],
      metricsGeneratedAt: expect.any(String),
    });
    expect(routeHotspots.paths).toBeNull();
    expect(routeHotspots.filters).toMatchObject({
      ci: false,
      historyDisabled: true,
      noWrite: true,
    });
    expect(routeHotspots.notes).toContain('route hotspots report result');
    expect(fs.existsSync(path.join(root, 'docs', 'metrics', 'route-hotspots.md'))).toBe(false);
  });

  it('wraps unit domain timings in the shared scan envelope', () => {
    const root = createTempRoot();
    const env = seedUnitDomainTimingHarness(root);

    const unitDomainTimings = runSummaryJson(
      root,
      unitDomainTimingsScriptPath,
      ['--summary-json', '--no-write', '--no-history'],
      [],
      env
    );

    expect(unitDomainTimings.scanner).toMatchObject({
      name: 'unit-domain-timings',
      version: '1.0.0',
    });
    expect(unitDomainTimings.status).toBe('ok');
    expect(unitDomainTimings.summary).toMatchObject({
      totalDomains: 5,
      passedDomains: 5,
      failedDomains: 0,
      totalDurationMs: expect.any(Number),
    });
    expect(unitDomainTimings.details).toMatchObject({
      results: expect.any(Array),
    });
    expect(unitDomainTimings.paths).toBeNull();
    expect(unitDomainTimings.filters).toMatchObject({
      strictMode: false,
      historyDisabled: true,
      noWrite: true,
      ci: false,
    });
    expect(unitDomainTimings.notes).toContain('unit domain timings report result');
    expect(fs.existsSync(path.join(root, 'docs', 'metrics', 'unit-domain-timings-latest.json'))).toBe(
      false
    );
  });

  it('wraps accessibility smoke tests in the shared scan envelope', async () => {
    const root = createTempRoot();
    const baseUrl = await startFixtureServer();
    const env = seedAccessibilityCommandHarness(root, { baseUrl });

    const accessibilitySmoke = await runSummaryJsonAsync(
      root,
      accessibilitySmokeScriptPath,
      ['--summary-json', '--no-write', '--no-history'],
      [],
      env
    );

    expect(accessibilitySmoke.scanner).toMatchObject({
      name: 'accessibility-smoke',
      version: '1.0.0',
    });
    expect(accessibilitySmoke.status).toBe('ok');
    expect(accessibilitySmoke.summary).toMatchObject({
      totalSuites: 14,
      passedSuites: 14,
      failedSuites: 0,
      actWarnings: 0,
      warningBudget: 10,
      warningBudgetStatus: 'ok',
      warningBudgetEnforcement: 'telemetry-only',
      totalDurationMs: expect.any(Number),
    });
    expect(accessibilitySmoke.details).toMatchObject({
      runtime: expect.objectContaining({
        source: 'explicit',
        reused: true,
        baseUrl,
      }),
      results: expect.any(Array),
    });
    expect(accessibilitySmoke.paths).toBeNull();
    expect(accessibilitySmoke.filters).toMatchObject({
      strictMode: false,
      failOnWarningBudgetExceed: false,
      historyDisabled: true,
      noWrite: true,
      ci: false,
      warningBudget: 10,
    });
    expect(accessibilitySmoke.notes).toContain('accessibility smoke report result');
    expect(fs.existsSync(path.join(root, 'docs', 'metrics', 'accessibility-smoke-latest.json'))).toBe(
      false
    );
  });

  it('wraps accessibility route crawl in the shared scan envelope', async () => {
    const root = createTempRoot();
    const baseUrl = await startFixtureServer();
    const reportPath = seedAccessibilityRouteCrawlReport(root);
    const env = seedAccessibilityCommandHarness(root, { baseUrl, routeCrawlReportPath: reportPath });
    const expectedRouteCount = normalizeAccessibilityRouteEntries(
      accessibilityRouteCrawlRoutes
    ).length;

    const accessibilityRouteCrawl = await runSummaryJsonAsync(
      root,
      accessibilityRouteCrawlScriptPath,
      ['--summary-json', '--no-write', '--no-history'],
      [],
      env
    );

    expect(accessibilityRouteCrawl.scanner).toMatchObject({
      name: 'accessibility-route-crawl',
      version: '1.0.0',
    });
    expect(accessibilityRouteCrawl.status).toBe('ok');
    expect(accessibilityRouteCrawl.summary).toMatchObject({
      totalRoutes: expectedRouteCount,
      passedRoutes: expectedRouteCount,
      failedRoutes: 0,
      playwrightDurationMs: 1250,
      totalDurationMs: expect.any(Number),
      unexpectedResults: 0,
      flakyResults: 0,
      skippedResults: 0,
      errorCount: 0,
    });
    expect(accessibilityRouteCrawl.details).toMatchObject({
      runtime: expect.objectContaining({
        source: 'explicit',
        reused: true,
        baseUrl,
      }),
      command: expect.stringContaining('playwright test'),
      externalErrors: [],
      results: expect.any(Array),
      stderr: '',
      exitCode: 0,
    });
    expect(accessibilityRouteCrawl.paths).toBeNull();
    expect(accessibilityRouteCrawl.filters).toMatchObject({
      strictMode: false,
      historyDisabled: true,
      noWrite: true,
      ci: false,
    });
    expect(accessibilityRouteCrawl.notes).toContain('accessibility route crawl result');
    expect(
      fs.existsSync(path.join(root, 'docs', 'metrics', 'accessibility-route-crawl-latest.json'))
    ).toBe(false);
  });

  it('wraps playwright suite runs in the shared scan envelope', async () => {
    const root = createTempRoot();
    const baseUrl = await startFixtureServer();
    const env = seedAccessibilityCommandHarness(root, { baseUrl });

    const playwrightSuite = await runSummaryJsonAsync(
      root,
      playwrightSuiteScriptPath,
      ['--summary-json', '--no-write', 'playwright', 'test', '--help'],
      [],
      env
    );

    expect(playwrightSuite.scanner).toMatchObject({
      name: 'playwright-suite',
      version: '1.0.0',
    });
    expect(playwrightSuite.status).toBe('ok');
    expect(playwrightSuite.summary).toMatchObject({
      command: 'test',
      argumentCount: 2,
      exitCode: 0,
      signal: null,
      runtimeSource: 'explicit',
      runtimeReused: true,
      brokerEnabled: true,
      artifactsRetained: false,
    });
    expect(playwrightSuite.details).toMatchObject({
      runtime: expect.objectContaining({
        source: 'explicit',
        reused: true,
        baseUrl,
      }),
      command: expect.stringContaining('playwright test --help'),
      playwrightArgs: ['test', '--help'],
      runId: expect.any(String),
      stdout: expect.stringContaining('1 passed'),
      stderr: '',
    });
    expect(playwrightSuite.paths).toBeNull();
    expect(playwrightSuite.filters).toMatchObject({
      cleanup: false,
      noWrite: true,
      ci: false,
      runtimeApp: 'web',
      runtimeMode: 'dev',
      runtimeHost: '127.0.0.1',
      runtimeStopAfter: false,
      runtimeBrokerDisabled: false,
    });
    expect(playwrightSuite.notes).toContain('playwright suite run result');
  });

  it('wraps playwright runtime cleanup in the shared scan envelope', () => {
    const root = createTempRoot();

    const playwrightCleanup = runSummaryJson(root, playwrightSuiteScriptPath, [
      '--runtime-cleanup',
      '--summary-json',
      '--no-write',
    ]);

    expect(playwrightCleanup.scanner).toMatchObject({
      name: 'playwright-suite',
      version: '1.0.0',
    });
    expect(playwrightCleanup.status).toBe('ok');
    expect(playwrightCleanup.summary).toMatchObject({
      mode: 'runtime-cleanup',
      inspectedLeases: 0,
      stoppedLeases: 0,
      removedLeaseRecords: 0,
    });
    expect(playwrightCleanup.details).toMatchObject({
      appId: 'web',
      agentId: expect.any(String),
    });
    expect(playwrightCleanup.paths).toBeNull();
    expect(playwrightCleanup.filters).toMatchObject({
      cleanup: true,
      noWrite: true,
      ci: false,
      runtimeApp: 'web',
      runtimeMode: 'dev',
      runtimeHost: '127.0.0.1',
      runtimeStopAfter: false,
      runtimeBrokerDisabled: false,
    });
    expect(playwrightCleanup.notes).toContain('playwright suite runtime cleanup result');
  });

  it('wraps critical flow tests in the shared scan envelope', () => {
    const root = createTempRoot();
    const env = seedUnitDomainTimingHarness(root);

    const criticalFlowTests = runSummaryJson(
      root,
      criticalFlowTestsScriptPath,
      ['--summary-json', '--no-write', '--no-history'],
      [],
      env
    );

    expect(criticalFlowTests.scanner).toMatchObject({
      name: 'critical-flow-tests',
      version: '1.0.0',
    });
    expect(criticalFlowTests.status).toBe('ok');
    expect(criticalFlowTests.summary).toMatchObject({
      totalFlows: 6,
      passedFlows: 6,
      failedFlows: 0,
      totalDurationMs: expect.any(Number),
    });
    expect(criticalFlowTests.details).toMatchObject({
      results: expect.any(Array),
    });
    expect(criticalFlowTests.paths).toBeNull();
    expect(criticalFlowTests.filters).toMatchObject({
      strictMode: false,
      historyDisabled: true,
      noWrite: true,
      ci: false,
    });
    expect(criticalFlowTests.notes).toContain('critical flow regression report result');
    expect(fs.existsSync(path.join(root, 'docs', 'metrics', 'critical-flow-tests-latest.json'))).toBe(
      false
    );
  });

  it('wraps security smoke tests in the shared scan envelope', () => {
    const root = createTempRoot();
    const env = seedUnitDomainTimingHarness(root);

    const securitySmoke = runSummaryJson(
      root,
      securitySmokeScriptPath,
      ['--summary-json', '--no-write', '--no-history'],
      [],
      env
    );

    expect(securitySmoke.scanner).toMatchObject({
      name: 'security-smoke',
      version: '1.0.0',
    });
    expect(securitySmoke.status).toBe('ok');
    expect(securitySmoke.summary).toMatchObject({
      totalSuites: 5,
      passedSuites: 5,
      failedSuites: 0,
      totalDurationMs: expect.any(Number),
    });
    expect(securitySmoke.details).toMatchObject({
      results: expect.any(Array),
    });
    expect(securitySmoke.paths).toBeNull();
    expect(securitySmoke.filters).toMatchObject({
      strictMode: false,
      historyDisabled: true,
      noWrite: true,
      ci: false,
    });
    expect(securitySmoke.notes).toContain('security smoke report result');
    expect(fs.existsSync(path.join(root, 'docs', 'metrics', 'security-smoke-latest.json'))).toBe(
      false
    );
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
	        sourceFileCount: expect.any(Number),
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
	    expect(canonicalStabilization.summary.aiSourceFileCount).toBe(
	      canonicalStabilization.details.ai.sourceFileCount
	    );
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
