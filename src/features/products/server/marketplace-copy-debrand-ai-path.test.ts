import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  assertAiPathRunQueueReadyForEnqueueMock: vi.fn(),
  ensureCanonicalStarterWorkflowSettingsForPathIdsMock: vi.fn(),
  enqueuePathRunMock: vi.fn(),
  getAiPathsSettingMock: vi.fn(),
  loadCanonicalStoredPathConfigMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  ensureCanonicalStarterWorkflowSettingsForPathIds: (...args: unknown[]) =>
    mocks.ensureCanonicalStarterWorkflowSettingsForPathIdsMock(...args),
  enqueuePathRun: (...args: unknown[]) => mocks.enqueuePathRunMock(...args),
  getAiPathsSetting: (...args: unknown[]) => mocks.getAiPathsSettingMock(...args),
}));

vi.mock('@/features/ai/ai-paths/workers/aiPathRunQueue', () => ({
  assertAiPathRunQueueReadyForEnqueue: (...args: unknown[]) =>
    mocks.assertAiPathRunQueueReadyForEnqueueMock(...args),
}));

vi.mock('@/shared/lib/ai-paths/core/utils/stored-path-config', () => ({
  loadCanonicalStoredPathConfig: (...args: unknown[]) =>
    mocks.loadCanonicalStoredPathConfigMock(...args),
}));

import { enqueueMarketplaceCopyDebrandRowRun } from './marketplace-copy-debrand-ai-path';

describe('marketplace copy debrand AI Path enqueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertAiPathRunQueueReadyForEnqueueMock.mockResolvedValue({ running: true });
    mocks.ensureCanonicalStarterWorkflowSettingsForPathIdsMock.mockResolvedValue(undefined);
    mocks.getAiPathsSettingMock.mockResolvedValue('stored-config');
    mocks.enqueuePathRunMock.mockResolvedValue({ id: 'run-row-1' });
    mocks.loadCanonicalStoredPathConfigMock.mockReturnValue({
      id: 'path_marketplace_copy_debrand_v1',
      name: 'Marketplace Copy Debrand',
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          config: {
            trigger: {
              event: 'bdf0f5d2-a300-4f79-991c-2b5f1e0ef3a4',
            },
          },
        },
        {
          id: 'node-regex-marketplace-copy-debrand',
          type: 'regex',
          config: {},
        },
        {
          id: 'node-db-update-marketplace-copy-debrand',
          type: 'database',
          config: {
            database: {
              operation: 'update',
            },
          },
        },
      ],
      edges: [
        {
          id: 'edge-regex-db-marketplace-copy-debrand',
          from: 'node-regex-marketplace-copy-debrand',
          to: 'node-db-update-marketplace-copy-debrand',
        },
      ],
      strictFlowMode: true,
      historyRetentionPasses: 2,
      aiPathsValidation: { enabled: true },
    });
  });

  it('queues row debrand runs through the Redis-backed AI Path runtime', async () => {
    const runId = await enqueueMarketplaceCopyDebrandRowRun({
      productId: 'product-1',
      entityJson: {
        id: 'product-1',
        name_en: 'Branded title',
      },
      marketplaceCopyDebrandInput: {
        sourceEnglishTitle: 'Branded title',
        sourceEnglishDescription: 'Auto-assigned keychain shipping for Tradera listings.',
        targetRow: {
          id: 'row-1',
          index: 0,
          integrationIds: ['integration-tradera'],
          integrationNames: ['Tradera'],
          currentAlternateTitle: 'Old title',
          currentAlternateDescription: 'Auto-assigned keychain shipping for Tradera listings.',
        },
      },
      integration: {
        id: 'integration-tradera',
        slug: 'tradera',
        name: 'Tradera',
      } as never,
      userId: 'user-42',
    });

    expect(runId).toBe('run-row-1');
    expect(mocks.assertAiPathRunQueueReadyForEnqueueMock).toHaveBeenCalledTimes(1);
    const enqueueInput = mocks.enqueuePathRunMock.mock.calls[0]?.[0] as {
      nodes: Array<{ id: string }>;
      edges: Array<{ from?: string; to?: string }>;
    };
    expect(enqueueInput.nodes.map((node) => node.id)).not.toContain(
      'node-db-update-marketplace-copy-debrand'
    );
    expect(enqueueInput.edges).toEqual([]);
    expect(mocks.enqueuePathRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-42',
        pathId: 'path_marketplace_copy_debrand_v1',
        triggerNodeId: 'trigger-1',
        entityId: 'product-1',
        entityType: 'product',
        triggerContext: expect.objectContaining({
          entityId: 'product-1',
          extras: expect.objectContaining({
            mode: 'row',
            marketplaceCopyDebrandInput: expect.objectContaining({
              sourceEnglishTitle: 'Branded title',
              sourceEnglishDescription: '',
              targetRow: expect.objectContaining({
                currentAlternateDescription: null,
              }),
            }),
          }),
        }),
        meta: expect.objectContaining({
          source: 'product_marketplace_copy_debrand_row',
          serverMetadata: expect.objectContaining({
            source: 'marketplace-copy-debrand-row',
            integrationId: 'integration-tradera',
            rowIndex: 0,
          }),
        }),
      })
    );
  });
});
