import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  startAiInsightsQueueMock,
  resolveAiInsightsContextRegistryEnvelopeMock,
  generateAnalyticsInsightMock,
  listAiInsightsMock,
} = vi.hoisted(() => ({
  startAiInsightsQueueMock: vi.fn(),
  resolveAiInsightsContextRegistryEnvelopeMock: vi.fn(),
  generateAnalyticsInsightMock: vi.fn(),
  listAiInsightsMock: vi.fn(),
}));

vi.mock('@/features/jobs/server', () => ({
  startAiInsightsQueue: startAiInsightsQueueMock,
}));

vi.mock('@/features/ai/insights/context-registry/server', () => ({
  resolveAiInsightsContextRegistryEnvelope: resolveAiInsightsContextRegistryEnvelopeMock,
}));

vi.mock('@/features/ai/insights/server', () => ({
  listAiInsights: listAiInsightsMock,
  generateAnalyticsInsight: generateAnalyticsInsightMock,
}));

describe('analytics insights handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists analytics insights with shared limit query parsing', async () => {
    const { GET_handler } = await import('./handler');
    listAiInsightsMock.mockResolvedValue([{ id: 'insight-list-1', type: 'analytics' }]);

    const response = await GET_handler(
      new NextRequest('http://localhost/api/analytics/insights?limit=5'),
      {} as never
    );
    const data = await response.json();

    expect(startAiInsightsQueueMock).toHaveBeenCalledTimes(1);
    expect(listAiInsightsMock).toHaveBeenCalledWith('analytics', 5);
    expect(data).toEqual({
      insights: [{ id: 'insight-list-1', type: 'analytics' }],
    });
  });

  it('resolves registry context before generating an analytics insight', async () => {
    const { POST_handler } = await import('./handler');

    resolveAiInsightsContextRegistryEnvelopeMock.mockResolvedValue({
      refs: [
        { id: 'page:analytics', kind: 'static_node' },
        {
          id: 'runtime:analytics:workspace',
          kind: 'runtime_document',
          providerId: 'analytics-page-local',
          entityType: 'analytics_workspace_state',
        },
      ],
      engineVersion: 'registry:test',
    });
    generateAnalyticsInsightMock.mockResolvedValue({ id: 'insight-1' });

    const req = new NextRequest('http://localhost/api/analytics/insights', {
      method: 'POST',
      body: JSON.stringify({
        contextRegistry: {
          refs: [{ id: 'page:analytics', kind: 'static_node' }],
          engineVersion: 'page-context:v1',
        },
      }),
    });

    const response = await POST_handler(req, {} as never);
    const data = await response.json();

    expect(startAiInsightsQueueMock).toHaveBeenCalledTimes(1);
    expect(resolveAiInsightsContextRegistryEnvelopeMock).toHaveBeenCalledWith({
      refs: [{ id: 'page:analytics', kind: 'static_node' }],
      engineVersion: 'page-context:v1',
    });
    expect(generateAnalyticsInsightMock).toHaveBeenCalledWith({
      source: 'user_triggered',
      contextRegistry: expect.objectContaining({
        refs: [
          expect.objectContaining({ id: 'page:analytics' }),
          expect.objectContaining({ id: 'runtime:analytics:workspace' }),
        ],
      }),
    });
    expect(data).toEqual({ insight: { id: 'insight-1' } });
  });
});
