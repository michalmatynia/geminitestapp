import fs from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  accessibilityRouteCrawlRoutes,
  accessibilityRouteCrawlScriptPath,
  accessibilitySmokeScriptPath,
  cleanupTempRoots,
  createTempRoot,
  criticalFlowTestsScriptPath,
  criticalPathPerformanceScriptPath,
  normalizeAccessibilityRouteEntries,
  playwrightSuiteScriptPath,
  resolveAccessibilityRouteCrawlChunkSize,
  routeHotspotsScriptPath,
  runSummaryJson,
  runSummaryJsonAsync,
  securitySmokeScriptPath,
  seedAccessibilityCommandHarness,
  seedAccessibilityRouteCrawlReport,
  seedCriticalPathPerformanceSources,
  seedRouteHotspotSources,
  seedUnitDomainTimingHarness,
  startFixtureServer,
  unitDomainTimingsScriptPath,
} from './scan-summary-json-envelope.test-support';

describe('scanner summary-json envelope', () => {
  afterEach(cleanupTempRoots);
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
    const expectedChunkSize =
      resolveAccessibilityRouteCrawlChunkSize({ env, totalRoutes: expectedRouteCount }) ??
      expectedRouteCount;
    const expectedChunkCount = Math.ceil(expectedRouteCount / expectedChunkSize);
    const expectedPlaywrightDurationMs = expectedChunkCount * 1_250;

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
      playwrightDurationMs: expectedPlaywrightDurationMs,
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

});
