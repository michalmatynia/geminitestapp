import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  startAiInsightsQueueMock,
  resolveObservabilityContextRegistryEnvelopeMock,
  generateLogsInsightMock,
  assertSettingsManageAccessMock,
} = vi.hoisted(() => ({
  startAiInsightsQueueMock: vi.fn(),
  resolveObservabilityContextRegistryEnvelopeMock: vi.fn(),
  generateLogsInsightMock: vi.fn(),
  assertSettingsManageAccessMock: vi.fn(),
}));

vi.mock('@/features/jobs/server', () => ({
  startAiInsightsQueue: startAiInsightsQueueMock,
}));

vi.mock('@/features/observability/context-registry/server', () => ({
  resolveObservabilityContextRegistryEnvelope: resolveObservabilityContextRegistryEnvelopeMock,
}));

vi.mock('@/features/ai/insights/server', () => ({
  listAiInsights: vi.fn(),
  generateLogsInsight: generateLogsInsightMock,
}));

vi.mock('@/shared/lib/auth/settings-manage-access', () => ({
  assertSettingsManageAccess: assertSettingsManageAccessMock,
}));

describe('system logs insights handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertSettingsManageAccessMock.mockResolvedValue(undefined);
  });

  it('resolves registry context before generating a logs insight', async () => {
    const { POST_handler } = await import('./handler');

    resolveObservabilityContextRegistryEnvelopeMock.mockResolvedValue({
      refs: [
        { id: 'page:system-logs', kind: 'static_node' },
        {
          id: 'runtime:system-logs:workspace',
          kind: 'runtime_document',
          providerId: 'system-logs-page-local',
          entityType: 'system_logs_workspace_state',
        },
      ],
      resolved: {
        refs: [{ id: 'page:system-logs', kind: 'static_node' }],
        nodes: [],
        documents: [
          {
            id: 'runtime:system-logs:workspace',
            kind: 'runtime_document',
            entityType: 'system_logs_workspace_state',
            title: 'Observation Post workspace state',
            summary: 'Live state',
            status: null,
            tags: ['observability'],
            relatedNodeIds: ['page:system-logs'],
          },
        ],
        truncated: false,
        engineVersion: 'registry:test',
      },
      engineVersion: 'registry:test',
    });
    generateLogsInsightMock.mockResolvedValue({ id: 'insight-1' });

    const req = new NextRequest('http://localhost/api/system/logs/insights', {
      method: 'POST',
      body: JSON.stringify({
        contextRegistry: {
          refs: [{ id: 'page:system-logs', kind: 'static_node' }],
          engineVersion: 'page-context:v1',
        },
      }),
    });

    const response = await POST_handler(req, {} as never);
    const data = await response.json();

    expect(startAiInsightsQueueMock).toHaveBeenCalledTimes(1);
    expect(resolveObservabilityContextRegistryEnvelopeMock).toHaveBeenCalledWith(
      {
        refs: [{ id: 'page:system-logs', kind: 'static_node' }],
        engineVersion: 'page-context:v1',
      },
      expect.any(Function)
    );
    expect(generateLogsInsightMock).toHaveBeenCalledWith({
      source: 'manual',
      contextRegistry: expect.objectContaining({
        refs: [
          expect.objectContaining({ id: 'page:system-logs' }),
          expect.objectContaining({ id: 'runtime:system-logs:workspace' }),
        ],
      }),
    });
    expect(data).toEqual({ insight: { id: 'insight-1' } });
  });
});
