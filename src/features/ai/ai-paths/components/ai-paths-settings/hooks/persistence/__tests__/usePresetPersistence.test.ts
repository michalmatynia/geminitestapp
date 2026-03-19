import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePresetPersistence } from '../usePresetPersistence';

const mockState = vi.hoisted(() => ({
  updateAiPathsSettingsBulk: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths', () => ({
  CLUSTER_PRESETS_KEY: 'cluster-presets',
  DB_NODE_PRESETS_KEY: 'db-node-presets',
  DB_QUERY_PRESETS_KEY: 'db-query-presets',
}));

vi.mock('@/shared/lib/ai-paths/settings-store-client', () => ({
  updateAiPathsSettingsBulk: (...args: unknown[]) => mockState.updateAiPathsSettingsBulk(...args),
}));

const createCore = () => ({
  enqueueSettingsWrite: vi.fn(async <T,>(operation: () => Promise<T>) => await operation()),
  stringifyForStorage: vi.fn((value: unknown) => JSON.stringify(value)),
});

describe('usePresetPersistence', () => {
  beforeEach(() => {
    mockState.updateAiPathsSettingsBulk.mockReset().mockResolvedValue(undefined);
  });

  it('persists arbitrary settings payloads through the queued bulk writer', async () => {
    const core = createCore();
    const payload = [{ key: 'custom-key', value: '{"ok":true}' }];
    const { result } = renderHook(() => usePresetPersistence({}, core));

    await act(async () => {
      await result.current.persistSettingsBulk(payload as never);
    });

    expect(core.enqueueSettingsWrite).toHaveBeenCalledTimes(1);
    expect(mockState.updateAiPathsSettingsBulk).toHaveBeenCalledWith(payload);
  });

  it('serializes and saves cluster presets', async () => {
    const core = createCore();
    const presets = [{ id: 'cluster-1', name: 'Cluster One' }];
    const { result } = renderHook(() => usePresetPersistence({}, core));

    await act(async () => {
      await result.current.saveClusterPresets(presets as never);
    });

    expect(core.stringifyForStorage).toHaveBeenCalledWith(presets, 'cluster presets');
    expect(mockState.updateAiPathsSettingsBulk).toHaveBeenCalledWith([
      { key: 'cluster-presets', value: JSON.stringify(presets) },
    ]);
  });

  it('serializes and saves DB query presets and DB node presets', async () => {
    const core = createCore();
    const queryPresets = [{ id: 'query-1', label: 'Query One' }];
    const nodePresets = [{ id: 'node-1', label: 'Node One' }];
    const { result } = renderHook(() => usePresetPersistence({}, core));

    await act(async () => {
      await result.current.saveDbQueryPresets(queryPresets as never);
      await result.current.saveDbNodePresets(nodePresets as never);
    });

    expect(core.stringifyForStorage).toHaveBeenNthCalledWith(1, queryPresets, 'DB query presets');
    expect(core.stringifyForStorage).toHaveBeenNthCalledWith(2, nodePresets, 'DB node presets');
    expect(mockState.updateAiPathsSettingsBulk).toHaveBeenNthCalledWith(1, [
      { key: 'db-query-presets', value: JSON.stringify(queryPresets) },
    ]);
    expect(mockState.updateAiPathsSettingsBulk).toHaveBeenNthCalledWith(2, [
      { key: 'db-node-presets', value: JSON.stringify(nodePresets) },
    ]);
  });
});
