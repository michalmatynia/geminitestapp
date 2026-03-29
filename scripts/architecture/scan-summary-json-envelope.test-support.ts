import { execFile, execFileSync, type ExecFileException } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { parseScanOutput } from './lib/scan-output.mjs';
import { accessibilityRouteCrawlRoutes } from '../testing/config/accessibility-route-crawl.config.mjs';
import {
  buildAccessibilityRouteCrawlTitle,
  normalizeAccessibilityRouteEntries,
  resolveAccessibilityRouteCrawlChunkSize,
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
const typeClustersScriptPath = path.join(
  repoRoot,
  'scripts',
  'architecture',
  'scan-type-clusters.mjs'
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

const seedTypeClusterSources = (root: string): void => {
  writeFile(
    root,
    'src/features/orders/types.ts',
    [
      'export interface SharedOptionDto {',
      '  id: string;',
      '  label: string;',
      '}',
      '',
      'export interface ScopeFilterDto {',
      '  id: string;',
      '  label: string;',
      '  scope?: string;',
      '}',
      '',
    ].join('\n')
  );
  writeFile(
    root,
    'src/features/products/types.ts',
    [
      'export type LabeledOptionDto = {',
      '  id: string;',
      '  label: string;',
      '};',
      '',
      'export type ScopeSelectionDto = {',
      '  id: string;',
      '  label: string;',
      '  scope: "team" | "org";',
      '};',
      '',
    ].join('\n')
  );
  writeFile(
    root,
    'src/features/products/consumer.ts',
    [
      'import type { SharedOptionDto } from \'../orders/types\';',
      'import type { LabeledOptionDto, ScopeSelectionDto } from \'./types\';',
      '',
      'export type ProductConsumer = {',
      '  options: SharedOptionDto[];',
      '  selected: LabeledOptionDto | null;',
      '  scope: ScopeSelectionDto;',
      '};',
      '',
    ].join('\n')
  );
};

const seedTypeClusterNoiseSources = (root: string): void => {
  writeFile(
    root,
    'src/features/orders/types.ts',
    [
      'export type PrimitiveId = string;',
      '',
      'export interface EmptyMarker {}',
      '',
      'export interface SharedOptionDto {',
      '  id: string;',
      '  label: string;',
      '}',
      '',
      'export interface ScopeFilterDto {',
      '  id: string;',
      '  label: string;',
      '  scope?: string;',
      '}',
      '',
    ].join('\n')
  );
  writeFile(
    root,
    'src/features/products/types.ts',
    [
      'export type AliasText = string;',
      '',
      'export interface AnotherEmpty {}',
      '',
      'export type LabeledOptionDto = {',
      '  id: string;',
      '  label: string;',
      '};',
      '',
      'export type ScopeSelectionDto = {',
      '  id: string;',
      '  label: string;',
      '  scope: "team" | "org";',
      '};',
      '',
    ].join('\n')
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

const seedUnitDomainTimingHarness = (root: string): NodeJS.ProcessEnv => {
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
    PATH: `${path.join(root, 'bin')}${path.delimiter}${process.env['PATH'] ?? ''}`,
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
): NodeJS.ProcessEnv => {
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

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    A11Y_SMOKE_BROWSER_NODE_BIN: path.join(root, 'bin'),
    NODE_OPTIONS: [
      process.env['NODE_OPTIONS'],
      `--import=${pathToFileURL(path.join(root, 'bin', 'mock-playwright-runtime-fetch.mjs')).href}`,
    ]
      .filter(Boolean)
      .join(' '),
    PATH: `${path.join(root, 'bin')}${path.delimiter}${process.env['PATH'] ?? ''}`,
    PLAYWRIGHT_BASE_URL: baseUrl,
    PLAYWRIGHT_USE_EXISTING_SERVER: 'true',
  };

  if (routeCrawlReportPath) {
    env['SCAN_ENVELOPE_ROUTE_CRAWL_REPORT'] = routeCrawlReportPath;
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
  env?: NodeJS.ProcessEnv
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
  env?: NodeJS.ProcessEnv
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
        (error: ExecFileException | null, stdout: string) => {
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

const cleanupTempRoots = async (): Promise<void> => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
};

export {
  accessibilityRouteCrawlRoutes,
  accessibilityRouteCrawlScriptPath,
  accessibilitySmokeScriptPath,
  aiPathsCanonicalScriptPath,
  canonicalSitewideScriptPath,
  canonicalStabilizationScriptPath,
  cleanupTempRoots,
  collectMetricsScriptPath,
  createTempRoot,
  criticalFlowTestsScriptPath,
  criticalPathPerformanceScriptPath,
  docsTooltipCoverageScriptPath,
  docsValidatorCoverageScriptPath,
  guardrailsScriptPath,
  normalizeAccessibilityRouteEntries,
  observabilityScriptPath,
  playwrightSuiteScriptPath,
  propDrillingScriptPath,
  qualityApiErrorSourcesScriptPath,
  qualityHighRiskCoverageScriptPath,
  qualityTestDistributionScriptPath,
  repoRoot,
  resolveAccessibilityRouteCrawlChunkSize,
  routeHotspotsScriptPath,
  runSummaryJson,
  runSummaryJsonAsync,
  securitySmokeScriptPath,
  seedAccessibilityCommandHarness,
  seedAccessibilityRouteCrawlReport,
  seedAiPathsCanonicalSources,
  seedArchitectureSources,
  seedCriticalPathPerformanceSources,
  seedGuardrailBaseline,
  seedHighRiskCoverageSummary,
  seedObservabilitySources,
  seedQualitySources,
  seedRouteHotspotSources,
  seedTypeClusterNoiseSources,
  seedTypeClusterSources,
  seedUnitDomainTimingHarness,
  startFixtureServer,
  testingQualitySnapshotScriptPath,
  typeClustersScriptPath,
  uiConsolidationGuardrailScriptPath,
  uiConsolidationScriptPath,
  unitDomainTimingsScriptPath,
};
