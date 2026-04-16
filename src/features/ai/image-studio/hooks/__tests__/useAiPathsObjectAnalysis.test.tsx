import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  apiGetMock,
  apiPostMock,
  toastMock,
  setCanvasImageOffsetMock,
  setCenterGuidesEnabledMock,
  getPreviewCanvasImageFrameMock,
  useOptionalContextRegistryPageEnvelopeMock,
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  toastMock: vi.fn(),
  setCanvasImageOffsetMock: vi.fn(),
  setCenterGuidesEnabledMock: vi.fn(),
  getPreviewCanvasImageFrameMock: vi.fn(() => null),
  useOptionalContextRegistryPageEnvelopeMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: apiGetMock,
    post: apiPostMock,
  },
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock('@/features/ai/ai-context-registry/context/page-context', () => ({
  useOptionalContextRegistryPageEnvelope: useOptionalContextRegistryPageEnvelopeMock,
}));

vi.mock('@/features/ai/image-studio/utils/analysis-bridge', () => ({
  saveImageStudioAnalysisApplyIntent: vi.fn(),
}));

vi.mock('@/features/ai/image-studio/utils/ai-paths-object-analysis', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/ai/image-studio/utils/ai-paths-object-analysis')
      >('@/features/ai/image-studio/utils/ai-paths-object-analysis');

  return {
    ...actual,
    parseAiPathNodesAndEdgesFromSettings: vi.fn(() => ({
      nodes: [{ id: 'node-1', type: 'input' }],
      edges: [],
    })),
    parseAiPathMetasFromSettings: vi.fn(() => [
      {
        id: 'path-1',
        name: 'Object Detector',
      },
    ]),
  };
});

vi.mock('@/features/ai/image-studio/context/UiContext', () => ({
  useUiCanvasState: () => ({
    canvasImageOffset: { x: 0, y: 0 },
  }),
  useUiActions: () => ({
    setCanvasImageOffset: setCanvasImageOffsetMock,
    setCenterGuidesEnabled: setCenterGuidesEnabledMock,
    getPreviewCanvasImageFrame: getPreviewCanvasImageFrameMock,
  }),
}));

import { useAiPathsObjectAnalysis } from '../useAiPathsObjectAnalysis';

describe('useAiPathsObjectAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOptionalContextRegistryPageEnvelopeMock.mockReturnValue({
      refs: [
        {
          id: 'page:admin-image-studio',
          kind: 'static_node',
        },
        {
          id: 'runtime:image-studio:workspace',
          kind: 'runtime_document',
          providerId: 'image-studio-page-local',
          entityType: 'image_studio_workspace_state',
        },
      ],
      engineVersion: 'page-context-engine/1',
    });
    apiGetMock
      .mockResolvedValueOnce([
        {
          key: 'ai_paths_meta',
          value: '{}',
        },
      ])
      .mockResolvedValueOnce([
        {
          key: 'ai_paths_settings',
          value: '{}',
        },
      ]);
    apiPostMock.mockResolvedValue({
      run: {
        id: 'run-1',
        status: 'queued',
      },
    });
  });

  it('forwards the page context registry when enqueuing AI Paths object analysis', async () => {
    const { result } = renderHook(() =>
      useAiPathsObjectAnalysis({
        projectId: 'project-1',
        workingSlotId: 'slot-1',
        workingSlotImageSrc: '/uploads/image.png',
        workingSlotImageWidth: 1024,
        workingSlotImageHeight: 1024,
        canvasWidth: 1024,
        canvasHeight: 1024,
      })
    );

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalled();
    });

    act(() => {
      result.current.setConfig((prev) => ({
        ...prev,
        pathId: 'path-1',
      }));
    });

    await act(async () => {
      await result.current.triggerAnalysis();
    });

    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/ai-paths/runs/enqueue',
      expect.objectContaining({
        pathId: 'path-1',
        contextRegistry: expect.objectContaining({
          refs: [
            {
              id: 'page:admin-image-studio',
              kind: 'static_node',
            },
            {
              id: 'runtime:image-studio:workspace',
              kind: 'runtime_document',
              providerId: 'image-studio-page-local',
              entityType: 'image_studio_workspace_state',
            },
          ],
        }),
      })
    );
  });
});
