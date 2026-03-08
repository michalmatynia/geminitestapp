/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { settingsStoreMock, mutateAsyncMock, useMasterFolderTreeShellMock, toastMock } =
  vi.hoisted(() => ({
    settingsStoreMock: {
      get: vi.fn(),
      isLoading: false,
    },
    mutateAsyncMock: vi.fn(),
    useMasterFolderTreeShellMock: vi.fn(),
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

vi.mock('@/features/foldertree', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/foldertree')>();
  return {
    ...actual,
    createMasterFolderTreeTransactionAdapter: vi.fn(() => ({ apply: vi.fn() })),
    FolderTreeSearchBar: ({ placeholder }: { placeholder?: string }) => (
      <div data-testid='folder-tree-search'>{placeholder}</div>
    ),
    FolderTreeViewportV2: () => <div data-testid='folder-tree-viewport' />,
    useMasterFolderTreeShell: (...args: unknown[]) => useMasterFolderTreeShellMock(...args),
    useMasterFolderTreeSearch: () => ({
      isActive: false,
      results: [],
    }),
  };
});

vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSetting: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui')>();
  return {
    ...actual,
    useToast: () => ({ toast: toastMock }),
  };
});

import { AdminKangurTestSuitesManagerPage } from './AdminKangurTestSuitesManagerPage';
import { KANGUR_TEST_QUESTIONS_SETTING_KEY } from '../test-questions';
import { KANGUR_TEST_SUITES_SETTING_KEY } from '../test-suites';

describe('AdminKangurTestSuitesManagerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_TEST_SUITES_SETTING_KEY) {
        return JSON.stringify([
          {
            id: 'suite-1',
            title: 'Tabliczka mnozenia',
            description: 'Test podstawowy',
            durationMinutes: 15,
            sortOrder: 1000,
            enabled: true,
          },
        ]);
      }
      if (key === KANGUR_TEST_QUESTIONS_SETTING_KEY) {
        return JSON.stringify({});
      }
      return undefined;
    });
    useMasterFolderTreeShellMock.mockReturnValue({
      capabilities: {
        search: {
          enabled: true,
          placeholder: 'Search suites...',
        },
      },
      appearance: {
        rootDropUi: null,
      },
      controller: {},
      viewport: {
        scrollToNodeRef: { current: null },
      },
    });
  });

  it('renders standalone Kangur tests page with shared shell chrome', () => {
    render(<AdminKangurTestSuitesManagerPage />);

    expect(screen.getByText('Kangur Tests')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent(
      'Admin/Kangur/Tests'
    );
    expect(screen.getByText('Test Suite Library')).toBeInTheDocument();
    expect(screen.getByText('Search suites...')).toBeInTheDocument();
    expect(screen.getByTestId('folder-tree-viewport')).toBeInTheDocument();
  });
});
