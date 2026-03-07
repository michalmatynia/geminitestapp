/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { settingsStoreMock, mutateAsyncMock, toastMock } = vi.hoisted(() => ({
  settingsStoreMock: {
    get: vi.fn<(key: string) => string | undefined>(),
  },
  mutateAsyncMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSetting: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui')>();
  return {
    ...actual,
    useToast: () => ({
      toast: toastMock,
    }),
  };
});

import { AdminKangurSettingsPage } from '@/features/kangur/admin/AdminKangurSettingsPage';
import { KANGUR_HELP_SETTINGS_KEY, KANGUR_NARRATOR_SETTINGS_KEY } from '@/features/kangur/settings';

describe('AdminKangurSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsyncMock.mockResolvedValue({});
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_NARRATOR_SETTINGS_KEY) {
        return JSON.stringify({ engine: 'client', voice: 'coral' });
      }
      if (key === KANGUR_HELP_SETTINGS_KEY) {
        return JSON.stringify({
          docsTooltips: {
            enabled: true,
            homeEnabled: true,
            lessonsEnabled: true,
            testsEnabled: true,
            profileEnabled: true,
            parentDashboardEnabled: true,
            adminEnabled: true,
          },
        });
      }
      return undefined;
    });
  });

  it('loads the persisted narrator engine and saves the updated global selection', async () => {
    render(<AdminKangurSettingsPage />);

    const clientRadio = screen.getByRole('radio', {
      name: /client narrator use the browser speech engine on each learner device\./i,
    });
    const serverRadio = screen.getByRole('radio', {
      name: /server narrator use the cached neural narration generated on the server\./i,
    });

    expect(clientRadio).toBeChecked();
    expect(serverRadio).not.toBeChecked();

    fireEvent.click(serverRadio);
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() =>
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        key: KANGUR_NARRATOR_SETTINGS_KEY,
        value: JSON.stringify({ engine: 'server', voice: 'coral' }),
      })
    );

    expect(toastMock).toHaveBeenCalledWith('Kangur narrator settings saved.', {
      variant: 'success',
    });
  });

  it('loads persisted docs tooltip settings and saves updated Kangur help settings', async () => {
    render(<AdminKangurSettingsPage />);

    const masterToggle = screen.getByRole('switch', {
      name: /enable kangur docs tooltips/i,
    });
    const homeToggle = screen.getByRole('switch', {
      name: /home docs tooltips/i,
    });

    expect(masterToggle).toHaveAttribute('data-state', 'checked');
    expect(homeToggle).toHaveAttribute('data-state', 'checked');

    fireEvent.click(homeToggle);
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() =>
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        key: KANGUR_HELP_SETTINGS_KEY,
        value: JSON.stringify({
          version: 1,
          docsTooltips: {
            enabled: true,
            homeEnabled: false,
            lessonsEnabled: true,
            testsEnabled: true,
            profileEnabled: true,
            parentDashboardEnabled: true,
            adminEnabled: true,
          },
        }),
      })
    );

    expect(screen.getByText('Kangur Documentation Index')).toBeInTheDocument();
    expect(screen.getAllByText('Kangur Overview').length).toBeGreaterThan(0);
    expect(toastMock).toHaveBeenCalledWith('Kangur documentation tooltip settings saved.', {
      variant: 'success',
    });
  });
});
