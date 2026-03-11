import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  resolveImageStudioContextRegistryEnvelopeMock,
  sendProductImageToStudioMock,
} = vi.hoisted(() => ({
  resolveImageStudioContextRegistryEnvelopeMock: vi.fn(),
  sendProductImageToStudioMock: vi.fn(),
}));

vi.mock('@/features/ai/image-studio/context-registry/server', () => ({
  resolveImageStudioContextRegistryEnvelope: resolveImageStudioContextRegistryEnvelopeMock,
}));

vi.mock('@/features/ai/image-studio/product-studio/product-studio-service', () => ({
  sendProductImageToStudio: sendProductImageToStudioMock,
}));

import { POST_handler } from './send';

const createConfig = () => ({
  projectId: 'studio-project-1',
  sourceSlotByImageIndex: { '0': 'source-slot-1' },
  sourceSlotHistoryByImageIndex: { '0': ['source-slot-1'] },
  updatedAt: '2026-03-11T10:00:00.000Z',
});

const createSlot = (id: string) => ({
  id,
  projectId: 'studio-project-1',
  name: 'Source slot',
  folderPath: 'products/SKU-001',
  createdAt: '2026-03-11T10:00:00.000Z',
  updatedAt: '2026-03-11T10:05:00.000Z',
});

describe('products studio send handler', () => {
  beforeEach(() => {
    resolveImageStudioContextRegistryEnvelopeMock.mockReset();
    sendProductImageToStudioMock.mockReset();

    resolveImageStudioContextRegistryEnvelopeMock.mockResolvedValue({
      refs: [
        {
          id: 'page:product-editor',
          kind: 'static_node',
        },
      ],
      engineVersion: 'page-context:v1',
      resolved: {
        refs: [
          {
            id: 'page:product-editor',
            kind: 'static_node',
          },
        ],
        nodes: [],
        documents: [
          {
            id: 'runtime:product-editor:studio:product-1',
            kind: 'runtime_document',
            entityType: 'product_editor_studio_state',
            title: 'Product Studio workspace',
            summary: 'Current product editor studio state',
            tags: ['products', 'studio'],
            relatedNodeIds: ['page:product-editor'],
          },
        ],
        truncated: false,
        engineVersion: 'page-context:v1',
      },
    });

    sendProductImageToStudioMock.mockResolvedValue({
      runId: 'run-1',
      runStatus: 'queued',
      runKind: 'generation',
      expectedOutputs: 1,
      dispatchMode: 'queued',
      projectId: 'studio-project-1',
      imageSlotIndex: 0,
      sourceSlot: createSlot('source-slot-1'),
      config: createConfig(),
      sequencing: {
        persistedEnabled: true,
        enabled: true,
        cropCenterBeforeGeneration: false,
        upscaleOnAccept: false,
        upscaleScale: 1,
        runViaSequence: false,
        sequenceStepCount: 1,
        expectedOutputs: 1,
        snapshotHash: null,
        snapshotSavedAt: null,
        snapshotStepCount: 0,
        snapshotModelId: null,
        currentSnapshotHash: null,
        snapshotMatchesCurrent: true,
        needsSaveDefaults: false,
        needsSaveDefaultsReason: null,
      },
      sequencingDiagnostics: {
        projectId: 'studio-project-1',
        projectSettingsKey: 'project:studio-project-1',
        selectedSettingsKey: 'project:studio-project-1',
        selectedScope: 'project',
        hasProjectSettings: true,
        hasGlobalSettings: true,
        projectSequencingEnabled: true,
        globalSequencingEnabled: true,
        selectedSequencingEnabled: true,
        selectedSnapshotHash: null,
        selectedSnapshotSavedAt: null,
        selectedSnapshotStepCount: 0,
        selectedSnapshotModelId: null,
      },
      sequenceReadiness: {
        ready: true,
        requiresProjectSequence: false,
        state: 'ready',
        message: null,
      },
      sequenceStepPlan: [],
      sequenceRunId: null,
      requestedSequenceMode: 'auto',
      resolvedSequenceMode: 'auto',
      executionRoute: 'ai_direct_generation',
    });
  });

  it('resolves and forwards the context registry envelope', async () => {
    const response = await POST_handler(
      new Request('http://localhost/api/v2/products/product-1/studio/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageSlotIndex: 0,
          projectId: 'studio-project-1',
          contextRegistry: {
            refs: [
              {
                id: 'page:product-editor',
                kind: 'static_node',
              },
            ],
            engineVersion: 'page-context:v1',
          },
        }),
      }) as Parameters<typeof POST_handler>[0],
      { requestId: 'req-products-studio-send' } as Parameters<typeof POST_handler>[1],
      { id: 'product-1' }
    );

    expect(resolveImageStudioContextRegistryEnvelopeMock).toHaveBeenCalledWith({
      refs: [
        {
          id: 'page:product-editor',
          kind: 'static_node',
        },
      ],
      engineVersion: 'page-context:v1',
    });
    expect(sendProductImageToStudioMock).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'product-1',
        imageSlotIndex: 0,
        projectId: 'studio-project-1',
        contextRegistry: expect.objectContaining({
          refs: [
            {
              id: 'page:product-editor',
              kind: 'static_node',
            },
          ],
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      runId: 'run-1',
      runStatus: 'queued',
      runKind: 'generation',
    });
  });
});
