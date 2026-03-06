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
import { KANGUR_NARRATOR_SETTINGS_KEY } from '@/features/kangur/settings';

describe('AdminKangurSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsyncMock.mockResolvedValue({});
    settingsStoreMock.get.mockImplementation((key: string) => {
    if (key === KANGUR_NARRATOR_SETTINGS_KEY) {
      return JSON.stringify({ engine: 'client', voice: 'coral' });
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
});
