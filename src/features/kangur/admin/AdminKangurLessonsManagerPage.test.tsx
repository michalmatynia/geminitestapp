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

vi.mock('@/features/foldertree/v2', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/foldertree/v2')>();
  return {
    ...actual,
    createMasterFolderTreeTransactionAdapter: vi.fn(() => ({ apply: vi.fn() })),
    FolderTreeViewportV2: () => <div data-testid='folder-tree-viewport' />,
    useMasterFolderTreeShell: (...args: unknown[]) => useMasterFolderTreeShellMock(...args),
  };
});

vi.mock('@/features/foldertree/v2/search', () => ({
  FolderTreeSearchBar: ({ placeholder }: { placeholder?: string }) => (
    <div data-testid='folder-tree-search'>{placeholder}</div>
  ),
  useMasterFolderTreeSearch: () => ({
    isActive: false,
    matchNodeIds: new Set(),
  }),
}));

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

import { KANGUR_LESSON_DOCUMENTS_SETTING_KEY, createDefaultKangurLessonDocument } from '@/features/kangur/lesson-documents';
import { AdminKangurLessonsManagerPage } from './AdminKangurLessonsManagerPage';
import { KANGUR_LESSONS_SETTING_KEY } from '../settings';

describe('AdminKangurLessonsManagerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_LESSONS_SETTING_KEY) {
        return JSON.stringify([
          {
            id: 'kangur-lesson-clock',
            componentId: 'clock',
            title: 'Nauka zegara',
            description: 'Odczytuj godziny',
            emoji: '🕐',
            color: 'from-indigo-400 to-purple-500',
            activeBg: 'bg-indigo-500',
            sortOrder: 1000,
            enabled: true,
          },
        ]);
      }
      if (key === KANGUR_LESSON_DOCUMENTS_SETTING_KEY) {
        return JSON.stringify({
          'kangur-lesson-clock': createDefaultKangurLessonDocument(),
        });
      }
      return undefined;
    });
    useMasterFolderTreeShellMock.mockReturnValue({
      capabilities: {
        search: {
          enabled: true,
          placeholder: 'Search lessons, ids, or component types...',
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

  it('renders standalone Kangur lessons page with shared shell chrome', () => {
    render(<AdminKangurLessonsManagerPage />);

    expect(screen.getByText('Kangur Lessons')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent(
      'Admin/Kangur/Lessons'
    );
    expect(screen.getByText('Lesson Library')).toBeInTheDocument();
    expect(screen.getByText('Search lessons, ids, or component types...')).toBeInTheDocument();
    expect(screen.getByTestId('folder-tree-viewport')).toBeInTheDocument();
  });
});
