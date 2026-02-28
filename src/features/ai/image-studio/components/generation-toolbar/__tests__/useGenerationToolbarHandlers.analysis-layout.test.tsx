import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/shared/lib/api-client';
import { loadImageStudioAnalysisPlanSnapshot } from '@/features/ai/image-studio/utils/analysis-bridge';
import { useGenerationToolbarHandlers } from '../GenerationToolbar.handlers';
import { type GenerationToolbarState } from '../GenerationToolbar.types';

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

const CENTER_LAYOUT_PAYLOAD = {
  paddingPercent: 9,
  paddingXPercent: 9,
  paddingYPercent: 9,
  fillMissingCanvasWhite: false,
  whiteThreshold: 15,
  chromaThreshold: 12,
  shadowPolicy: 'auto',
  detection: 'white_bg_first_colored_pixel',
};

const AUTO_SCALE_LAYOUT_PAYLOAD = {
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
};

const ANALYSIS_LAYOUT = {
  paddingPercent: 12,
  paddingXPercent: 14,
  paddingYPercent: 10,
  fillMissingCanvasWhite: false,
  targetCanvasWidth: null,
  targetCanvasHeight: null,
  whiteThreshold: 21,
  chromaThreshold: 7,
  shadowPolicy: 'include_shadow',
  detection: 'alpha_bbox',
};

const createAnalysisResponse = () => ({
  sourceSlotId: 'slot-1',
  mode: 'server_analysis_v1',
  effectiveMode: 'server_analysis_v1',
  authoritativeSource: 'source_slot',
  sourceMimeHint: null,
  analysis: {
    width: 1000,
    height: 1000,
    sourceObjectBounds: { left: 120, top: 140, width: 700, height: 680 },
    detectionUsed: 'alpha_bbox',
    confidence: 0.92,
    detectionDetails: null,
    policyVersion: 'policy_v2',
    policyReason: 'alpha_confident',
    fallbackApplied: false,
    candidateDetections: {
      alpha_bbox: { confidence: 0.92, area: 476000 },
      white_bg_first_colored_pixel: null,
    },
    whitespace: {
      px: { left: 10, top: 10, right: 10, bottom: 10 },
      percent: { left: 0.01, top: 0.01, right: 0.01, bottom: 0.01 },
    },
    objectAreaPercent: 0.476,
    layout: ANALYSIS_LAYOUT,
    suggestedPlan: {
      outputWidth: 1000,
      outputHeight: 1000,
      targetObjectBounds: { left: 130, top: 150, width: 700, height: 680 },
      scale: 1.02,
      whitespace: {
        px: { left: 12, top: 12, right: 12, bottom: 12 },
        percent: { left: 0.012, top: 0.012, right: 0.012, bottom: 0.012 },
      },
    },
  },
  lifecycle: { state: 'analyzed', durationMs: 25 },
  pipelineVersion: 'test-v1',
});

const createState = (overrides?: Record<string, unknown>): GenerationToolbarState => {
  return {
    activeProjectId: 'project-alpha',
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
    toast: vi.fn(),
    queryClient: {
      setQueryData: vi.fn(),
    },
    maskAttachMode: 'client_canvas_polygon',
    upscaleMode: 'server_sharp',
    upscaleStrategy: 'scale',
    cropMode: 'server_bbox',
    centerMode: 'server_object_layout_v1',
    setCenterMode: vi.fn(),
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
    setAnalysisBusy: vi.fn(),
    setAnalysisStatus: vi.fn(),
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
    centerLayoutPayload: CENTER_LAYOUT_PAYLOAD,
    autoScaleLayoutPayload: AUTO_SCALE_LAYOUT_PAYLOAD,
    projectCanvasSize: null,
    getPreviewCanvasViewportCrop: () => null,
    getPreviewCanvasImageFrame: () => null,
    handleAiMaskGeneration: vi.fn(async () => {}),
    analysisPlanSnapshot: null,
    setAnalysisPlanSnapshot: vi.fn(),
    applyAnalysisLayoutToCenter: vi.fn(),
    applyAnalysisLayoutToAutoScaler: vi.fn(),
    analysisBusy: false,
    analysisStatus: 'idle',
    ...overrides,
  } as unknown as GenerationToolbarState;
};

beforeEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('useGenerationToolbarHandlers analysis layout integration', () => {
  it('runs server analysis from Object Layouting and syncs both tool controls', async () => {
    const state = createState();
    const response = createAnalysisResponse();
    const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce(response as never);

    const { result } = renderHook(() => useGenerationToolbarHandlers(state));
    await result.current.handleRunAnalysisFromCenter();

    expect(postSpy).toHaveBeenCalledWith(
      '/api/image-studio/slots/slot-1/analysis',
      expect.objectContaining({
        mode: 'server_analysis_v1',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        layout: expect.objectContaining(CENTER_LAYOUT_PAYLOAD),
      })
    );
    expect(state.setAnalysisBusy).toHaveBeenNthCalledWith(1, true);
    expect(state.setAnalysisStatus).toHaveBeenNthCalledWith(1, 'resolving');
    expect(state.setAnalysisStatus).toHaveBeenNthCalledWith(2, 'processing');
    expect(state.setAnalysisBusy).toHaveBeenLastCalledWith(false);
    expect(state.setAnalysisStatus).toHaveBeenLastCalledWith('idle');
    expect(state.applyAnalysisLayoutToCenter).toHaveBeenCalledWith(
      expect.objectContaining({
        paddingPercent: 12,
        splitAxes: true,
        detection: 'alpha_bbox',
      }),
      'manual'
    );
    expect(state.applyAnalysisLayoutToAutoScaler).toHaveBeenCalledWith(
      expect.objectContaining({
        paddingPercent: 12,
        splitAxes: true,
        detection: 'alpha_bbox',
      }),
      'manual'
    );
    const savedSnapshot = loadImageStudioAnalysisPlanSnapshot('project-alpha');
    expect(savedSnapshot?.slotId).toBe('slot-1');
    expect(savedSnapshot?.sourceSignature).toBe('sig_v1');
    expect(savedSnapshot?.layout.paddingPercent).toBe(12);
    expect(state.setAnalysisPlanSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        slotId: 'slot-1',
        sourceSignature: 'sig_v1',
      })
    );
  });

  it('runs server analysis from Auto Scaler using auto-scaler layout payload', async () => {
    const state = createState();
    const response = createAnalysisResponse();
    const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce(response as never);

    const { result } = renderHook(() => useGenerationToolbarHandlers(state));
    await result.current.handleRunAnalysisFromAutoScaler();

    expect(postSpy).toHaveBeenCalledWith(
      '/api/image-studio/slots/slot-1/analysis',
      expect.objectContaining({
        mode: 'server_analysis_v1',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        layout: expect.objectContaining(AUTO_SCALE_LAYOUT_PAYLOAD),
      })
    );
    expect(state.applyAnalysisLayoutToCenter).toHaveBeenCalledTimes(1);
    expect(state.applyAnalysisLayoutToAutoScaler).toHaveBeenCalledTimes(1);
  });

  it('switches client alpha mode to client object-layout mode during analysis sync', async () => {
    const state = createState({
      centerMode: 'client_alpha_bbox',
    });
    const response = createAnalysisResponse();
    vi.spyOn(api, 'post').mockResolvedValueOnce(response as never);

    const { result } = renderHook(() => useGenerationToolbarHandlers(state));
    await result.current.handleRunAnalysisFromCenter();

    expect(state.setCenterMode).toHaveBeenCalledWith('client_object_layout_v1');
  });

  it('switches server alpha mode to server object-layout mode during analysis sync', async () => {
    const state = createState({
      centerMode: 'server_alpha_bbox',
    });
    const response = createAnalysisResponse();
    vi.spyOn(api, 'post').mockResolvedValueOnce(response as never);

    const { result } = renderHook(() => useGenerationToolbarHandlers(state));
    await result.current.handleRunAnalysisFromCenter();

    expect(state.setCenterMode).toHaveBeenCalledWith('server_object_layout_v1');
  });

  it('preserves server family when analysis is triggered from Auto Scaler', async () => {
    const state = createState({
      centerMode: 'server_alpha_bbox',
    });
    const response = createAnalysisResponse();
    vi.spyOn(api, 'post').mockResolvedValueOnce(response as never);

    const { result } = renderHook(() => useGenerationToolbarHandlers(state));
    await result.current.handleRunAnalysisFromAutoScaler();

    expect(state.setCenterMode).toHaveBeenCalledWith('server_object_layout_v1');
  });

  it('does not change center mode when already using object-layout family', async () => {
    const state = createState({
      centerMode: 'client_object_layout_v1',
    });
    const response = createAnalysisResponse();
    vi.spyOn(api, 'post').mockResolvedValueOnce(response as never);

    const { result } = renderHook(() => useGenerationToolbarHandlers(state));
    await result.current.handleRunAnalysisFromCenter();

    expect(state.setCenterMode).not.toHaveBeenCalled();
  });

  it('preserves client_white_bg_bbox mode when analysis runs — does not switch to object layout', async () => {
    const state = createState({
      centerMode: 'client_white_bg_bbox',
    });
    const response = createAnalysisResponse();
    vi.spyOn(api, 'post').mockResolvedValueOnce(response as never);

    const { result } = renderHook(() => useGenerationToolbarHandlers(state));
    await result.current.handleRunAnalysisFromCenter();

    expect(state.setCenterMode).not.toHaveBeenCalled();
  });

  it('blocks run analysis when working source signature is missing', async () => {
    const state = createState({
      workingSourceSignature: '',
    });
    const postSpy = vi.spyOn(api, 'post');

    const { result } = renderHook(() => useGenerationToolbarHandlers(state));
    await result.current.handleRunAnalysisFromCenter();

    expect(postSpy).not.toHaveBeenCalled();
    expect(state.setAnalysisBusy).not.toHaveBeenCalled();
    expect(state.applyAnalysisLayoutToCenter).not.toHaveBeenCalled();
    expect(state.applyAnalysisLayoutToAutoScaler).not.toHaveBeenCalled();
    expect(state.toast).toHaveBeenCalledWith(
      'Unable to capture source signature for analysis. Reselect slot image and retry.',
      { variant: 'info' }
    );
  });

  it('shows error and does not sync controls when analysis request fails', async () => {
    const state = createState();
    vi.spyOn(api, 'post').mockRejectedValueOnce(new Error('analysis failed'));

    const { result } = renderHook(() => useGenerationToolbarHandlers(state));
    await result.current.handleRunAnalysisFromAutoScaler();

    expect(state.applyAnalysisLayoutToCenter).not.toHaveBeenCalled();
    expect(state.applyAnalysisLayoutToAutoScaler).not.toHaveBeenCalled();
    expect(state.setAnalysisPlanSnapshot).not.toHaveBeenCalled();
    expect(state.toast).toHaveBeenCalledWith('analysis failed', { variant: 'error' });
    expect(state.setAnalysisBusy).toHaveBeenLastCalledWith(false);
    expect(state.setAnalysisStatus).toHaveBeenLastCalledWith('idle');
  });
});
