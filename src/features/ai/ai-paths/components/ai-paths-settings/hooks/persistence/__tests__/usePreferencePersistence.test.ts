import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePreferencePersistence } from '../usePreferencePersistence';

const mockState = vi.hoisted(() => ({
  updateAiPathsSettingsBulk: vi.fn(),
  logClientError: vi.fn(),
  logClientCatch: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths', () => ({
  AI_PATHS_UI_STATE_KEY: 'ai-paths-ui-state',
}));

vi.mock('@/shared/lib/ai-paths/settings-store-client', () => ({
  updateAiPathsSettingsBulk: (...args: unknown[]) => mockState.updateAiPathsSettingsBulk(...args),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => mockState.logClientError(...args),
  logClientCatch: (...args: unknown[]) => mockState.logClientCatch(...args),
}));

const createCore = () => ({
  enqueueSettingsWrite: vi.fn(async <T,>(operation: () => Promise<T>) => await operation()),
  stringifyForStorage: vi.fn((value: unknown) => JSON.stringify(value)),
});

describe('usePreferencePersistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T16:00:00.000Z'));
    mockState.updateAiPathsSettingsBulk.mockReset().mockResolvedValue([]);
    mockState.logClientError.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('persists UI state and user preferences through queued settings writes', async () => {
    const core = createCore();
    const { result } = renderHook(() => usePreferencePersistence({} as never, core));

    await act(async () => {
      await result.current.persistUiState({
        activePathId: 'path-1',
        expandedGroups: ['group-a'],
        paletteCollapsed: true,
        pathTreeVisible: false,
      });
      await result.current.persistUserPreferences('path-2');
    });

    expect(core.enqueueSettingsWrite).toHaveBeenCalledTimes(2);
    expect(mockState.updateAiPathsSettingsBulk).toHaveBeenNthCalledWith(1, [
      {
        key: 'ai-paths-ui-state',
        value:
          '{"activePathId":"path-1","expandedGroups":["group-a"],"paletteCollapsed":true,"pathTreeVisible":false}',
      },
    ]);
    expect(mockState.updateAiPathsSettingsBulk).toHaveBeenNthCalledWith(2, [
      {
        key: 'user_preferences',
        value: '{"activePathId":"path-2","updatedAt":"2026-03-19T16:00:00.000Z"}',
      },
    ]);
    expect(result.current.lastUiStatePayloadRef.current).toBeNull();
    expect(result.current.lastUserPrefsActivePathIdRef.current).toBeNull();
  });

  it('logs and swallows persistActivePathPreference failures', async () => {
    const core = createCore();
    const failure = new Error('store offline');
    mockState.updateAiPathsSettingsBulk.mockRejectedValueOnce(failure);
    const { result } = renderHook(() => usePreferencePersistence({} as never, core));

    await act(async () => {
      await result.current.persistActivePathPreference('path-9');
    });

    expect(mockState.logClientCatch).toHaveBeenCalledWith(failure, {
      source: 'useAiPathsPersistence',
      action: 'persistActivePathPreference',
      pathId: 'path-9',
    });
  });

  it('resolves only fresh user preference records', () => {
    const core = createCore();
    const { result } = renderHook(() => usePreferencePersistence({} as never, core));

    const fresh = result.current.resolveUserPreferences([
      {
        key: 'user_preferences',
        value: '{"activePathId":"path-fresh","updatedAt":"2026-03-19T15:58:00.000Z"}',
      },
    ] as never);
    const stale = result.current.resolveUserPreferences([
      {
        key: 'user_preferences',
        value: '{"activePathId":"path-stale","updatedAt":"2026-03-19T15:40:00.000Z"}',
      },
    ] as never);
    const missing = result.current.resolveUserPreferences([]);

    expect(fresh).toEqual({
      activePathId: 'path-fresh',
      updatedAt: '2026-03-19T15:58:00.000Z',
    });
    expect(stale).toBeNull();
    expect(missing).toBeNull();
  });

  it('normalizes stored UI state payloads', () => {
    const core = createCore();
    const { result } = renderHook(() => usePreferencePersistence({} as never, core));

    const resolved = result.current.resolveUiState([
      {
        key: 'ai-paths-ui-state',
        value:
          '{"activePathId":" path-a ","expandedGroups":[" Ops ","Templates","Ops",""],"paletteCollapsed":true,"pathTreeVisible":false}',
      },
    ] as never);

    expect(resolved).toEqual({
      activePathId: 'path-a',
      expandedGroups: ['Ops', 'Templates'],
      paletteCollapsed: true,
      pathTreeVisible: false,
    });
  });

  it('returns null and logs when stored user preferences are invalid JSON', () => {
    const core = createCore();
    const { result } = renderHook(() => usePreferencePersistence({} as never, core));

    const resolved = result.current.resolveUserPreferences([
      {
        key: 'user_preferences',
        value: '{bad json',
      },
    ] as never);

    expect(resolved).toBeNull();
    expect(mockState.logClientError).toHaveBeenCalledTimes(1);
    expect(mockState.logClientError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });

  it('returns null and logs when stored UI state is invalid JSON', () => {
    const core = createCore();
    const { result } = renderHook(() => usePreferencePersistence({} as never, core));

    const resolved = result.current.resolveUiState([
      {
        key: 'ai-paths-ui-state',
        value: '{bad json',
      },
    ] as never);

    expect(resolved).toBeNull();
    expect(mockState.logClientError).toHaveBeenCalledTimes(1);
    expect(mockState.logClientError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });
});
