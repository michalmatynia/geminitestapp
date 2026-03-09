import { describe, expect, it } from 'vitest';

import { buildAnalyticsWorkspaceContextBundle } from '../workspace';

describe('buildAnalyticsWorkspaceContextBundle', () => {
  it('builds an analytics workspace runtime document with summary and insight state', () => {
    const bundle = buildAnalyticsWorkspaceContextBundle({
      range: '7d',
      scope: 'admin',
      fromToLabel: 'Mar 1 -> Mar 8',
      summary: {
        from: '2026-03-01T00:00:00.000Z',
        to: '2026-03-08T23:59:59.999Z',
        scope: 'admin',
        totals: {
          events: 1250,
          pageviews: 700,
        },
        visitors: 210,
        sessions: 340,
        topPages: [{ path: '/admin/analytics', count: 120 }],
        topReferrers: [],
        topEventNames: [],
        topLanguages: [],
        topCountries: [],
        topRegions: [],
        topCities: [],
        topBrowsers: [],
        topOs: [],
        topDevices: [],
        topUtmSources: [],
        topUtmMediums: [],
        topUtmCampaigns: [],
        recent: [
          {
            id: 'event-1',
            type: 'pageview',
            scope: 'admin',
            path: '/admin/analytics',
            name: null,
            ts: '2026-03-08T12:00:00.000Z',
          },
        ],
      } as never,
      insights: [
        {
          id: 'insight-1',
          status: 'new',
          source: 'user_triggered',
          summary: 'Traffic on the analytics dashboard increased.',
          createdAt: '2026-03-08T12:05:00.000Z',
        },
      ] as never,
      latestInsightStatus: 'new',
    });

    expect(bundle.refs).toEqual([
      expect.objectContaining({
        id: 'runtime:analytics:workspace',
        kind: 'runtime_document',
        providerId: 'analytics-page-local',
        entityType: 'analytics_workspace_state',
      }),
    ]);
    expect(bundle.documents).toHaveLength(1);
    expect(bundle.documents[0]).toMatchObject({
      entityType: 'analytics_workspace_state',
      title: 'Analytics workspace state',
      status: 'new',
      facts: expect.objectContaining({
        range: '7d',
        scope: 'admin',
        events: 1250,
        pageviews: 700,
        visitors: 210,
        sessions: 340,
        insightCount: 1,
      }),
    });
    expect(bundle.documents[0].sections.map((section) => section.title)).toEqual(
      expect.arrayContaining([
        'Workspace snapshot',
        'Summary totals',
        'Top pages',
        'Recent events',
        'Latest analytics insights',
      ])
    );
  });
});
