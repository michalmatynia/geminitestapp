import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  loadImageStudioAnalysisApplyIntent,
  saveImageStudioAnalysisApplyIntent,
  saveImageStudioAnalysisPlanSnapshot,
} from '@/features/ai/image-studio/utils/analysis-bridge';

import { useGenerationToolbarEffects } from '../useGenerationToolbarEffects';

const BASE_LAYOUT = {
  paddingPercent: 8,
  paddingXPercent: 8,
  paddingYPercent: 8,
  splitAxes: false,
  fillMissingCanvasWhite: false,
  targetCanvasWidth: null,
  targetCanvasHeight: null,
  whiteThreshold: 16,
  chromaThreshold: 10,
  shadowPolicy: 'auto',
  detection: 'auto',
} as const;

const createState = (overrides?: Record<string, unknown>) => ({
  activeProjectId: 'project-alpha',
  centerLayoutDetection: 'auto',
  centerLayoutShadowPolicy: 'auto',
  centerLayoutWhiteThresholdValue: 16,
  centerLayoutChromaThresholdValue: 10,
  skipCenterAdvancedDefaultsSaveRef: { current: true },
  setAnalysisPlanSnapshot: vi.fn(),
  slots: [{ id: 'slot-1' }, { id: 'slot-2' }],
  slotSelectionLocked: false,
  workingSlot: { id: 'slot-1' },
  setSelectedSlotId: vi.fn(),
  setWorkingSlotId: vi.fn(),
  centerMode: 'server_object_layout_v1',
  setCenterMode: vi.fn(),
  toast: vi.fn(),
  workingSourceSignature: 'signature_slot_1_v1',
  applyAnalysisLayoutToCenter: vi.fn(),
  applyAnalysisLayoutToAutoScaler: vi.fn(),
  lastConsumedAnalysisIntentRef: { current: null },
  queuedAnalysisRunTarget: null,
  setQueuedAnalysisRunTarget: vi.fn(),
  centerBusy: false,
  centerRequestInFlightRef: { current: false },
  autoScaleBusy: false,
  autoScaleRequestInFlightRef: { current: false },
  ...(overrides ?? {}),
});

