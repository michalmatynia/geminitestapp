import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePresetsImport } from './usePresetsImport';

const mockState = vi.hoisted(() => ({
  toast: vi.fn(),
  confirm: vi.fn(),
  ConfirmationModal: vi.fn(() => null),
  updateAiPathsSetting: vi.fn(),
  reportAiPathsError: vi.fn(),
  logClientError: vi.fn(),
  createPresetId: vi.fn(() => 'preset-generated'),
  presetsState: {
    clusterPresets: [] as Array<Record<string, unknown>>,
    presetsJson: '',
  },
  presetsActions: {
    normalizeClusterPreset: vi.fn(),
    setClusterPresets: vi.fn(),
  },
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({ toast: mockState.toast }),
}));

vi.mock('@/shared/hooks/ui/useConfirm', () => ({
  useConfirm: () => ({
    confirm: mockState.confirm,
    ConfirmationModal: mockState.ConfirmationModal,
  }),
}));

vi.mock('@/shared/lib/ai-paths', () => ({
  CLUSTER_PRESETS_KEY: 'cluster-presets',
  createPresetId: () => mockState.createPresetId(),
}));

vi.mock('@/shared/lib/ai-paths/settings-store-client', () => ({
  updateAiPathsSetting: (...args: unknown[]) => mockState.updateAiPathsSetting(...args),
}));

vi.mock('../../context', () => ({
  usePresetsState: () => mockState.presetsState,
  usePresetsActions: () => mockState.presetsActions,
}));

vi.mock('../ai-paths-settings/hooks/useAiPathsErrorState', () => ({
  useAiPathsErrorState: () => ({
    reportAiPathsError: mockState.reportAiPathsError,
  }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => mockState.logClientError(...args),
}));

describe('usePresetsImport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-22T12:30:00.000Z'));

    mockState.toast.mockReset();
    mockState.confirm.mockReset();
    mockState.updateAiPathsSetting.mockReset().mockResolvedValue(undefined);
    mockState.reportAiPathsError.mockReset();
    mockState.logClientError.mockReset();
    mockState.createPresetId.mockClear();
    mockState.presetsState.clusterPresets = [];
    mockState.presetsState.presetsJson = '';
    mockState.presetsActions.normalizeClusterPreset.mockReset();
    mockState.presetsActions.setClusterPresets.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects empty preset JSON before attempting an import', async () => {
    mockState.presetsState.presetsJson = '   ';

    const { result } = renderHook(() => usePresetsImport());

    await act(async () => {
      await result.current.handleImportPresets('merge');
    });

    expect(result.current.ConfirmationModal).toBe(mockState.ConfirmationModal);
    expect(mockState.toast).toHaveBeenCalledWith('Paste presets JSON to import.', {
      variant: 'error',
    });
    expect(mockState.updateAiPathsSetting).not.toHaveBeenCalled();
    expect(mockState.confirm).not.toHaveBeenCalled();
  });

  it('merges imported presets, regenerates duplicate ids, and persists the result', async () => {
    mockState.presetsState.clusterPresets = [
      {
        id: 'preset-1',
        name: 'Existing preset',
        updatedAt: '2026-03-20T10:00:00.000Z',
      },
    ];
    mockState.presetsState.presetsJson = JSON.stringify([
      { id: 'preset-1', name: 'Imported duplicate' },
      { id: 'preset-2', name: 'Imported fresh' },
    ]);
    mockState.presetsActions.normalizeClusterPreset.mockImplementation(
      (item: Record<string, unknown>) => ({
        createdAt: '2026-03-22T12:00:00.000Z',
        updatedAt: '2026-03-22T12:00:00.000Z',
        ...item,
      }),
    );

    const { result } = renderHook(() => usePresetsImport());

    await act(async () => {
      await result.current.handleImportPresets('merge');
    });

    expect(mockState.createPresetId).toHaveBeenCalledTimes(1);
    const nextPresets = mockState.presetsActions.setClusterPresets.mock.calls[0]?.[0] as
      | Array<Record<string, unknown>>
      | undefined;
    expect(nextPresets).toEqual([
      {
        id: 'preset-1',
        name: 'Existing preset',
        updatedAt: '2026-03-20T10:00:00.000Z',
      },
      {
        id: 'preset-generated',
        name: 'Imported duplicate',
        createdAt: '2026-03-22T12:00:00.000Z',
        updatedAt: '2026-03-22T12:30:00.000Z',
      },
      {
        id: 'preset-2',
        name: 'Imported fresh',
        createdAt: '2026-03-22T12:00:00.000Z',
        updatedAt: '2026-03-22T12:00:00.000Z',
      },
    ]);
    expect(mockState.updateAiPathsSetting).toHaveBeenCalledWith(
      'cluster-presets',
      JSON.stringify(nextPresets),
    );
    expect(mockState.toast).toHaveBeenCalledWith('Presets imported.', {
      variant: 'success',
    });
  });

  it('routes replace imports through confirmation and reports malformed wrapped preset payloads', async () => {
    mockState.presetsState.presetsJson = JSON.stringify({ presets: { broken: true } });

    const { result } = renderHook(() => usePresetsImport());

    await act(async () => {
      await result.current.handleImportPresets('replace');
    });

    expect(mockState.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Replace Presets?',
        confirmText: 'Replace All',
        isDangerous: true,
      }),
    );

    const onConfirm = mockState.confirm.mock.calls[0]?.[0]?.onConfirm as
      | (() => Promise<void>)
      | undefined;

    await act(async () => {
      await onConfirm?.();
    });

    expect(mockState.presetsActions.setClusterPresets).not.toHaveBeenCalled();
    expect(mockState.toast).toHaveBeenCalledWith(
      'Failed to import presets. Check JSON format.',
      { variant: 'error' },
    );
    expect(mockState.logClientError).toHaveBeenCalledTimes(1);
    expect(mockState.reportAiPathsError).toHaveBeenCalledWith(
      expect.any(TypeError),
      { action: 'importPresets' },
      'Failed to import presets:',
    );
    expect(mockState.updateAiPathsSetting).not.toHaveBeenCalled();
  });
});
