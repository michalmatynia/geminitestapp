import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AdminMenuSettingsProvider,
  useAdminMenuSettings,
} from '@/features/admin/context/AdminMenuSettingsContext';
import {
  ADMIN_MENU_CUSTOM_ENABLED_KEY,
  ADMIN_MENU_CUSTOM_NAV_KEY,
  ADMIN_MENU_FAVORITES_KEY,
  ADMIN_MENU_SECTION_COLORS_KEY,
} from '@/features/admin/constants/admin-menu-settings';
import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui';

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: vi.fn(),
  useUpdateSettingsBulk: vi.fn(),
}));

vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui')>();
  return {
    ...actual,
    useToast: vi.fn(() => ({ toast: vi.fn() })),
  };
});

function ContextHarness(): React.JSX.Element {
  const ctx = useAdminMenuSettings();
  return (
    <div>
      <div data-testid='custom-enabled'>{String(ctx.customEnabled)}</div>
      <div data-testid='favorites-count'>{String(ctx.favorites.length)}</div>
      <div data-testid='colors-count'>{String(Object.keys(ctx.sectionColors).length)}</div>

      <button type='button' onClick={() => ctx.handleToggleFavorite('system/settings/menu', true)}>
        add-favorite
      </button>
      <button type='button' onClick={() => ctx.updateSectionColor('system', 'cyan')}>
        set-color
      </button>
      <button type='button' onClick={() => ctx.setCustomEnabled(true)}>
        enable-custom
      </button>
      <button type='button' onClick={() => ctx.handleAddRootNode('link')}>
        add-root-link
      </button>
      <button
        type='button'
        onClick={() => {
          void ctx.handleSave();
        }}
      >
        save
      </button>
      <button type='button' onClick={ctx.handleReset}>
        reset
      </button>
    </div>
  );
}

describe('AdminMenuSettingsContext', () => {
  const mutateAsync = vi.fn(async () => undefined);
  const toast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useSettingsMap).mockReturnValue({
      data: new Map<string, string>(),
      isFetched: true,
    } as unknown as ReturnType<typeof useSettingsMap>);

    vi.mocked(useUpdateSettingsBulk).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateSettingsBulk>);

    vi.mocked(useToast).mockReturnValue({ toast } as unknown as ReturnType<typeof useToast>);
  });

  it('persists exactly the same admin menu keys with JSON payloads', async () => {
    render(
      <AdminMenuSettingsProvider>
        <ContextHarness />
      </AdminMenuSettingsProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(1);
    });

    const payload = mutateAsync.mock.calls[0]?.[0] as Array<{ key: string; value: string }>;
    const keys = new Set(payload.map((entry) => entry.key));

    expect(keys).toEqual(
      new Set([
        ADMIN_MENU_FAVORITES_KEY,
        ADMIN_MENU_SECTION_COLORS_KEY,
        ADMIN_MENU_CUSTOM_ENABLED_KEY,
        ADMIN_MENU_CUSTOM_NAV_KEY,
      ])
    );

    const favorites = payload.find((entry) => entry.key === ADMIN_MENU_FAVORITES_KEY);
    const sectionColors = payload.find((entry) => entry.key === ADMIN_MENU_SECTION_COLORS_KEY);
    const customEnabled = payload.find((entry) => entry.key === ADMIN_MENU_CUSTOM_ENABLED_KEY);
    const customNav = payload.find((entry) => entry.key === ADMIN_MENU_CUSTOM_NAV_KEY);

    expect(() => JSON.parse(favorites?.value ?? '')).not.toThrow();
    expect(() => JSON.parse(sectionColors?.value ?? '')).not.toThrow();
    expect(() => JSON.parse(customEnabled?.value ?? '')).not.toThrow();
    expect(() => JSON.parse(customNav?.value ?? '')).not.toThrow();
  });

  it('resets favorites, section colors, and custom-enabled flag to defaults', async () => {
    render(
      <AdminMenuSettingsProvider>
        <ContextHarness />
      </AdminMenuSettingsProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'add-favorite' }));
    fireEvent.click(screen.getByRole('button', { name: 'set-color' }));
    fireEvent.click(screen.getByRole('button', { name: 'enable-custom' }));
    fireEvent.click(screen.getByRole('button', { name: 'add-root-link' }));

    await waitFor(() => {
      expect(screen.getByTestId('custom-enabled')).toHaveTextContent('true');
      expect(screen.getByTestId('favorites-count')).toHaveTextContent('1');
      expect(screen.getByTestId('colors-count')).toHaveTextContent('1');
    });

    fireEvent.click(screen.getByRole('button', { name: 'reset' }));

    await waitFor(() => {
      expect(screen.getByTestId('custom-enabled')).toHaveTextContent('false');
      expect(screen.getByTestId('favorites-count')).toHaveTextContent('0');
      expect(screen.getByTestId('colors-count')).toHaveTextContent('0');
    });
  });
});
