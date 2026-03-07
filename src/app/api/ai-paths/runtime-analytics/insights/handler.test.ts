import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireAiPathsAccessMock,
  startAiInsightsQueueMock,
  listAiInsightsMock,
  generateRuntimeAnalyticsInsightMock,
} = vi.hoisted(() => ({
  requireAiPathsAccessMock: vi.fn(),
  startAiInsightsQueueMock: vi.fn(),
  listAiInsightsMock: vi.fn(),
  generateRuntimeAnalyticsInsightMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccess: requireAiPathsAccessMock,
}));

vi.mock('@/features/jobs/server', () => ({
  startAiInsightsQueue: startAiInsightsQueueMock,
}));

vi.mock('@/features/ai/insights/server', () => ({
  listAiInsights: listAiInsightsMock,
  generateRuntimeAnalyticsInsight: generateRuntimeAnalyticsInsightMock,
}));

describe('ai-paths runtime analytics insights handler', () => {
  beforeEach(() => {
    requireAiPathsAccessMock.mockReset().mockResolvedValue(undefined);
    startAiInsightsQueueMock.mockReset();
    listAiInsightsMock.mockReset();
    generateRuntimeAnalyticsInsightMock.mockReset();
  });

  it('lists runtime insights with ai-paths access guard', async () => {
    const { GET_handler } = await import('./handler');
    listAiInsightsMock.mockResolvedValue([{ id: 'insight-1', type: 'runtime_analytics' }]);

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/runtime-analytics/insights?limit=5'),
      {} as Parameters<typeof GET_handler>[1]
    );
    const payload = (await response.json()) as { insights?: Array<{ id: string }> };

    expect(requireAiPathsAccessMock).toHaveBeenCalledTimes(1);
    expect(startAiInsightsQueueMock).toHaveBeenCalledTimes(1);
    expect(listAiInsightsMock).toHaveBeenCalledWith('runtime_analytics', 5);
    expect(payload.insights).toEqual([{ id: 'insight-1', type: 'runtime_analytics' }]);
  });

  it('generates runtime insight with selected range', async () => {
    const { POST_handler } = await import('./handler');
    generateRuntimeAnalyticsInsightMock.mockResolvedValue({ id: 'insight-runtime-1' });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/ai-paths/runtime-analytics/insights?range=7d', {
        method: 'POST',
      }),
      {} as Parameters<typeof POST_handler>[1]
    );
    const payload = (await response.json()) as { insight?: { id: string } };

    expect(requireAiPathsAccessMock).toHaveBeenCalledTimes(1);
    expect(startAiInsightsQueueMock).toHaveBeenCalledTimes(1);
    expect(generateRuntimeAnalyticsInsightMock).toHaveBeenCalledWith({
      source: 'user_triggered',
      range: '7d',
    });
    expect(payload.insight).toEqual({ id: 'insight-runtime-1' });
  });

  it('falls back to 24h when range is unsupported', async () => {
    const { POST_handler } = await import('./handler');
    generateRuntimeAnalyticsInsightMock.mockResolvedValue({ id: 'insight-runtime-2' });

    await POST_handler(
      new NextRequest('http://localhost/api/ai-paths/runtime-analytics/insights?range=2h', {
        method: 'POST',
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(generateRuntimeAnalyticsInsightMock).toHaveBeenCalledWith({
      source: 'user_triggered',
      range: '24h',
    });
  });
});
