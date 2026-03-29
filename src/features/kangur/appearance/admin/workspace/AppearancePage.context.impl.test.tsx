/**
 * @vitest-environment jsdom
 */

import React, { type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  toastMock,
  mutateAsyncMock,
  fetchSettingValueMock,
  captureExceptionMock,
  settingsStoreMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
  fetchSettingValueMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  settingsStoreMock: {
    get: vi.fn(),
    isLoading: false,
    isFetching: false,
    error: null as Error | null,
  },
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'pl',
}));

vi.mock('@/features/kangur/shared/ui', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSetting: () => ({
    mutateAsync: mutateAsyncMock,
  }),
}));

vi.mock('@/features/kangur/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/shared/api/settings-client', () => ({
  fetchSettingValue: (...args: unknown[]) => fetchSettingValueMock(...args),
}));

vi.mock('@/features/kangur/shared/utils/observability/error-system-client', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => captureExceptionMock(...args),
  },
}));

vi.mock('@/features/kangur/observability/client', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/kangur/observability/client')>();
  return {
    ...actual,
    withKangurClientError: async <T,>(
      _report: unknown,
      action: () => Promise<T>,
      options: {
        fallback: T | (() => T);
        onError?: (error: unknown) => void;
      }
    ): Promise<T> => {
      try {
        return await action();
      } catch (error) {
        options.onError?.(error);
        return typeof options.fallback === 'function'
          ? (options.fallback as () => T)()
          : options.fallback;
      }
    },
  };
});

import {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_DAWN_THEME_SETTINGS_KEY,
  KANGUR_DEFAULT_DAILY_THEME,
  KANGUR_DEFAULT_DAWN_THEME,
  KANGUR_FACTORY_DAWN_THEME,
  KANGUR_SUNSET_THEME_SETTINGS_KEY,
  KANGUR_THEME_CATALOG_KEY,
} from '@/features/kangur/appearance/theme-settings';
import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';
import {
  AppearancePageProvider,
  useAppearancePage,
  useAppearancePageActions,
  useAppearancePageState,
} from './AppearancePage.context.impl';
import {
  BUILTIN_DAILY_ID,
  BUILTIN_DAWN_ID,
  KANGUR_SLOT_ASSIGNMENTS_KEY,
} from './AppearancePage.constants';
import { KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY } from '@/features/kangur/appearance/storefront-appearance-settings';

let settingsMap = new Map<string, string | null | undefined>();
let confirmMock: ReturnType<typeof vi.fn>;

