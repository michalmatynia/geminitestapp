/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { withKangurClientError, withKangurClientErrorSync } = globalThis.__kangurClientErrorMocks();
const mutateAsyncMock = vi.fn();
const updateLessonDocumentsMock = vi.fn();
const updateLessonTemplatesMock = vi.fn();
const toastMock = vi.fn();
const lessonsState = {
  value: [] as Array<Record<string, unknown>>,
};
const lessonDocumentsState = {
  value: {} as Record<string, unknown>,
};
const searchStateMock = {
  isActive: false,
  results: [],
};
const useMasterFolderTreeShellMock = vi.fn();
const folderTreeViewportMock = vi.fn();
const folderTreeSearchBarMock = vi.fn();

vi.mock('@/shared/lib/foldertree/public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/foldertree/public')>();
  return {
    ...actual,
    createMasterFolderTreeTransactionAdapter: vi.fn(() => ({ apply: vi.fn() })),
    FolderTreeSearchBar: (props: { placeholder?: string }) => {
      folderTreeSearchBarMock(props);
      return <div data-testid='folder-tree-search'>{props.placeholder}</div>;
    },
    FolderTreeViewportV2: (props: unknown) => {
      folderTreeViewportMock(props);
      return <div data-testid='folder-tree-viewport' />;
    },
    useMasterFolderTreeShell: (...args: unknown[]) => useMasterFolderTreeShellMock(...args),
    useMasterFolderTreeSearch: () => searchStateMock,
  };
});

vi.mock('@/features/kangur/ui/hooks/useKangurLessons', () => ({
  useKangurLessons: vi.fn(() => ({
    data: lessonsState.value,
    isLoading: false,
    error: null,
  })),
  useKangurLessonDocuments: vi.fn(() => ({
    data: lessonDocumentsState.value,
    isLoading: false,
    error: null,
  })),
  useUpdateKangurLessons: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
  useUpdateKangurLessonDocuments: () => ({
    mutateAsync: updateLessonDocumentsMock,
    isPending: false,
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonTemplates', () => ({
  useKangurLessonTemplates: () => ({ data: [] }),
  useUpdateKangurLessonTemplates: () => ({
    mutateAsync: updateLessonTemplatesMock,
    isPending: false,
  }),
}));

vi.mock('@/features/kangur/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/shared/ui')>();
  return {
  ...actual,
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Breadcrumbs: () => <div data-testid='breadcrumbs' />,
  Button: (props: any) => (
    <button type='button' {...props}>
      {props.children}
    </button>
  ),  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid='mock-dialog'>{children}</div> : null,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  FolderTreePanel: ({
    children,
    header,
  }: {
    children: React.ReactNode;
    header?: React.ReactNode;
  }) => (
    <div>
      {header}
      {children}
    </div>
  ),
  FormField: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormModal: (props: { children: React.ReactNode }) => {
    const { children } = props;
    return <div>{children}</div>;
  },
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  SectionHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
  SelectSimple: ({
    value,
    onChange,
    onValueChange,
    options = [],
    id,
    ariaLabel,
    title,
  }: {
    value?: string;
    onChange?: (value: string) => void;
    onValueChange?: (value: string) => void;
    options?: Array<{ value: string; label: string }>;
    id?: string;
    ariaLabel?: string;
    title?: string;
  }) => (
    <select
      data-testid='select-simple'
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
  Skeleton: () => <div data-testid='skeleton' />,
  Switch: ({ checked }: { checked: boolean }) => <div data-checked={checked} />,
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
  TreeRow: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useToast: () => ({ toast: toastMock }),
  };
});

vi.mock('@/features/kangur/shared/ui/templates/modals', () => ({
  ConfirmModal: () => null,
}));

vi.mock('@/features/kangur/observability/client', () => ({
  ...(() => {
    const { withKangurClientError, withKangurClientErrorSync } =
      globalThis.__kangurClientErrorMocks();
    return { withKangurClientError, withKangurClientErrorSync };
  })(),

  isRecoverableKangurClientFetchError: vi.fn().mockReturnValue(false),}));

vi.mock('@/features/kangur/admin/components/KangurAdminContentShell', () => ({
  KangurAdminContentShell: ({
    children,
    headerActions,
  }: {
    children: React.ReactNode;
    headerActions?: React.ReactNode;
  }) => (
    <div>
      {headerActions}
      {children}
    </div>
  ),
}));

import { AdminKangurLessonsManagerPage } from '@/features/kangur/admin/AdminKangurLessonsManagerPage';
const TREE_MODE_STORAGE_KEY = 'kangur_lessons_manager_tree_mode_v1';

const baseLessons = [
  {
    id: 'kangur-lesson-clock',
    componentId: 'clock',
    contentMode: 'component',
    subject: 'maths',
    ageGroup: 'ten_year_old',
    title: 'Nauka zegara',
    description: 'Odczytuj godziny',
    emoji: '🕐',
    color: 'kangur-gradient-accent-indigo-reverse',
    activeBg: 'bg-indigo-500',
    sortOrder: 1000,
    enabled: true,
  },
  {
    id: 'kangur-lesson-calendar',
    componentId: 'calendar',
    contentMode: 'component',
    subject: 'maths',
    ageGroup: 'ten_year_old',
    title: 'Nauka kalendarza',
    description: 'Dni i miesiące',
    emoji: '📅',
    color: 'kangur-gradient-accent-emerald',
    activeBg: 'bg-green-500',
    sortOrder: 2000,
    enabled: true,
  },
] as const;

const geometryComponentIds = [
  'geometry_basics',
  'geometry_shapes',
  'geometry_symmetry',
  'geometry_perimeter',
] as const;

const logicalComponentIds = [
  'logical_thinking',
  'logical_patterns',
  'logical_classification',
  'logical_reasoning',
  'logical_analogies',
] as const;

vi.mock('@/features/kangur/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/settings')>();
  return {
    ...actual,
    createDefaultKangurLessons: vi.fn(() => []),
  };
});

