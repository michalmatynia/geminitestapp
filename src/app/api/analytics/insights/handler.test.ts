import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  startAiInsightsQueueMock,
  resolveAiInsightsContextRegistryEnvelopeMock,
  generateAnalyticsInsightMock,
} = vi.hoisted(() => ({
  startAiInsightsQueueMock: vi.fn(),
  resolveAiInsightsContextRegistryEnvelopeMock: vi.fn(),
  generateAnalyticsInsightMock: vi.fn(),
}));

vi.mock('@/features/jobs/server', () => ({
  startAiInsightsQueue: startAiInsightsQueueMock,
}));

vi.mock('@/features/ai/insights/context-registry/server', () => ({
  resolveAiInsightsContextRegistryEnvelope: resolveAiInsightsContextRegistryEnvelopeMock,
}));

vi.mock('@/features/ai/insights/server', () => ({
  listAiInsights: vi.fn(),
  generateAnalyticsInsight: generateAnalyticsInsightMock,
}));

describe('analytics insights handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