const buildThemeEntry = (id: string, name: string, color: string) => ({
  id,
  name,
  settings: {
    ...KANGUR_DEFAULT_DAILY_THEME,
    primaryColor: color,
    themePreset: id,
  },
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-18T10:00:00.000Z',
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <AppearancePageProvider>{children}</AppearancePageProvider>
);

const setSetting = (key: string, value: string | null | undefined) => {
  settingsMap.set(key, value);
};

describe('AppearancePage.context.impl', () => {
  beforeEach(() => {
    settingsMap = new Map();
    settingsStoreMock.isLoading = false;
    settingsStoreMock.isFetching = false;
    settingsStoreMock.error = null;
    settingsStoreMock.get.mockImplementation((key: string) => settingsMap.get(key) ?? null);
    mutateAsyncMock.mockReset();
    mutateAsyncMock.mockImplementation(async ({ key, value }: { key: string; value: string }) => {
      settingsMap.set(key, value);
      return {};
    });
    fetchSettingValueMock.mockReset();
    fetchSettingValueMock.mockResolvedValue(null);
    toastMock.mockReset();
    captureExceptionMock.mockReset();
    confirmMock = vi.fn(() => true);
    vi.stubGlobal('confirm', confirmMock);
  });

  it('throws when consumed outside the provider', () => {
    expect(() => renderHook(() => useAppearancePage())).toThrow(
      'useAppearancePage must be used within an AppearancePageProvider'
    );
    expect(() => renderHook(() => useAppearancePageState())).toThrow(
      'useAppearancePageState must be used within an AppearancePageProvider'
    );
    expect(() => renderHook(() => useAppearancePageActions())).toThrow(
      'useAppearancePageActions must be used within an AppearancePageProvider'
    );
  });

  it('exposes split state and actions contexts and refreshes the catalog from a bypassed fetch', async () => {
    const staleCatalog = JSON.stringify([buildThemeEntry('theme-stale', 'Stale theme', '#113355')]);
    const freshCatalog = JSON.stringify([buildThemeEntry('theme-fresh', 'Fresh theme', '#225588')]);

    setSetting(KANGUR_THEME_CATALOG_KEY, staleCatalog);
    setSetting(
      KANGUR_SLOT_ASSIGNMENTS_KEY,
      JSON.stringify({
        daily: null,
        dawn: null,
        sunset: { id: 'theme-fresh', name: 'Legacy label' },
        nightly: null,
      })
    );
    setSetting(
      KANGUR_SUNSET_THEME_SETTINGS_KEY,
      serializeSetting({
        ...KANGUR_DEFAULT_DAILY_THEME,
        primaryColor: '#101010',
      })
    );
    fetchSettingValueMock.mockResolvedValueOnce(freshCatalog);

    const { result } = renderHook(
      () => ({
        state: useAppearancePageState(),
        actions: useAppearancePageActions(),
      }),
      { wrapper }
    );

    expect(result.current.state.settingsReady).toBe(true);

    await waitFor(() => {
      expect(result.current.state.catalog.map((entry) => entry.id)).toEqual(['theme-fresh']);
    });

    expect(fetchSettingValueMock).toHaveBeenCalledWith({
      key: KANGUR_THEME_CATALOG_KEY,
      bypassCache: true,
      scope: 'light',
    });
    expect(result.current.state.slotLabelsByKey.sunset).toBe('Fresh theme');

    act(() => {
      result.current.actions.updateCatalog(
        JSON.stringify([buildThemeEntry('theme-manual', 'Manual theme', '#4466aa')])
      );
    });

    expect(result.current.state.catalog.map((entry) => entry.id)).toEqual(['theme-manual']);
  });

  it('captures catalog refresh failures', async () => {
    setSetting(
      KANGUR_THEME_CATALOG_KEY,
      JSON.stringify([buildThemeEntry('theme-stale', 'Stale theme', '#113355')])
    );
    fetchSettingValueMock.mockRejectedValueOnce(new Error('catalog offline'));

    renderHook(() => useAppearancePageState(), { wrapper });

    await waitFor(() => {
      expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    });
  });

  it('saves the default appearance mode and no-ops when the selection stays the same', async () => {
    setSetting(KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY, 'default');

    const { result } = renderHook(() => useAppearancePage(), { wrapper });

    await act(async () => {
      await result.current.handleDefaultModeChange('sunset');
    });

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      key: KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
      value: 'sunset',
    });
    expect(result.current.defaultModeDraft).toBe('sunset');
    expect(toastMock).toHaveBeenCalledWith(expect.any(String), { variant: 'success' });

    mutateAsyncMock.mockClear();

    await act(async () => {
      await result.current.handleDefaultModeChange('sunset');
    });

    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('restores the stored default mode after a failed default-mode save', async () => {
    setSetting(KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY, 'default');
    mutateAsyncMock.mockRejectedValueOnce(new Error('default mode failed'));

    const { result } = renderHook(() => useAppearancePage(), { wrapper });

    await act(async () => {
      await result.current.handleDefaultModeChange('dark');
    });

    expect(result.current.defaultModeDraft).toBe('default');
    expect(result.current.isDefaultModeSaving).toBe(false);
    expect(toastMock).toHaveBeenCalledWith('default mode failed', { variant: 'error' });
  });

  it('guards dirty theme selection changes and resets the selected slot to its factory preset', () => {
    setSetting(
      KANGUR_DAWN_THEME_SETTINGS_KEY,
      serializeSetting({
        ...KANGUR_DEFAULT_DAWN_THEME,
        primaryColor: '#abcdef',
      })
    );

    const { result } = renderHook(() => useAppearancePage(), { wrapper });

    act(() => {
      result.current.setDraft((prev) => ({
        ...prev,
        primaryColor: '#123456',
      }));
    });

    expect(result.current.isDirty).toBe(true);

    confirmMock.mockReturnValueOnce(false);
    act(() => {
      result.current.handleSelect(BUILTIN_DAWN_ID);
    });

    expect(result.current.selectedId).toBe(BUILTIN_DAILY_ID);
    expect(result.current.draft.primaryColor).toBe('#123456');

    confirmMock.mockReturnValueOnce(true);
    act(() => {
      result.current.handleSelect(BUILTIN_DAWN_ID);
    });

    expect(result.current.selectedId).toBe(BUILTIN_DAWN_ID);
    expect(result.current.draft.primaryColor).toBe('#abcdef');
    expect(result.current.isDirty).toBe(false);

    act(() => {
      result.current.handleResetToFactory();
    });

    expect(result.current.draft).toEqual(KANGUR_FACTORY_DAWN_THEME);
    expect(result.current.isDirty).toBe(true);
  });

  it('assigns and unassigns slots using the selected theme metadata', async () => {
    setSetting(
      KANGUR_THEME_CATALOG_KEY,
      JSON.stringify([buildThemeEntry('theme-custom', 'Custom theme', '#f59e0b')])
    );

    const { result } = renderHook(() => useAppearancePage(), { wrapper });

    act(() => {
      result.current.handleSelect('theme-custom');
    });

    mutateAsyncMock.mockClear();
    toastMock.mockClear();

    await act(async () => {
      await result.current.handleAssignToSlot('sunset');
    });

    expect(mutateAsyncMock).toHaveBeenNthCalledWith(1, {
      key: KANGUR_SUNSET_THEME_SETTINGS_KEY,
      value: serializeSetting(result.current.draft),
    });
    expect(JSON.parse(mutateAsyncMock.mock.calls[1]?.[0]?.value)).toMatchObject({
      sunset: { id: 'theme-custom', name: 'Custom theme' },
    });
    expect(toastMock).toHaveBeenCalledWith(expect.any(String), { variant: 'success' });

    mutateAsyncMock.mockClear();
    toastMock.mockClear();

    await act(async () => {
      await result.current.handleUnassignFromSlot('sunset');
    });

    expect(mutateAsyncMock).toHaveBeenNthCalledWith(1, {
      key: KANGUR_SUNSET_THEME_SETTINGS_KEY,
      value: '',
    });
    expect(JSON.parse(mutateAsyncMock.mock.calls[1]?.[0]?.value)).toMatchObject({
      sunset: null,
    });
    expect(toastMock).toHaveBeenCalledWith(expect.any(String), { variant: 'success' });
  });

  it('surfaces assign and unassign failures through the toast handler', async () => {
    mutateAsyncMock.mockRejectedValueOnce(new Error('assign failed'));
    mutateAsyncMock.mockRejectedValueOnce(new Error('unassign failed'));

    const { result } = renderHook(() => useAppearancePage(), { wrapper });

    await act(async () => {
      await result.current.handleAssignToSlot('daily');
    });

    expect(toastMock).toHaveBeenCalledWith('assign failed', { variant: 'error' });

    await act(async () => {
      await result.current.handleUnassignFromSlot('daily');
    });

    expect(toastMock).toHaveBeenCalledWith('unassign failed', { variant: 'error' });
  });

  it('saves builtin themes, persists custom catalog updates, and rejects unknown custom ids', async () => {
    setSetting(
      KANGUR_THEME_CATALOG_KEY,
      JSON.stringify([buildThemeEntry('theme-custom', 'Custom theme', '#f59e0b')])
    );

    const { result } = renderHook(() => useAppearancePage(), { wrapper });

    act(() => {
      result.current.setDraft((prev) => ({
        ...prev,
        primaryColor: '#0099ff',
      }));
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      key: KANGUR_DAILY_THEME_SETTINGS_KEY,
      value: serializeSetting(result.current.draft),
    });
    expect(result.current.isDirty).toBe(false);
    expect(toastMock).toHaveBeenCalledWith(expect.any(String), { variant: 'success' });

    act(() => {
      result.current.handleSelect('theme-custom');
      result.current.setDraft((prev) => ({
        ...prev,
        primaryColor: '#222222',
      }));
    });

    mutateAsyncMock.mockClear();
    toastMock.mockClear();

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    expect(mutateAsyncMock.mock.calls[0]?.[0]?.key).toBe(KANGUR_THEME_CATALOG_KEY);
    expect(JSON.parse(mutateAsyncMock.mock.calls[0]?.[0]?.value)[0].settings.primaryColor).toBe(
      '#222222'
    );
    expect(result.current.catalogOverrideRaw).toBe(mutateAsyncMock.mock.calls[0]?.[0]?.value);

    act(() => {
      result.current.handleSelect('theme-missing');
    });

    mutateAsyncMock.mockClear();
    toastMock.mockClear();

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(expect.any(String), { variant: 'error' });
  });
});
