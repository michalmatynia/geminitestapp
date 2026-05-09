/**
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProductStudioRunEffects } from './ProductStudioContext.effects';
import type { ProductStudioLoadedState, ProductStudioRunState } from './ProductStudioContext.types';

const buildRunState = (
  overrides: Partial<ProductStudioRunState> = {}
): ProductStudioRunState => ({
  activeRunBaselineVariantIds: ['baseline-1'],
  activeRunId: 'run-1',
  pendingExpectedOutputs: 1,
  runStatus: 'running',
  setActiveRunBaselineVariantIds: vi.fn(),
  setActiveRunId: vi.fn(),
  setPendingExpectedOutputs: vi.fn(),
  setRunStatus: vi.fn(),
  ...overrides,
});

const buildLoadedState = (
  overrides: Partial<ProductStudioLoadedState> = {}
): ProductStudioLoadedState => ({
  auditState: {
    auditEntries: [],
    auditError: null,
    auditLoading: false,
    refreshAudit: vi.fn().mockResolvedValue(undefined),
  },
  derivedState: {
    blockSendForSequenceReadiness: false,
    canCompareWithSource: false,
    pendingVariantPlaceholderCount: 1,
    registrySource: null,
    selectedSourcePreview: null,
    selectedVariant: null,
    sequenceReadinessMessage: null,
    sourceImageSrc: null,
    variantImageSrc: null,
    variants: [],
  },
  variantsState: {
    refreshVariants: vi.fn().mockResolvedValue(null),
    selectedVariantSlotId: null,
    setSelectedVariantSlotId: vi.fn(),
    setStudioActionError: vi.fn(),
    studioActionError: null,
    variantsData: {
      activeRun: {
        baselineVariantIds: ['baseline-1'],
        dispatchedAt: new Date().toISOString(),
        errorMessage: 'Invalid payload',
        pendingExpectedOutputs: 1,
        runId: 'run-1',
        runKind: 'generation',
        runStatus: 'failed',
        sequenceRunId: null,
      },
      variants: [],
    } as never,
    variantsLoading: false,
  },
  ...overrides,
});

describe('useProductStudioRunEffects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears local pending state when the variants response reports a failed active run', async () => {
    const loaded = buildLoadedState();
    const runState = buildRunState();

    const { unmount } = renderHook(() =>
      useProductStudioRunEffects(loaded, runState, 'product-1', 0)
    );

    await waitFor(() => {
      expect(runState.setRunStatus).toHaveBeenCalledWith(null);
    });

    expect(runState.setActiveRunId).toHaveBeenCalledWith(null);
    expect(runState.setPendingExpectedOutputs).toHaveBeenCalledWith(0);
    expect(runState.setActiveRunBaselineVariantIds).toHaveBeenCalledWith([]);
    expect(loaded.variantsState.setStudioActionError).toHaveBeenCalledWith(
      'Studio generation failed: Invalid payload'
    );
    expect(loaded.auditState.refreshAudit).toHaveBeenCalled();

    unmount();
  });

  it('does not restore a stale queued server active run after the UI timeout window', async () => {
    const loaded = buildLoadedState({
      derivedState: {
        ...buildLoadedState().derivedState,
        pendingVariantPlaceholderCount: 0,
      },
      variantsState: {
        ...buildLoadedState().variantsState,
        variantsData: {
          activeRun: {
            baselineVariantIds: ['baseline-1'],
            dispatchedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
            errorMessage: null,
            pendingExpectedOutputs: 1,
            runId: 'run-1',
            runKind: 'generation',
            runStatus: 'queued',
            sequenceRunId: null,
          },
          variants: [],
        } as never,
      },
    });
    const runState = buildRunState({
      activeRunBaselineVariantIds: [],
      activeRunId: null,
      pendingExpectedOutputs: 0,
      runStatus: null,
    });

    const { unmount } = renderHook(() =>
      useProductStudioRunEffects(loaded, runState, 'product-1', 0)
    );

    await waitFor(() => {
      expect(runState.setActiveRunId).not.toHaveBeenCalled();
    });

    unmount();
  });
});
