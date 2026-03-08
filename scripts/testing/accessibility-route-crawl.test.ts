import { describe, expect, it } from 'vitest';

import {
  buildAccessibilityRouteCrawlTitle,
  normalizeAccessibilityRouteEntries,
  resolveAccessibilityRouteCrawlAgentId,
  summarizeAccessibilityRouteCrawlReport,
} from './lib/accessibility-route-crawl.mjs';

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
