import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { api } from '@/shared/lib/api-client';
import {
  loadImageStudioAnalysisApplyIntent,
} from '@/features/ai/image-studio/utils/analysis-bridge';
import { useGenerationToolbarHandlers } from '../GenerationToolbar.handlers';

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateImageStudioSlots: vi.fn(),
}));

vi.mock('../generation-toolbar-action-handlers', () => ({
  createGenerationToolbarActionHandlers: vi.fn(() => ({
    handleUpscale: vi.fn(async () => {}),
    handleCrop: vi.fn(async () => {}),
  })),
}));

vi.mock('@/features/ai/image-studio/contracts/center', () => ({
  imageStudioCenterRequestSchema: {
    safeParse: (value: unknown) => ({ success: true, data: value }),
  },
  imageStudioCenterResponseSchema: {
    parse: (value: unknown) => value,
  },
}));

vi.mock('@/features/ai/image-studio/contracts/autoscaler', () => ({
  imageStudioAutoScalerResponseSchema: {
    parse: (value: unknown) => value,
  },
}));

vi.mock('../GenerationToolbarImageUtils', async () => {
  const actual = await vi.importActual('../GenerationToolbarImageUtils');
  return {
    ...actual,
    buildCenterRequestId: () => 'center_req_test',
    buildAutoScalerRequestId: () => 'autoscale_req_test',
    withCenterRetry: async (run: () => Promise<unknown>) => run(),
    withAutoScalerRetry: async (run: () => Promise<unknown>) => run(),
    isClientCenterCrossOriginError: () => false,
    isCenterAbortError: () => false,
    isAutoScalerAbortError: () => false,
    hasCanvasOverflowFromImageFrame: () => false,
  };
});

const BASE_LAYOUT_PAYLOAD = {
  paddingPercent: 9,
  paddingXPercent: 9,
  paddingYPercent: 9,
  fillMissingCanvasWhite: false,
  whiteThreshold: 15,
  chromaThreshold: 12,
  shadowPolicy: 'auto',
  detection: 'white_bg_first_colored_pixel',
};

const BASE_ANALYSIS_LAYOUT = {
  paddingPercent: 12,
  paddingXPercent: 14,
  paddingYPercent: 10,
  splitAxes: true,
  fillMissingCanvasWhite: false,
  targetCanvasWidth: null,
  targetCanvasHeight: null,
  whiteThreshold: 21,
  chromaThreshold: 7,
  shadowPolicy: 'include_shadow',
  detection: 'alpha_bbox',
};

