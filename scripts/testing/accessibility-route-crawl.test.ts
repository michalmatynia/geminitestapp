import { describe, expect, it } from 'vitest';

import {
  buildAccessibilityRouteCrawlHeartbeatLine,
  buildAccessibilityRouteCrawlTitle,
  normalizeAccessibilityRouteEntries,
  resolveAccessibilityRouteCrawlChunkSize,
  resolveAccessibilityRouteCrawlAgentId,
  summarizeAccessibilityRouteCrawlReport,
} from './lib/accessibility-route-crawl.mjs';

describe('buildAccessibilityRouteCrawlHeartbeatLine', () => {
  it('formats a progress line for long-running crawls', () => {
    expect(
      buildAccessibilityRouteCrawlHeartbeatLine({
        elapsedMs: 95_000,
        baseUrl: 'http://127.0.0.1:3000',
        agentId: 'michalmatynia-route-crawl',
        leaseKey: 'web-dev-michalmatynia-route-crawl',
        formatDuration: (value) => `${Math.round(value / 1000)}s`,
      })
    ).toBe(
      '[accessibility-route-crawl] still running elapsed=95s baseUrl=http://127.0.0.1:3000 agent=michalmatynia-route-crawl lease=web-dev-michalmatynia-route-crawl'
    );
  });

  it('omits optional fields that are not available', () => {
    expect(
      buildAccessibilityRouteCrawlHeartbeatLine({
        elapsedMs: 5_000,
        baseUrl: null,
        agentId: '',
        leaseKey: null,
        formatDuration: () => '5.0s',
      })
    ).toBe('[accessibility-route-crawl] still running elapsed=5.0s');
  });
});

describe('normalizeAccessibilityRouteEntries', () => {
  it('normalizes route crawl entries and preserves selectors', () => {
    expect(
      normalizeAccessibilityRouteEntries([
        {
          id: 'dashboard',
          name: 'Dashboard',
          route: '/admin',
          audience: 'admin',
          readySelector: '#app-content h1',
          contextSelector: 'body',
        },
      ])
    ).toEqual([
      {
        id: 'dashboard',
        name: 'Dashboard',
        route: '/admin',
        audience: 'admin',
        readySelector: '#app-content h1',
        contextSelector: 'body',
        navigationWaitUntil: null,
        navigationTimeoutMs: null,
      },
    ]);
  });

  it('rejects duplicate ids', () => {
    expect(() =>
      normalizeAccessibilityRouteEntries([
        { id: 'dashboard', route: '/admin', audience: 'admin' },
        { id: 'dashboard', route: '/admin/products', audience: 'admin' },
      ])
    ).toThrow(/duplicate id/i);
  });

  it('keeps Kangur login in the public accessibility crawl config', async () => {
    const { accessibilityRouteCrawlRoutes } = await import('./config/accessibility-route-crawl.config.mjs');
    const routes = normalizeAccessibilityRouteEntries(accessibilityRouteCrawlRoutes);

    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'kangur-login',
          route: '/kangur/login',
          audience: 'public',
        }),
      ])
    );
  });
});

describe('resolveAccessibilityRouteCrawlAgentId', () => {
  it('isolates the route crawl onto its own broker agent by default', () => {
    expect(
      resolveAccessibilityRouteCrawlAgentId({
        env: {},
        defaultAgentId: 'michalmatynia',
      })
    ).toBe('michalmatynia-route-crawl');
  });

  it('respects an explicit route crawl agent override', () => {
    expect(
      resolveAccessibilityRouteCrawlAgentId({
        env: {
          PLAYWRIGHT_ROUTE_CRAWL_AGENT_ID: 'Route Crawl Final',
        },
        defaultAgentId: 'michalmatynia',
      })
    ).toBe('route-crawl-final');
  });
});

describe('resolveAccessibilityRouteCrawlChunkSize', () => {
  it('defaults large non-strict crawls to five-route chunks', () => {
    expect(
      resolveAccessibilityRouteCrawlChunkSize({
        env: {},
        strictMode: false,
        totalRoutes: 32,
      })
    ).toBe(5);
  });

  it('keeps the existing strict-mode chunk size for moderate runs', () => {
    expect(
      resolveAccessibilityRouteCrawlChunkSize({
        env: {},
        strictMode: true,
        totalRoutes: 8,
      })
    ).toBe(6);
  });

  it('honors an explicit chunk-size override', () => {
    expect(
      resolveAccessibilityRouteCrawlChunkSize({
        env: {
          PLAYWRIGHT_ROUTE_CRAWL_CHUNK_SIZE: '3',
        },
        strictMode: false,
        totalRoutes: 32,
      })
    ).toBe(3);
  });

  it('derives chunk size from the requested chunk count override', () => {
    expect(
      resolveAccessibilityRouteCrawlChunkSize({
        env: {
          PLAYWRIGHT_ROUTE_CRAWL_CHUNKS: '4',
        },
        strictMode: false,
        totalRoutes: 17,
      })
    ).toBe(5);
  });
});

describe('summarizeAccessibilityRouteCrawlReport', () => {
  it('maps Playwright specs back to configured routes', () => {
    const routes = normalizeAccessibilityRouteEntries([
      { id: 'signin', name: 'Sign In', route: '/auth/signin', audience: 'public' },
      { id: 'dashboard', name: 'Dashboard', route: '/admin', audience: 'admin' },
    ]);

    const report = {
      suites: [
        {
          title: 'accessibility-route-crawl.spec.ts',
          specs: [
            {
              title: buildAccessibilityRouteCrawlTitle(routes[0]),
              tests: [
                {
                  results: [{ status: 'passed', duration: 100, errors: [] }],
                },
              ],
            },
            {
              title: buildAccessibilityRouteCrawlTitle(routes[1]),
              tests: [
                {
                  results: [
                    {
                      status: 'failed',
                      duration: 150,
                      errors: [{ message: 'heading missing' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      stats: {
        duration: 500,
        unexpected: 1,
        flaky: 0,
        skipped: 0,
      },
      errors: [],
    };

    const summary = summarizeAccessibilityRouteCrawlReport({ report, routeEntries: routes });

    expect(summary.status).toBe('failed');
    expect(summary.summary).toEqual(
      expect.objectContaining({
        total: 2,
        passed: 1,
        failed: 1,
        unexpected: 1,
        errorCount: 1,
      })
    );
    expect(summary.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ route: '/auth/signin', status: 'pass' }),
        expect.objectContaining({ route: '/admin', status: 'fail', errors: ['heading missing'] }),
      ])
    );
  });

  it('marks missing route executions as failures', () => {
    const routes = normalizeAccessibilityRouteEntries([
      { id: 'signin', name: 'Sign In', route: '/auth/signin', audience: 'public' },
    ]);

    const summary = summarizeAccessibilityRouteCrawlReport({
      report: { suites: [], stats: { duration: 0, unexpected: 0, flaky: 0, skipped: 0 }, errors: [] },
      routeEntries: routes,
    });

    expect(summary.results[0]).toEqual(
      expect.objectContaining({
        status: 'fail',
        errors: [expect.stringMatching(/No Playwright result/)],
      })
    );
  });
});