describe('AdminKangurLessonsManagerPage geometry pack action', () => {
  beforeEach(() => {
    mutateAsyncMock.mockReset();
    updateLessonDocumentsMock.mockReset();
    updateLessonTemplatesMock.mockReset();
    toastMock.mockReset();
    useMasterFolderTreeShellMock.mockReset();
    folderTreeViewportMock.mockReset();
    folderTreeSearchBarMock.mockReset();
    window.localStorage.clear();
    lessonsState.value = [...baseLessons];
    lessonDocumentsState.value = {};

    useMasterFolderTreeShellMock.mockReturnValue({
      capabilities: {
        search: {
          enabled: true,
          placeholder: 'Search lessons, ids, or component types...',
        },
      },
      search: {
        enabled: true,
        state: { isActive: false, matchNodeIds: new Set() },
        resultCountLabel: '',
        placeholder: 'Search lessons, ids, or component types...',
      },
      appearance: {
        rootDropUi: null,
      },
      controller: {
        searchState: { isActive: false, matchNodeIds: new Set() },
      },
      viewport: {
        scrollToNodeRef: { current: null },
      },
    });
  });

  it('adds missing geometry lessons in one action and persists updated settings', async () => {
    mutateAsyncMock.mockResolvedValue(undefined);

    render(<AdminKangurLessonsManagerPage />);

    fireEvent.click(screen.getByRole('button', { name: /add geometry pack/i }));

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));

    const persistedLessons = mutateAsyncMock.mock.calls[0]?.[0] as Array<{ componentId: string }>;
    const persistedComponentIds = persistedLessons.map((lesson) => lesson.componentId);

    expect(persistedLessons).toHaveLength(geometryComponentIds.length + baseLessons.length);
    for (const geometryId of geometryComponentIds) {
      expect(persistedComponentIds).toContain(geometryId);
    }
  });

  it('disables geometry-pack button when all geometry lessons already exist', () => {
    const alreadyFull = [
      ...baseLessons,
      ...geometryComponentIds.map((componentId, index) => ({
        id: `kangur-lesson-${componentId}`,
        componentId,
        contentMode: 'component',
        subject: 'maths',
        ageGroup: 'ten_year_old',
        title: `Geometry ${componentId}`,
        description: 'Geometry lesson',
        emoji: '🔷',
        color: 'kangur-gradient-accent-violet-reverse',
        activeBg: 'bg-fuchsia-500',
        sortOrder: 3000 + index * 1000,
        enabled: true,
      })),
    ];
    lessonsState.value = alreadyFull;

    render(<AdminKangurLessonsManagerPage />);

    const addPackButton = screen.getByRole('button', { name: /add geometry pack/i });
    expect(addPackButton).toBeDisabled();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('adds missing logical thinking lessons in one action and persists updated settings', async () => {
    mutateAsyncMock.mockResolvedValue(undefined);

    render(<AdminKangurLessonsManagerPage />);

    fireEvent.click(screen.getByRole('button', { name: /add logic pack/i }));

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));

    const persistedLessons = mutateAsyncMock.mock.calls[0]?.[0] as Array<{ componentId: string }>;
    const persistedComponentIds = persistedLessons.map((lesson) => lesson.componentId);

    expect(persistedLessons).toHaveLength(logicalComponentIds.length + baseLessons.length);
    for (const logicalId of logicalComponentIds) {
      expect(persistedComponentIds).toContain(logicalId);
    }
  });

  it('disables logical-pack button when all logical thinking lessons already exist', () => {
    const alreadyFull = [
      ...baseLessons,
      ...logicalComponentIds.map((componentId, index) => ({
        id: `kangur-lesson-${componentId}`,
        componentId,
        contentMode: 'component',
        subject: 'maths',
        ageGroup: 'ten_year_old',
        title: `Logic ${componentId}`,
        description: 'Logical lesson',
        emoji: '🧠',
        color: 'kangur-gradient-accent-indigo',
        activeBg: 'bg-violet-500',
        sortOrder: 3000 + index * 1000,
        enabled: true,
      })),
    ];
    lessonsState.value = alreadyFull;

    render(<AdminKangurLessonsManagerPage />);

    const addPackButton = screen.getByRole('button', { name: /add logic pack/i });
    expect(addPackButton).toBeDisabled();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('switches to catalog mode and disables drag reorder in viewport', async () => {
    useMasterFolderTreeShellMock.mockReturnValue({
      capabilities: {
        search: {
          enabled: true,
          placeholder: 'Search lessons, ids, or component types...',
        },
      },
      appearance: { rootDropUi: null },
      controller: { searchState: { isActive: false, matchNodeIds: new Set() } },
      viewport: { scrollToNodeRef: { current: null } },
    });

    render(<AdminKangurLessonsManagerPage />);

    const initialProps = folderTreeViewportMock.mock.calls.at(-1)?.[0] as {
      enableDnd?: boolean;
      rootDropUi?: { enabled?: boolean } | null;
    };
    const initialShellArgs = useMasterFolderTreeShellMock.mock.calls.at(-1)?.[0] as {
      instance?: string;
    };
    expect(initialProps.enableDnd).toBe(true);
    expect(initialProps.rootDropUi?.enabled).toBeUndefined();
    expect(initialShellArgs.instance).toBe('kangur_lessons_manager');

    fireEvent.click(screen.getByRole('button', { name: /^catalog$/i }));

    await waitFor(() => {
      const latestShellArgs = useMasterFolderTreeShellMock.mock.calls.at(-1)?.[0] as {
        instance?: string;
      };
      expect(latestShellArgs.instance).toBe('kangur_lessons_manager_catalog');
    });
  });

  it('updates search placeholder when switching between ordered and catalog modes', async () => {
    useMasterFolderTreeShellMock.mockReturnValue({
      capabilities: {
        search: {
          enabled: true,
          placeholder: 'Search lessons, ids, or component types...',
        },
      },
      appearance: { rootDropUi: { enabled: true, label: 'test' } },
      controller: { searchState: { isActive: false, matchNodeIds: new Set() } },
      viewport: { scrollToNodeRef: { current: null } },
    });

    render(<AdminKangurLessonsManagerPage />);

    expect(screen.getByTestId('folder-tree-search')).toHaveTextContent(
      /search lessons, ids, or component types/i
    );

    fireEvent.click(screen.getByRole('button', { name: /^catalog$/i }));

    await waitFor(() => {
      expect(screen.getByTestId('folder-tree-search')).toHaveTextContent(
        /search catalog groups and lessons/i
      );
    });
  });

  it('persists selected tree mode in local storage', async () => {
    useMasterFolderTreeShellMock.mockReturnValue({
      capabilities: {
        search: {
          enabled: true,
          placeholder: 'Search lessons, ids, or component types...',
        },
      },
      appearance: { rootDropUi: { enabled: true, label: 'test' } },
      controller: { searchState: { isActive: false, matchNodeIds: new Set() } },
      viewport: { scrollToNodeRef: { current: null } },
    });

    render(<AdminKangurLessonsManagerPage />);
    fireEvent.click(screen.getByRole('button', { name: /^catalog$/i }));

    await waitFor(() => {
      expect(window.localStorage.getItem(TREE_MODE_STORAGE_KEY)).toBe('catalog');
    });

    fireEvent.click(screen.getByRole('button', { name: /^ordered$/i }));

    await waitFor(() => {
      expect(window.localStorage.getItem(TREE_MODE_STORAGE_KEY)).toBe('ordered');
    });
  });

  it('restores persisted catalog mode on initial render', () => {
    window.localStorage.setItem(TREE_MODE_STORAGE_KEY, 'catalog');
    useMasterFolderTreeShellMock.mockReturnValue({
      capabilities: {
        search: {
          enabled: false,
        },
      },
      appearance: {
        rootDropUi: { label: 'Drop lesson' },
      },
      controller: {},
      viewport: {
        scrollToNodeRef: { current: null },
      },
    });

    render(<AdminKangurLessonsManagerPage />);

    const latestProps = folderTreeViewportMock.mock.calls.at(-1)?.[0] as {
      enableDnd?: boolean;
      rootDropUi?: { enabled?: boolean };
    };
    const latestShellArgs = useMasterFolderTreeShellMock.mock.calls.at(-1)?.[0] as {
      instance?: string;
    };
    expect(latestProps.enableDnd).toBe(false);
    expect(latestProps.rootDropUi?.enabled).toBe(false);
    expect(latestShellArgs.instance).toBe('kangur_lessons_manager_catalog');
  });

  it('keeps independent search query state for ordered and catalog modes', async () => {
    useMasterFolderTreeShellMock.mockReturnValue({
      capabilities: {
        search: {
          enabled: true,
          placeholder: 'Search lessons, ids, or component types...',
        },
      },
      appearance: { rootDropUi: { enabled: true, label: 'test' } },
      controller: { searchState: { isActive: false, matchNodeIds: new Set() } },
      viewport: { scrollToNodeRef: { current: null } },
    });

    render(<AdminKangurLessonsManagerPage />);

    const orderedInitial = folderTreeSearchBarMock.mock.calls.at(-1)?.[0] as {
      value: string;
      onChange: (value: string) => void;
    };
    expect(orderedInitial.value).toBe('');

    await act(async () => {
      orderedInitial.onChange('clock');
    });

    await waitFor(() => {
      const orderedUpdated = folderTreeSearchBarMock.mock.calls.at(-1)?.[0] as { value: string };
      expect(orderedUpdated.value).toBe('clock');
    });

    fireEvent.click(screen.getByRole('button', { name: /^catalog$/i }));

    await waitFor(() => {
      const catalogInitial = folderTreeSearchBarMock.mock.calls.at(-1)?.[0] as { value: string };
      expect(catalogInitial.value).toBe('');
    });

    const catalogProps = folderTreeSearchBarMock.mock.calls.at(-1)?.[0] as {
      onChange: (value: string) => void;
    };
    await act(async () => {
      catalogProps.onChange('hidden');
    });

    await waitFor(() => {
      const catalogUpdated = folderTreeSearchBarMock.mock.calls.at(-1)?.[0] as { value: string };
      expect(catalogUpdated.value).toBe('hidden');
    });

    fireEvent.click(screen.getByRole('button', { name: /^ordered$/i }));

    await waitFor(() => {
      const orderedRestored = folderTreeSearchBarMock.mock.calls.at(-1)?.[0] as { value: string };
      expect(orderedRestored.value).toBe('clock');
    });
  });
});
