/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { settingsMapMock, mutateAsyncMock, toastMock, confirmMock } = vi.hoisted(() => ({
  settingsMapMock: {
    data: new Map<string, string>(),
    isPending: false,
  },
  mutateAsyncMock: vi.fn(),
  toastMock: vi.fn(),
  confirmMock: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    prefetch: _prefetch,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }) => (
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

vi.mock('@/shared/hooks/ui/useConfirm', () => ({
  useConfirm: () => ({
    confirm: confirmMock,
    ConfirmationModal: () => null,
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

  it('maps the legacy products selection to CMS Home and keeps save disabled until a change is made', async () => {
    render(<AdminFrontManagePage />);

    expect(screen.getByRole('button', { name: /cms home/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /studiq/i })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByText(/current live home:/i)).toBeInTheDocument();
    expect(screen.getByText(/studiq on home/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open cms pages/i })).toHaveAttribute(
      'href',
      '/admin/cms/pages'
    );
    expect(screen.getByRole('button', { name: /^saved$/i })).toBeDisabled();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
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
    expect(toastMock).toHaveBeenCalledWith('Front page updated to Chatbot', {
      variant: 'success',
    });
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
    expect(toastMock).toHaveBeenCalledWith('Front page updated to StudiQ', {
      variant: 'success',
    });
  });

  it('asks for confirmation before switching the live HOME route from StudiQ back to CMS', async () => {
    settingsMapMock.data = new Map<string, string>([['front_page_app', 'kangur']]);

    render(<AdminFrontManagePage />);

    fireEvent.click(screen.getByRole('button', { name: /cms home/i }));
    fireEvent.click(screen.getByRole('button', { name: /save selection/i }));

    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(mutateAsyncMock).not.toHaveBeenCalled();

    const confirmConfig = confirmMock.mock.calls[0]?.[0] as {
      onConfirm?: () => void | Promise<void>;
      title: string;
    };
    expect(confirmConfig.title).toBe('Switch HOME to CMS?');

    await confirmConfig.onConfirm?.();

    await waitFor(() =>
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        key: 'front_page_app',
        value: 'cms',
      })
    );
    expect(toastMock).toHaveBeenCalledWith('Front page updated to CMS Home', {
      variant: 'success',
    });
  });
});
