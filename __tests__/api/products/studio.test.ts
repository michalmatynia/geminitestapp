/**
 * @vitest-environment node
 */

import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST_handler as POST_ACCEPT } from '@/app/api/products/[id]/studio/handlers/accept';
import { POST_handler as POST_LINK } from '@/app/api/products/[id]/studio/handlers/link';
import { GET_handler as GET_PREFLIGHT } from '@/app/api/products/[id]/studio/handlers/preflight';
import {
  GET_handler as GET_STUDIO_CONFIG,
  PUT_handler as PUT_STUDIO_CONFIG,
} from '@/app/api/products/[id]/studio/handler';
import { POST_handler as POST_SEND } from '@/app/api/products/[id]/studio/handlers/send';
import { GET_handler as GET_VARIANTS } from '@/app/api/products/[id]/studio/handlers/variants';
import {
  getProductStudioConfig,
  setProductStudioConfig,
} from '@/shared/lib/products/services/product-studio-config';
import {
  acceptProductStudioVariant,
  getProductStudioSequencePreflight,
  getProductStudioVariants,
  linkProductImageToStudio,
  sendProductImageToStudio,
} from '@/features/ai/image-studio/product-studio/product-studio-service';
import { productService } from '@/shared/lib/products/services/productService';

vi.mock('@/shared/lib/products/services/productService', () => ({
  productService: {
    getProductById: vi.fn(),
  },
}));

vi.mock('@/shared/lib/products/services/product-studio-config', () => ({
  getProductStudioConfig: vi.fn(),
  setProductStudioConfig: vi.fn(),
}));

vi.mock('@/features/ai/image-studio/product-studio/product-studio-service', () => ({
  sendProductImageToStudio: vi.fn(),
  linkProductImageToStudio: vi.fn(),
  getProductStudioSequencePreflight: vi.fn(),
  getProductStudioVariants: vi.fn(),
  acceptProductStudioVariant: vi.fn(),
}));

const mockContext: ApiHandlerContext = {
  requestId: 'test-req-id',
  startTime: Date.now(),
  getElapsedMs: () => 0,
};

