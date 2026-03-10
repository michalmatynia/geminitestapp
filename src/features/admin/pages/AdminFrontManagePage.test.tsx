/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { settingsMapMock, mutateAsyncMock, toastMock } = vi.hoisted(() => ({
  settingsMapMock: {
    data: new Map<string, string>(),
    isPending: false,
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

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: () => settingsMapMock,
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

import { AdminFrontManagePage } from '@/features/admin/pages/AdminFrontManagePage';

describe('AdminFrontManagePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsMapMock.data = new Map<string, string>([['front_page_app', 'products']]);
    settingsMapMock.isPending = false;
    mutateAsyncMock.mockResolvedValue({});
  });

  it('maps the legacy products selection to CMS Home and saves the CMS value', async () => {
    render(<AdminFrontManagePage />);

    expect(screen.getByRole('button', { name: /cms home/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /studiq/i })).toBeInTheDocument();
    expect(screen.getByText(/studiq on home/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open cms pages/i })).toHaveAttribute(
      'href',
      '/admin/cms/pages'
    );

    fireEvent.click(screen.getByRole('button', { name: /save selection/i }));

    await waitFor(() =>
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        key: 'front_page_app',
        value: 'cms',
      })
    );

    expect(toastMock).toHaveBeenCalledWith('Front page updated', { variant: 'success' });
  });

  it('saves an admin workspace destination when selected', async () => {
    render(<AdminFrontManagePage />);

    fireEvent.click(screen.getByRole('button', { name: /chatbot/i }));
    fireEvent.click(screen.getByRole('button', { name: /save selection/i }));

    await waitFor(() =>
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        key: 'front_page_app',
        value: 'chatbot',
      })
    );
  });

  it('saves the Kangur destination when selected', async () => {
    render(<AdminFrontManagePage />);

    fireEvent.click(screen.getByRole('button', { name: /studiq/i }));
    fireEvent.click(screen.getByRole('button', { name: /save selection/i }));

    await waitFor(() =>
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        key: 'front_page_app',
        value: 'kangur',
      })
    );
  });
});
