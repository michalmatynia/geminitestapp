import { describe, expect, it } from 'vitest';

import { buildAiInsightsWorkspaceContextBundle } from '../workspace';

describe('buildAiInsightsWorkspaceContextBundle', () => {
  it('builds an AI insights dashboard runtime document with bucket counts and visible insights', () => {
    const bundle = buildAiInsightsWorkspaceContextBundle({
      analyticsInsights: [
        {
          id: 'analytics-1',
          status: 'new',
          source: 'manual',
          summary: 'Analytics volume increased.',
          createdAt: '2026-03-08T10:00:00.000Z',
        },
      ] as never,
      runtimeInsights: [
        {
          id: 'runtime-1',
          status: 'warning',
          source: 'manual',
          summary: 'Runtime parity risk is elevated.',
          createdAt: '2026-03-08T11:00:00.000Z',
        },
      ] as never,
      logInsights: [
        {
          id: 'logs-1',
          status: 'error',
          source: 'manual',
          summary: 'System error spikes were detected.',
          createdAt: '2026-03-08T12:00:00.000Z',
        },
      ] as never,
      analyticsRunPending: false,
      runtimeRunPending: true,
      logsRunPending: false,
    });

    expect(bundle.refs).toEqual([
      expect.objectContaining({
        id: 'runtime:ai-insights:workspace',
        kind: 'runtime_document',
        providerId: 'ai-insights-page-local',
        entityType: 'ai_insights_workspace_state',
      }),
    ]);
    expect(bundle.documents).toHaveLength(1);
    expect(bundle.documents[0]).toMatchObject({
      entityType: 'ai_insights_workspace_state',
      title: 'AI insights workspace state',
      status: 'running',
      facts: expect.objectContaining({
        analyticsInsightCount: 1,
        runtimeInsightCount: 1,
        logInsightCount: 1,
        runtimeRunPending: true,
      }),
    });
    expect(bundle.documents[0].sections.map((section) => section.title)).toEqual(
      expect.arrayContaining(['Insight buckets', 'Latest visible insights'])
    );
  });
});