describe('Product Studio API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(productService.getProductById).mockResolvedValue({
      id: 'prod-1',
    } as any);
  });

  it('GET /api/products/[id]/studio returns config', async () => {
    vi.mocked(getProductStudioConfig).mockResolvedValue({
      projectId: 'studio-a',
      sourceSlotByImageIndex: { '0': 'slot-1' },
      sourceSlotHistoryByImageIndex: {},
      updatedAt: '2026-02-13T10:00:00.000Z',
    });

    const response = await GET_STUDIO_CONFIG(
      new NextRequest('http://localhost/api/products/prod-1/studio'),
      mockContext,
      { id: 'prod-1' }
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      config: { projectId: string | null };
    };
    expect(payload.config.projectId).toBe('studio-a');
    expect(getProductStudioConfig).toHaveBeenCalledWith('prod-1');
  });

  it('PUT /api/products/[id]/studio saves project', async () => {
    vi.mocked(setProductStudioConfig).mockResolvedValue({
      projectId: 'studio-b',
      sourceSlotByImageIndex: {},
      sourceSlotHistoryByImageIndex: {},
      updatedAt: '2026-02-13T10:00:00.000Z',
    });

    const response = await PUT_STUDIO_CONFIG(
      new NextRequest('http://localhost/api/products/prod-1/studio', {
        method: 'PUT',
        body: JSON.stringify({ projectId: 'studio-b' }),
      }),
      mockContext,
      { id: 'prod-1' }
    );

    expect(response.status).toBe(200);
    expect(setProductStudioConfig).toHaveBeenCalledWith('prod-1', {
      projectId: 'studio-b',
    });
  });

  it('PUT /api/products/[id]/studio ignores legacy sequencing payload', async () => {
    vi.mocked(setProductStudioConfig).mockResolvedValue({
      projectId: 'studio-a',
      sourceSlotByImageIndex: {},
      sourceSlotHistoryByImageIndex: {},
      updatedAt: '2026-02-13T10:00:00.000Z',
    });

    const response = await PUT_STUDIO_CONFIG(
      new NextRequest('http://localhost/api/products/prod-1/studio', {
        method: 'PUT',
        body: JSON.stringify({
          sequencing: {
            enabled: true,
            cropCenterBeforeGeneration: true,
            upscaleOnAccept: false,
            upscaleScale: 2,
          },
        }),
      }),
      mockContext,
      { id: 'prod-1' }
    );

    expect(response.status).toBe(200);
    expect(setProductStudioConfig).toHaveBeenCalledWith('prod-1', {});
  });

  it('POST /api/products/[id]/studio/send forwards request', async () => {
    vi.mocked(sendProductImageToStudio).mockResolvedValue({
      config: {
        projectId: 'studio-a',
        sourceSlotByImageIndex: { '0': 'slot-1' },
        sourceSlotHistoryByImageIndex: {},
        updatedAt: '2026-02-13T10:00:00.000Z',
      },
      sequencing: {
        persistedEnabled: false,
        enabled: false,
        cropCenterBeforeGeneration: false,
        upscaleOnAccept: false,
        upscaleScale: 1,
        runViaSequence: false,
        sequenceStepCount: 0,
        expectedOutputs: 0,
        snapshotHash: null,
        snapshotSavedAt: null,
        snapshotStepCount: 0,
        snapshotModelId: null,
        currentSnapshotHash: null,
        snapshotMatchesCurrent: false,
        needsSaveDefaults: false,
        needsSaveDefaultsReason: null,
      },
      sequencingDiagnostics: {
        projectId: 'studio-a',
        projectSettingsKey: 'image_studio_project_settings_studio-a',
        selectedSettingsKey: 'image_studio_project_settings_studio-a',
        selectedScope: 'project',
        hasProjectSettings: true,
        hasGlobalSettings: true,
        projectSequencingEnabled: false,
        globalSequencingEnabled: true,
        selectedSequencingEnabled: false,
        selectedSnapshotHash: null,
        selectedSnapshotSavedAt: null,
        selectedSnapshotStepCount: 0,
        selectedSnapshotModelId: null,
      },
      sequenceReadiness: {
        ready: false,
        requiresProjectSequence: true,
        state: 'project_sequence_disabled',
        message: 'Project sequencing is disabled.',
      },
      sequenceStepPlan: [],
      projectId: 'studio-a',
      imageSlotIndex: 0,
      sourceSlot: {
        id: 'slot-1',
      } as any,
      runId: 'run-1',
      runStatus: 'queued',
      runKind: 'generation',
      sequenceRunId: null,
      expectedOutputs: 1,
      dispatchMode: 'queued',
      requestedSequenceMode: 'auto',
      resolvedSequenceMode: 'auto',
      executionRoute: 'studio_sequencer',
    });

    const response = await POST_SEND(
      new NextRequest('http://localhost/api/products/prod-1/studio/send', {
        method: 'POST',
        body: JSON.stringify({ imageSlotIndex: 0, projectId: 'studio-a' }),
      }),
      mockContext,
      { id: 'prod-1' }
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      sequencingDiagnostics?: { selectedScope?: string };
    };
    expect(payload.sequencingDiagnostics?.selectedScope).toBe('project');
    expect(sendProductImageToStudio).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'prod-1',
        imageSlotIndex: 0,
        projectId: 'studio-a',
      })
    );
  });

  it('POST /api/products/[id]/studio/send surfaces sequencing readiness errors', async () => {
    vi.mocked(sendProductImageToStudio).mockRejectedValueOnce(
      new Error(
        'Image Studio project sequencing is disabled in persisted project settings. Enable Sequencing and click "Save Defaults" in Image Studio Sequencing.'
      )
    );

    let response: Response;
    try {
      response = await POST_SEND(
        new NextRequest('http://localhost/api/products/prod-1/studio/send', {
          method: 'POST',
          body: JSON.stringify({ imageSlotIndex: 0, projectId: 'studio-a' }),
        }),
        mockContext,
        { id: 'prod-1' }
      );
    } catch (error: any) {
      response = NextResponse.json({ error: error.message }, { status: 500 });
    }

    expect(response.status).toBe(500);
    const data = (await response.json()) as { error: string };
    expect(data.error).toContain('Save Defaults');

    expect(sendProductImageToStudio).toHaveBeenCalledTimes(1);
  });

  it('POST /api/products/[id]/studio/link forwards request', async () => {
    vi.mocked(linkProductImageToStudio).mockResolvedValue({
      config: {
        projectId: 'studio-a',
        sourceSlotByImageIndex: { '0': 'slot-source' },
        sourceSlotHistoryByImageIndex: {},
        updatedAt: '2026-02-13T10:00:00.000Z',
      },
      projectId: 'studio-a',
      imageSlotIndex: 0,
      sourceSlot: {
        id: 'slot-source',
      } as any,
    });

    const response = await POST_LINK(
      new NextRequest('http://localhost/api/products/prod-1/studio/link', {
        method: 'POST',
        body: JSON.stringify({ imageSlotIndex: 0, projectId: 'studio-a' }),
      }),
      mockContext,
      { id: 'prod-1' }
    );

    expect(response.status).toBe(200);
    expect(linkProductImageToStudio).toHaveBeenCalledWith({
      productId: 'prod-1',
      imageSlotIndex: 0,
      projectId: 'studio-a',
      rotateBeforeSendDeg: null,
    });
  });

  it('GET /api/products/[id]/studio/variants forwards request', async () => {
    vi.mocked(getProductStudioVariants).mockResolvedValue({
      config: {
        projectId: 'studio-a',
        sourceSlotByImageIndex: { '1': 'slot-source' },
        sourceSlotHistoryByImageIndex: {},
        updatedAt: '2026-02-13T10:00:00.000Z',
      },
      sequencing: {
        persistedEnabled: true,
        enabled: true,
        cropCenterBeforeGeneration: true,
        upscaleOnAccept: true,
        upscaleScale: 2,
        runViaSequence: false,
        sequenceStepCount: 0,
        expectedOutputs: 0,
        snapshotHash: null,
        snapshotSavedAt: null,
        snapshotStepCount: 0,
        snapshotModelId: null,
        currentSnapshotHash: null,
        snapshotMatchesCurrent: false,
        needsSaveDefaults: true,
        needsSaveDefaultsReason: 'Save Defaults required.',
      },
      sequencingDiagnostics: {
        projectId: 'studio-a',
        projectSettingsKey: 'image_studio_project_settings_studio-a',
        selectedSettingsKey: 'image_studio_project_settings_studio-a',
        selectedScope: 'project',
        hasProjectSettings: true,
        hasGlobalSettings: true,
        projectSequencingEnabled: true,
        globalSequencingEnabled: false,
        selectedSequencingEnabled: true,
        selectedSnapshotHash: 'abc123',
        selectedSnapshotSavedAt: '2026-02-13T10:00:00.000Z',
        selectedSnapshotStepCount: 1,
        selectedSnapshotModelId: 'chatgpt-image-latest',
      },
      sequenceReadiness: {
        ready: false,
        requiresProjectSequence: true,
        state: 'project_snapshot_stale',
        message: 'Save Defaults required.',
      },
      sequenceStepPlan: [
        {
          index: 0,
          stepId: 'step_crop',
          stepType: 'crop_center',
          inputSource: 'source',
          resolvedInput: 'source',
          producesOutput: true,
        },
      ],
      sequenceGenerationMode: 'studio_prompt_then_sequence',
      projectId: 'studio-a',
      sourceSlotId: 'slot-source',
      sourceSlot: {
        id: 'slot-source',
      } as any,
      variants: [
        {
          id: 'variant-1',
        } as any,
      ],
    });

    const response = await GET_VARIANTS(
      new NextRequest(
        'http://localhost/api/products/prod-1/studio/variants?imageSlotIndex=1&projectId=studio-a'
      ),
      mockContext,
      { id: 'prod-1' }
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      sequencingDiagnostics?: { selectedSettingsKey?: string | null };
    };
    expect(payload.sequencingDiagnostics?.selectedSettingsKey).toBe(
      'image_studio_project_settings_studio-a'
    );
    expect(getProductStudioVariants).toHaveBeenCalledWith({
      productId: 'prod-1',
      imageSlotIndex: 1,
      projectId: 'studio-a',
    });
  });

  it('GET /api/products/[id]/studio/preflight forwards request', async () => {
    vi.mocked(getProductStudioSequencePreflight).mockResolvedValue({
      config: {
        projectId: 'studio-a',
        sourceSlotByImageIndex: { '1': 'slot-source' },
        sourceSlotHistoryByImageIndex: {},
        updatedAt: '2026-02-13T10:00:00.000Z',
      },
      projectId: 'studio-a',
      imageSlotIndex: 1,
      sequenceGenerationMode: 'studio_prompt_then_sequence',
      requestedSequenceMode: 'studio_prompt_then_sequence',
      resolvedSequenceMode: 'studio_prompt_then_sequence',
      executionRoute: 'studio_sequencer',
      sequencing: {
        persistedEnabled: true,
        enabled: true,
        cropCenterBeforeGeneration: true,
        upscaleOnAccept: true,
        upscaleScale: 2,
        runViaSequence: true,
        sequenceStepCount: 1,
        expectedOutputs: 1,
        snapshotHash: 'abc123',
        snapshotSavedAt: '2026-02-13T10:00:00.000Z',
        snapshotStepCount: 1,
        snapshotModelId: 'chatgpt-image-latest',
        currentSnapshotHash: 'abc123',
        snapshotMatchesCurrent: true,
        needsSaveDefaults: false,
        needsSaveDefaultsReason: null,
      },
      sequencingDiagnostics: {
        projectId: 'studio-a',
        projectSettingsKey: 'image_studio_project_settings_studio-a',
        selectedSettingsKey: 'image_studio_project_settings_studio-a',
        selectedScope: 'project',
        hasProjectSettings: true,
        hasGlobalSettings: true,
        projectSequencingEnabled: true,
        globalSequencingEnabled: false,
        selectedSequencingEnabled: true,
        selectedSnapshotHash: 'abc123',
        selectedSnapshotSavedAt: '2026-02-13T10:00:00.000Z',
        selectedSnapshotStepCount: 1,
        selectedSnapshotModelId: 'chatgpt-image-latest',
      },
      sequenceReadiness: {
        ready: true,
        requiresProjectSequence: true,
        state: 'ready',
        message: null,
      },
      sequenceStepPlan: [
        {
          index: 0,
          stepId: 'step_crop',
          stepType: 'crop_center',
          inputSource: 'source',
          resolvedInput: 'source',
          producesOutput: true,
        },
      ],
      modelId: 'chatgpt-image-latest',
      warnings: [],
    });

    const response = await GET_PREFLIGHT(
      new NextRequest(
        'http://localhost/api/products/prod-1/studio/preflight?imageSlotIndex=1&projectId=studio-a&sequenceGenerationMode=studio_prompt_then_sequence'
      ),
      mockContext,
      { id: 'prod-1' }
    );

    expect(response.status).toBe(200);
    expect(getProductStudioSequencePreflight).toHaveBeenCalledWith({
      productId: 'prod-1',
      imageSlotIndex: 1,
      projectId: 'studio-a',
      sequenceGenerationMode: 'studio_prompt_then_sequence',
    });
  });

  it('POST /api/products/[id]/studio/accept forwards request', async () => {
    vi.mocked(acceptProductStudioVariant).mockResolvedValue({
      id: 'prod-1',
      images: [],
    } as any);

    const response = await POST_ACCEPT(
      new NextRequest('http://localhost/api/products/prod-1/studio/accept', {
        method: 'POST',
        body: JSON.stringify({
          imageSlotIndex: 0,
          generationSlotId: 'variant-1',
          projectId: 'studio-a',
        }),
      }),
      mockContext,
      { id: 'prod-1' }
    );

    expect(response.status).toBe(200);
    expect(acceptProductStudioVariant).toHaveBeenCalledWith({
      productId: 'prod-1',
      imageSlotIndex: 0,
      generationSlotId: 'variant-1',
      projectId: 'studio-a',
    });
  });
});
