/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@/__tests__/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { updateLessonsMock, updateLessonDocumentsMock, useMasterFolderTreeShellMock, toastMock } =
  vi.hoisted(() => ({
    updateLessonsMock: vi.fn(),
    updateLessonDocumentsMock: vi.fn(),
    useMasterFolderTreeShellMock: vi.fn(),
    toastMock: vi.fn(),
  }));

let lessonsData: Array<{
  id: string;
  componentId: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  activeBg: string;
  sortOrder: number;
  enabled: boolean;
  contentMode?: string;
  subject?: string;
}> = [];
let lessonDocumentsData: Record<string, unknown> = {};

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
      matchNodeIds: new Set(),
    }),
  };
});

vi.mock('@/features/kangur/ui/hooks/useKangurLessons', () => ({
  useKangurLessons: () => ({
    data: lessonsData,
  }),
  useKangurLessonDocuments: () => ({
    data: lessonDocumentsData,
  }),
  useUpdateKangurLessons: () => ({
    mutateAsync: updateLessonsMock,
    isPending: false,
  }),
  useUpdateKangurLessonDocuments: () => ({
    mutateAsync: updateLessonDocumentsMock,
    isPending: false,
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonTemplates', () => ({
  useKangurLessonTemplates: () => ({ data: [] }),
}));

vi.mock('@/features/kangur/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/shared/ui')>();
  return {
    ...actual,
    useToast: () => ({ toast: toastMock }),
  };
});

import { createDefaultKangurLessonDocument } from '@/features/kangur/lesson-documents';
import { AdminKangurLessonsManagerPage } from './AdminKangurLessonsManagerPage';

describe('AdminKangurLessonsManagerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lessonsData = [
      {
        id: 'kangur-lesson-clock',
        componentId: 'clock',
        title: 'Nauka zegara',
        description: 'Odczytuj godziny',
        emoji: '🕐',
        color: 'kangur-gradient-accent-indigo-reverse',
        activeBg: 'bg-indigo-500',
        sortOrder: 1000,
        enabled: true,
        contentMode: 'component',
        subject: 'maths',
      },
    ];
    lessonDocumentsData = {
      'kangur-lesson-clock': createDefaultKangurLessonDocument(),
    };
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
    expect(screen.getByText('Lessons workspace')).toBeInTheDocument();
    expect(screen.getByText('Library surface')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent(
      'Admin/Kangur/Lessons'
    );
    expect(screen.getByText('Lesson library')).toBeInTheDocument();
    expect(screen.getByText('Editorial filters')).toBeInTheDocument();
    expect(screen.getByText('Ordered view')).toBeInTheDocument();
    expect(screen.getByText('Search lessons, ids, or component types...')).toBeInTheDocument();
    expect(screen.getByTestId('folder-tree-viewport')).toBeInTheDocument();
  });
});
