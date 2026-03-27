/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { expectNoAxeViolations } from '@/testing/accessibility/axe';

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
    prefetch: _prefetch,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/kangur/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSetting: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/features/kangur/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/shared/ui')>();
  return {
    ...actual,
    useToast: () => ({
      toast: toastMock,
    }),
  };
});

import { AdminKangurDocumentationPage } from '@/features/kangur/admin/AdminKangurDocumentationPage';
import { KANGUR_HELP_SETTINGS_KEY } from '@/features/kangur/help-settings';

describe('AdminKangurDocumentationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsyncMock.mockResolvedValue({});
    settingsStoreMock.get.mockImplementation((key: string) => {
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

  it('renders the standalone Kangur documentation center with accessible navigation and search semantics', () => {
    render(<AdminKangurDocumentationPage />);

    expect(screen.getByText('Kangur Documentation')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent(
      'Admin/Kangur/Documentation'
    );
    expect(screen.getByText('Kangur Documentation Index')).toBeInTheDocument();
    expect(screen.getAllByText('Kangur Overview').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /skip to documentation content/i })).toHaveAttribute(
      'href',
      '#kangur-documentation-content'
    );
    expect(screen.getByRole('main', { name: /documentation workspace/i })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: /search kangur documentation/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open settings/i })).toHaveAttribute(
      'href',
      '/admin/kangur/settings'
    );
    expect(screen.getByRole('switch', { name: /enable kangur docs tooltips/i })).toHaveAttribute(
      'data-state',
      'checked'
    );
    expect(screen.getByRole('button', { name: /save tooltip settings/i })).toBeDisabled();
  });

  it('announces documentation search result changes for screen readers', () => {
    render(<AdminKangurDocumentationPage />);

    const searchInput = screen.getByRole('searchbox', { name: /search kangur documentation/i });

    fireEvent.change(searchInput, { target: { value: 'no matches expected' } });

    expect(screen.getByRole('status')).toHaveTextContent(
      'Showing 0 guides and 0 tooltip documents across 0 sections for "no matches expected".'
    );
    expect(screen.getByText('No Kangur guide matched the current search.')).toBeInTheDocument();
    expect(
      screen.getByText('No Kangur tooltip documentation matched the current search.')
    ).toBeInTheDocument();
  });

  it('moves focus to the documentation main region from the skip link', () => {
    render(<AdminKangurDocumentationPage />);

    fireEvent.click(screen.getByRole('link', { name: /skip to documentation content/i }));

    expect(screen.getByRole('main', { name: /documentation workspace/i })).toHaveFocus();
  });

  it('saves tooltip settings from the dedicated documentation page', async () => {
    render(<AdminKangurDocumentationPage />);

    fireEvent.click(screen.getByRole('switch', { name: /home docs tooltips/i }));
    fireEvent.click(screen.getByRole('button', { name: /save tooltip settings/i }));

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

    expect(toastMock).toHaveBeenCalledWith('Kangur documentation tooltip settings saved.', {
      variant: 'success',
    });
  });

  it('has no obvious accessibility violations', async () => {
    const { container } = render(<AdminKangurDocumentationPage />);

    await expectNoAxeViolations(container);
  });
});
