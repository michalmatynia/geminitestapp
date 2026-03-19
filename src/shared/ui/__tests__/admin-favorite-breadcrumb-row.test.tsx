// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePathname, useSearchParams } from 'next/navigation';

const mocks = vi.hoisted(() => ({
  apiPostMock: vi.fn(),
  toastMock: vi.fn(),
  useSettingsStoreMock: vi.fn(),
  invalidateSettingsCacheMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: mocks.apiPostMock,
  },
}));

vi.mock('@/shared/api/settings-client', () => ({
  invalidateSettingsCache: mocks.invalidateSettingsCacheMock,
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => mocks.useSettingsStoreMock(),
}));

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock('@/shared/ui/toast', () => ({
  useOptionalToast: () => ({
    toast: mocks.toastMock,
  }),
}));

import { AdminFavoriteBreadcrumbRow } from '@/shared/ui/admin-favorite-breadcrumb-row';

describe('AdminFavoriteBreadcrumbRow', () => {
  beforeEach(() => {
    mocks.apiPostMock.mockReset().mockResolvedValue({});
    mocks.toastMock.mockReset();
    mocks.invalidateSettingsCacheMock.mockReset();
    mocks.useSettingsStoreMock.mockReset().mockReturnValue({
      map: new Map<string, string>(),
      get: () => undefined,
      refetch: vi.fn(),
    });
    vi.mocked(usePathname).mockReturnValue('/');
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams());
  });

  it('adds the provided item id to admin favorites', async () => {
    render(
      <AdminFavoriteBreadcrumbRow itemId='system/logs' itemLabel='Observation Post'>
        <div>breadcrumbs</div>
      </AdminFavoriteBreadcrumbRow>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add Observation Post to admin favorites' }));

    await waitFor(() => {
      expect(mocks.apiPostMock).toHaveBeenCalledWith('/api/settings', {
        key: 'admin_menu_favorites',
        value: JSON.stringify(['system/logs']),
      });
    });

    expect(mocks.toastMock).toHaveBeenCalledWith('Observation Post added to admin favorites.', {
      variant: 'success',
    });
  });

  it('removes the provided item id when it is already favorited', async () => {
    mocks.useSettingsStoreMock.mockReturnValue({
      map: new Map<string, string>([['admin_menu_favorites', JSON.stringify(['system/logs'])]]),
      get: (key: string) =>
        key === 'admin_menu_favorites' ? JSON.stringify(['system/logs']) : undefined,
      refetch: vi.fn(),
    });

    render(
      <AdminFavoriteBreadcrumbRow itemId='system/logs' itemLabel='Observation Post'>
        <div>breadcrumbs</div>
      </AdminFavoriteBreadcrumbRow>
    );

    expect(screen.getByRole('button', { name: 'Remove Observation Post from admin favorites' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Observation Post from admin favorites' })
    );

    await waitFor(() => {
      expect(mocks.apiPostMock).toHaveBeenCalledWith('/api/settings', {
        key: 'admin_menu_favorites',
        value: JSON.stringify([]),
      });
    });

    expect(mocks.toastMock).toHaveBeenCalledWith('Observation Post removed from admin favorites.', {
      variant: 'success',
    });
  });

  it('resolves the favorite item from the current admin route when no explicit id is provided', async () => {
    vi.mocked(usePathname).mockReturnValue('/admin/system/logs');

    render(
      <AdminFavoriteBreadcrumbRow>
        <div>breadcrumbs</div>
      </AdminFavoriteBreadcrumbRow>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add System Logs to admin favorites' }));

    await waitFor(() => {
      expect(mocks.apiPostMock).toHaveBeenCalledWith('/api/settings', {
        key: 'admin_menu_favorites',
        value: JSON.stringify(['system/logs']),
      });
    });

    expect(mocks.toastMock).toHaveBeenCalledWith('System Logs added to admin favorites.', {
      variant: 'success',
    });
  });

  it('resolves nested admin routes to the closest favorite leaf', async () => {
    vi.mocked(usePathname).mockReturnValue('/admin/products/123');

    render(
      <AdminFavoriteBreadcrumbRow>
        <div>breadcrumbs</div>
      </AdminFavoriteBreadcrumbRow>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add All Products to admin favorites' }));

    await waitFor(() => {
      expect(mocks.apiPostMock).toHaveBeenCalledWith('/api/settings', {
        key: 'admin_menu_favorites',
        value: JSON.stringify(['commerce/products/all']),
      });
    });
  });

  it('resolves direct agent runs routes using the matching admin nav leaf', async () => {
    vi.mocked(usePathname).mockReturnValue('/admin/agentcreator/runs');

    render(
      <AdminFavoriteBreadcrumbRow>
        <div>breadcrumbs</div>
      </AdminFavoriteBreadcrumbRow>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add Runs to admin favorites' }));

    await waitFor(() => {
      expect(mocks.apiPostMock).toHaveBeenCalledWith('/api/settings', {
        key: 'admin_menu_favorites',
        value: JSON.stringify(['ai/agent-creator/runs']),
      });
    });
  });
});
