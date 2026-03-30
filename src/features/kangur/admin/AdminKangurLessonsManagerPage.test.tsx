/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  updateLessonsMock,
  updateLessonDocumentsMock,
  updateLessonTemplatesMock,
  lessonTemplateLocaleMock,
  lessonDocumentLocaleMock,
  useMasterFolderTreeShellMock,
  toastMock,
} = vi.hoisted(() => ({
    updateLessonsMock: vi.fn(),
    updateLessonDocumentsMock: vi.fn(),
    updateLessonTemplatesMock: vi.fn(),
    lessonTemplateLocaleMock: vi.fn(),
    lessonDocumentLocaleMock: vi.fn(),
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
let lessonTemplatesData: Array<Record<string, unknown>> = [];

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

vi.mock('@/features/foldertree/public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/foldertree/public')>();
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
  useKangurLessonDocuments: (options?: { locale?: string | null }) => {
    lessonDocumentLocaleMock(options?.locale ?? null);
    return {
    data: lessonDocumentsData,
    };
  },
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
  useKangurLessonTemplates: (options?: { locale?: string | null }) => {
    lessonTemplateLocaleMock(options?.locale ?? null);
    return { data: lessonTemplatesData };
  },
  useUpdateKangurLessonTemplates: () => ({
    mutateAsync: updateLessonTemplatesMock,
    isPending: false,
  }),
}));

vi.mock('@/features/kangur/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/shared/ui')>();
  return {
    ...actual,
    SelectSimple: ({
      value,
      onChange,
      onValueChange,
      options,
      id,
      ariaLabel,
      title,
    }: {
      value?: string;
      onChange?: (value: string) => void;
      onValueChange?: (value: string) => void;
      options: Array<{ value: string; label: string }>;
      id?: string;
      ariaLabel?: string;
      title?: string;
    }) => (
      <select
        id={id}
        aria-label={ariaLabel}
        title={title}
        value={value}
        onChange={(event): void => {
          onChange?.(event.target.value);
          onValueChange?.(event.target.value);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
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
    lessonTemplatesData = [];
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

    expect(screen.getByRole('heading', { name: 'Lessons Manager' })).toBeInTheDocument();
    expect(screen.getByText('Lessons workspace')).toBeInTheDocument();
    expect(screen.getByText('Library surface')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent(
      'Admin/Kangur/Lessons Manager'
    );
    expect(screen.getByText('Lesson library')).toBeInTheDocument();
    expect(screen.getByText('Editorial filters')).toBeInTheDocument();
    expect(screen.getByText('Ordered view')).toBeInTheDocument();
    expect(screen.getByText('Search lessons, ids, or component types...')).toBeInTheDocument();
    expect(screen.getByTestId('folder-tree-viewport')).toBeInTheDocument();
    expect(screen.getByLabelText('Content locale')).toHaveValue('pl');
  });

  it('switches the template and document queries to the selected content locale', () => {
    render(<AdminKangurLessonsManagerPage />);

    expect(lessonTemplateLocaleMock).toHaveBeenCalledWith('pl');
    expect(lessonDocumentLocaleMock).toHaveBeenCalledWith('pl');

    fireEvent.change(screen.getByLabelText('Content locale'), {
      target: { value: 'en' },
    });

    expect(screen.getByLabelText('Content locale')).toHaveValue('en');
    expect(lessonTemplateLocaleMock).toHaveBeenLastCalledWith('en');
    expect(lessonDocumentLocaleMock).toHaveBeenLastCalledWith('en');
  });
});