const createActions = () => ({
  handleCenterObject: vi.fn(async () => {}),
  handleAutoScale: vi.fn(async () => {}),
});

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('useGenerationToolbarEffects analysis bridge', () => {
  it('hydrates persisted analysis snapshot into toolbar state', async () => {
    saveImageStudioAnalysisPlanSnapshot('project-alpha', {
      slotId: 'slot-1',
      sourceSignature: 'signature_slot_1_v1',
      savedAt: '2026-02-26T10:00:00.000Z',
      layout: BASE_LAYOUT,
      effectiveMode: 'server_analysis_v1',
      authoritativeSource: 'source_slot',
      detectionUsed: 'alpha_bbox',
      confidence: 0.92,
      policyVersion: 'policy_v2',
      policyReason: 'alpha_confident',
      fallbackApplied: false,
    });

    const state = createState();
    const actions = createActions();
    renderHook(() => useGenerationToolbarEffects(state as any, actions));

    await waitFor(() => {
      expect(state.setAnalysisPlanSnapshot).toHaveBeenCalled();
    });
    const snapshotArg = state.setAnalysisPlanSnapshot.mock.calls.at(-1)?.[0];
    expect(snapshotArg?.slotId).toBe('slot-1');
    expect(snapshotArg?.sourceSignature).toBe('signature_slot_1_v1');
  });

  it('consumes matching object layout intent, auto-runs, and clears intent', async () => {
    saveImageStudioAnalysisApplyIntent('project-alpha', {
      slotId: 'slot-1',
      sourceSignature: 'signature_slot_1_v1',
      target: 'object_layout',
      runAfterApply: true,
      layout: BASE_LAYOUT,
    });

    const state = createState();
    const actions = createActions();
    renderHook(() => useGenerationToolbarEffects(state as any, actions));

    await waitFor(() => {
      expect(state.applyAnalysisLayoutToCenter).toHaveBeenCalledWith(
        expect.objectContaining({ paddingPercent: 8 }),
        'auto'
      );
    });
    expect(state.applyAnalysisLayoutToAutoScaler).not.toHaveBeenCalled();
    expect(loadImageStudioAnalysisApplyIntent('project-alpha')).toBeNull();
  });

  it('coerces object-layout intent to object-layout center mode family before apply', async () => {
    saveImageStudioAnalysisApplyIntent('project-alpha', {
      slotId: 'slot-1',
      sourceSignature: 'signature_slot_1_v1',
      target: 'object_layout',
      runAfterApply: false,
      layout: BASE_LAYOUT,
    });

    const state = createState({
      centerMode: 'client_alpha_bbox',
    });
    const actions = createActions();
    renderHook(() => useGenerationToolbarEffects(state as any, actions));

    await waitFor(() => {
      expect(state.applyAnalysisLayoutToCenter).toHaveBeenCalledWith(
        expect.objectContaining({ paddingPercent: 8 }),
        'manual'
      );
    });
    expect(state.setCenterMode).toHaveBeenCalledWith('client_object_layout_v1');
  });

  it('switches to analyzed slot first when intent slot differs from working slot', async () => {
    saveImageStudioAnalysisApplyIntent('project-alpha', {
      slotId: 'slot-2',
      sourceSignature: 'signature_slot_2_v1',
      target: 'object_layout',
      runAfterApply: false,
      layout: BASE_LAYOUT,
    });

    const state = createState({
      workingSlot: { id: 'slot-1' },
    });
    const actions = createActions();
    renderHook(() => useGenerationToolbarEffects(state as any, actions));

    await waitFor(() => {
      expect(state.setSelectedSlotId).toHaveBeenCalledWith('slot-2');
      expect(state.setWorkingSlotId).toHaveBeenCalledWith('slot-2');
    });
    expect(state.applyAnalysisLayoutToCenter).not.toHaveBeenCalled();
    expect(state.applyAnalysisLayoutToAutoScaler).not.toHaveBeenCalled();
    expect(loadImageStudioAnalysisApplyIntent('project-alpha')).not.toBeNull();
  });

  it('clears intent and toasts when slot selection is locked', async () => {
    saveImageStudioAnalysisApplyIntent('project-alpha', {
      slotId: 'slot-1',
      sourceSignature: 'signature_slot_1_v1',
      target: 'object_layout',
      runAfterApply: false,
      layout: BASE_LAYOUT,
    });

    const state = createState({
      slotSelectionLocked: true,
    });
    const actions = createActions();
    renderHook(() => useGenerationToolbarEffects(state as any, actions));

    await waitFor(() => {
      expect(state.toast).toHaveBeenCalledWith('Cannot apply while slot selection is locked.', {
        variant: 'info',
      });
    });
    expect(loadImageStudioAnalysisApplyIntent('project-alpha')).toBeNull();
    expect(state.applyAnalysisLayoutToCenter).not.toHaveBeenCalled();
    expect(state.applyAnalysisLayoutToAutoScaler).not.toHaveBeenCalled();
  });

  it('clears intent and toasts when analyzed slot no longer exists', async () => {
    saveImageStudioAnalysisApplyIntent('project-alpha', {
      slotId: 'slot-missing',
      sourceSignature: 'signature_slot_missing',
      target: 'auto_scaler',
      runAfterApply: false,
      layout: BASE_LAYOUT,
    });

    const state = createState({
      slots: [{ id: 'slot-1' }],
    });
    const actions = createActions();
    renderHook(() => useGenerationToolbarEffects(state as any, actions));

    await waitFor(() => {
      expect(state.toast).toHaveBeenCalledWith('Analyzed slot no longer exists.', {
        variant: 'info',
      });
    });
    expect(loadImageStudioAnalysisApplyIntent('project-alpha')).toBeNull();
    expect(state.applyAnalysisLayoutToCenter).not.toHaveBeenCalled();
    expect(state.applyAnalysisLayoutToAutoScaler).not.toHaveBeenCalled();
  });

  it('clears intent and toasts when signature is stale after slot alignment', async () => {
    saveImageStudioAnalysisApplyIntent('project-alpha', {
      slotId: 'slot-1',
      sourceSignature: 'signature_slot_1_old',
      target: 'auto_scaler',
      runAfterApply: false,
      layout: BASE_LAYOUT,
    });

    const state = createState({
      workingSourceSignature: 'signature_slot_1_new',
    });
    const actions = createActions();
    renderHook(() => useGenerationToolbarEffects(state as any, actions));

    await waitFor(() => {
      expect(state.toast).toHaveBeenCalledWith(
        'Analysis plan is stale for this slot image. Run analysis again.',
        { variant: 'info' }
      );
    });
    expect(loadImageStudioAnalysisApplyIntent('project-alpha')).toBeNull();
    expect(state.applyAnalysisLayoutToCenter).not.toHaveBeenCalled();
    expect(state.applyAnalysisLayoutToAutoScaler).not.toHaveBeenCalled();
  });

  it('clears intent and toasts when working source metadata is missing', async () => {
    saveImageStudioAnalysisApplyIntent('project-alpha', {
      slotId: 'slot-1',
      sourceSignature: 'signature_slot_1_v1',
      target: 'object_layout',
      runAfterApply: false,
      layout: BASE_LAYOUT,
    });

    const state = createState({
      workingSourceSignature: '',
    });
    const actions = createActions();
    renderHook(() => useGenerationToolbarEffects(state as any, actions));

    await waitFor(() => {
      expect(state.toast).toHaveBeenCalledWith(
        'Working slot source metadata is missing. Reselect slot image and retry.',
        { variant: 'info' }
      );
    });
    expect(loadImageStudioAnalysisApplyIntent('project-alpha')).toBeNull();
    expect(state.applyAnalysisLayoutToCenter).not.toHaveBeenCalled();
    expect(state.applyAnalysisLayoutToAutoScaler).not.toHaveBeenCalled();
  });

  it('consumes matching auto scaler intent in manual mode and clears intent', async () => {
    saveImageStudioAnalysisApplyIntent('project-alpha', {
      slotId: 'slot-1',
      sourceSignature: 'signature_slot_1_v1',
      target: 'auto_scaler',
      runAfterApply: false,
      layout: BASE_LAYOUT,
    });

    const state = createState();
    const actions = createActions();
    renderHook(() => useGenerationToolbarEffects(state as any, actions));

    await waitFor(() => {
      expect(state.applyAnalysisLayoutToAutoScaler).toHaveBeenCalledWith(
        expect.objectContaining({ paddingPercent: 8 }),
        'manual'
      );
    });
    expect(state.applyAnalysisLayoutToCenter).not.toHaveBeenCalled();
    expect(loadImageStudioAnalysisApplyIntent('project-alpha')).toBeNull();
  });

  it('consumes matching auto scaler intent in auto mode and clears intent', async () => {
    saveImageStudioAnalysisApplyIntent('project-alpha', {
      slotId: 'slot-1',
      sourceSignature: 'signature_slot_1_v1',
      target: 'auto_scaler',
      runAfterApply: true,
      layout: BASE_LAYOUT,
    });

    const state = createState();
    const actions = createActions();
    renderHook(() => useGenerationToolbarEffects(state as any, actions));

    await waitFor(() => {
      expect(state.applyAnalysisLayoutToAutoScaler).toHaveBeenCalledWith(
        expect.objectContaining({ paddingPercent: 8 }),
        'auto'
      );
    });
    expect(state.applyAnalysisLayoutToCenter).not.toHaveBeenCalled();
    expect(loadImageStudioAnalysisApplyIntent('project-alpha')).toBeNull();
  });

  it('coerces center mode before queued object-layout auto-run and defers run', async () => {
    const state = createState({
      centerMode: 'client_alpha_bbox',
      queuedAnalysisRunTarget: 'object_layout',
    });
    const actions = createActions();
    renderHook(() => useGenerationToolbarEffects(state as any, actions));

    await waitFor(() => {
      expect(state.setCenterMode).toHaveBeenCalledWith('client_object_layout_v1');
    });
    expect(actions.handleCenterObject).not.toHaveBeenCalled();
    expect(state.setQueuedAnalysisRunTarget).not.toHaveBeenCalled();
  });

  it('runs queued object-layout auto-run after center mode is coerced', async () => {
    const state = createState({
      centerMode: 'client_alpha_bbox',
      queuedAnalysisRunTarget: 'object_layout',
    });
    const actions = createActions();
    const { rerender } = renderHook(() => useGenerationToolbarEffects(state as any, actions));

    await waitFor(() => {
      expect(state.setCenterMode).toHaveBeenCalledWith('client_object_layout_v1');
    });
    expect(actions.handleCenterObject).not.toHaveBeenCalled();

    state.centerMode = 'client_object_layout_v1';
    rerender();

    await waitFor(() => {
      expect(actions.handleCenterObject).toHaveBeenCalledTimes(1);
    });
    expect(state.setQueuedAnalysisRunTarget).toHaveBeenCalledWith(null);
  });
});