const createState = (overrides?: Record<string, unknown>) => {
  const toast = vi.fn();
  return {
    projectId: null,
    slots: [{ id: 'slot-1' }, { id: 'slot-2' }],
    slotSelectionLocked: false,
    workingSlot: {
      id: 'slot-1',
      imageFile: {
        width: 1000,
        height: 1000,
      },
    },
    setSelectedSlotId: vi.fn(),
    setWorkingSlotId: vi.fn(),
    setMaskShapes: vi.fn(),
    setTool: vi.fn(),
    setActiveMaskId: vi.fn(),
    activeMaskId: null,
    setCanvasSelectionEnabled: vi.fn(),
    toast,
    queryClient: {
      setQueryData: vi.fn(),
    },
    maskAttachMode: 'client_canvas_polygon',
    upscaleMode: 'server_sharp',
    upscaleStrategy: 'scale',
    cropMode: 'server_bbox',
    centerMode: 'server_object_layout_v1',
    autoScaleMode: 'server_auto_scaler_v1',
    upscaleScale: '2',
    upscaleSmoothingQuality: 'high',
    upscaleTargetHeight: '',
    upscaleTargetWidth: '',
    setUpscaleBusy: vi.fn(),
    setUpscaleStatus: vi.fn(),
    setCenterBusy: vi.fn(),
    setCenterStatus: vi.fn(),
    setAutoScaleBusy: vi.fn(),
    setAutoScaleStatus: vi.fn(),
    setCropBusy: vi.fn(),
    setCropStatus: vi.fn(),
    upscaleRequestInFlightRef: { current: false },
    upscaleAbortControllerRef: { current: null },
    cropRequestInFlightRef: { current: false },
    cropAbortControllerRef: { current: null },
    centerRequestInFlightRef: { current: false },
    centerAbortControllerRef: { current: null },
    autoScaleRequestInFlightRef: { current: false },
    autoScaleAbortControllerRef: { current: null },
    cropDiagnosticsRef: { current: null },
    exportMaskShapes: [],
    hasShapeCropBoundary: false,
    workingSlotImageSrc: 'https://example.test/source.png',
    clientProcessingImageSrc: null,
    workingSourceSignature: 'sig_v1',
    centerLayoutPayload: BASE_LAYOUT_PAYLOAD,
    autoScaleLayoutPayload: BASE_LAYOUT_PAYLOAD,
    projectCanvasSize: null,
    getPreviewCanvasViewportCrop: () => null,
    getPreviewCanvasImageFrame: () => null,
    handleAiMaskGeneration: vi.fn(async () => {}),
    analysisPlanSnapshot: {
      slotId: 'slot-1',
      sourceSignature: 'sig_v1',
      layout: BASE_ANALYSIS_LAYOUT,
    },
    applyAnalysisLayoutToCenter: vi.fn(),
    applyAnalysisLayoutToAutoScaler: vi.fn(),
    ...overrides,
  };
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useGenerationToolbarHandlers analysis layout integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('sends normalized center layout payload in object layout request', async () => {
    const state = createState();
    const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce({
      mode: 'server_object_layout_v1',
      effectiveMode: 'server_object_layout_v1',
      slot: { id: 'slot-center-out' },
      deduplicated: false,
      lifecycle: { state: 'persisted', durationMs: 12 },
      pipelineVersion: 'test-v1',
    } as never);

    const { result } = renderHook(() => useGenerationToolbarHandlers(state as never));
    await result.current.handleCenterObject();

    expect(postSpy).toHaveBeenCalledWith(
      '/api/image-studio/slots/slot-1/center',
      expect.objectContaining({
        mode: 'server_object_layout_v1',
        layout: expect.objectContaining({
          paddingPercent: 9,
          paddingXPercent: 9,
          paddingYPercent: 9,
          whiteThreshold: 15,
          chromaThreshold: 12,
          detection: 'white_bg_first_colored_pixel',
        }),
      }),
      expect.anything()
    );
  });

  it('sends normalized auto scaler layout payload with shared thresholds', async () => {
    const state = createState({
      autoScaleLayoutPayload: {
        paddingPercent: 6,
        paddingXPercent: 7,
        paddingYPercent: 5,
        fillMissingCanvasWhite: true,
        targetCanvasWidth: 1800,
        targetCanvasHeight: 1400,
        whiteThreshold: 33,
        chromaThreshold: 4,
        shadowPolicy: 'exclude_shadow',
        detection: 'alpha_bbox',
      },
    });
    const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce({
      mode: 'server_auto_scaler_v1',
      effectiveMode: 'server_auto_scaler_v1',
      slot: { id: 'slot-autoscale-out' },
      deduplicated: false,
      lifecycle: { state: 'persisted', durationMs: 15 },
      pipelineVersion: 'test-v1',
    } as never);

    const { result } = renderHook(() => useGenerationToolbarHandlers(state as never));
    await result.current.handleAutoScale();

    expect(postSpy).toHaveBeenCalledWith(
      '/api/image-studio/slots/slot-1/autoscale',
      expect.objectContaining({
        mode: 'server_auto_scaler_v1',
        layout: expect.objectContaining({
          detection: 'alpha_bbox',
          whiteThreshold: 33,
          chromaThreshold: 4,
          targetCanvasWidth: 1800,
          targetCanvasHeight: 1400,
        }),
      }),
      expect.anything()
    );
  });

  it('applies analysis plan to auto scaler when slot/signature are valid', () => {
    const setAutoScalePadding = vi.fn();
    const setSharedDetection = vi.fn();
    const setSharedWhiteThreshold = vi.fn();
    const setSharedChromaThreshold = vi.fn();
    const applyAnalysisLayoutToAutoScaler = vi.fn((layout: typeof BASE_ANALYSIS_LAYOUT) => {
      setAutoScalePadding(String(layout.paddingPercent));
      setSharedDetection(layout.detection);
      setSharedWhiteThreshold(String(layout.whiteThreshold));
      setSharedChromaThreshold(String(layout.chromaThreshold));
    });
    const state = createState({
      applyAnalysisLayoutToAutoScaler,
    });

    const { result } = renderHook(() => useGenerationToolbarHandlers(state as never));
    result.current.handleApplyAnalysisPlanToAutoScaler();

    expect(applyAnalysisLayoutToAutoScaler).toHaveBeenCalledWith(
      expect.objectContaining({
        detection: 'alpha_bbox',
        whiteThreshold: 21,
        chromaThreshold: 7,
      }),
      'manual'
    );
    expect(setAutoScalePadding).toHaveBeenCalledWith('12');
    expect(setSharedDetection).toHaveBeenCalledWith('alpha_bbox');
    expect(setSharedWhiteThreshold).toHaveBeenCalledWith('21');
    expect(setSharedChromaThreshold).toHaveBeenCalledWith('7');
  });

  it('queues intent and switches slot when toolbar apply target slot differs', () => {
    const state = createState({
      projectId: 'project-alpha',
      workingSlot: { id: 'slot-1' },
      analysisPlanSnapshot: {
        slotId: 'slot-2',
        sourceSignature: 'sig_slot_2',
        layout: BASE_ANALYSIS_LAYOUT,
      },
      workingSourceSignature: 'sig_slot_1',
    });

    const { result } = renderHook(() => useGenerationToolbarHandlers(state as never));
    result.current.handleApplyAnalysisPlanToAutoScaler();

    expect(state.applyAnalysisLayoutToAutoScaler).not.toHaveBeenCalled();
    expect(state.setSelectedSlotId).toHaveBeenCalledWith('slot-2');
    expect(state.setWorkingSlotId).toHaveBeenCalledWith('slot-2');

    const intent = loadImageStudioAnalysisApplyIntent('project-alpha');
    expect(intent).not.toBeNull();
    expect(intent?.slotId).toBe('slot-2');
    expect(intent?.target).toBe('auto_scaler');
  });

  it('does not queue intent when slot selection is locked', () => {
    const state = createState({
      projectId: 'project-alpha',
      slotSelectionLocked: true,
      analysisPlanSnapshot: {
        slotId: 'slot-2',
        sourceSignature: 'sig_slot_2',
        layout: BASE_ANALYSIS_LAYOUT,
      },
      workingSourceSignature: 'sig_slot_2',
    });

    const { result } = renderHook(() => useGenerationToolbarHandlers(state as never));
    result.current.handleApplyAnalysisPlanToAutoScaler();

    expect(state.applyAnalysisLayoutToAutoScaler).not.toHaveBeenCalled();
    expect(state.setSelectedSlotId).not.toHaveBeenCalled();
    expect(state.setWorkingSlotId).not.toHaveBeenCalled();
    expect(loadImageStudioAnalysisApplyIntent('project-alpha')).toBeNull();
    expect(state.toast).toHaveBeenCalledWith('Cannot apply while slot selection is locked.', {
      variant: 'info',
    });
  });
});
