/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLessonContentEditorContext } from '../context/LessonContentEditorContext';

const {
  mutateAsyncMock,
  apiPostMock,
  toastMock,
  settingsStoreMock,
  useMasterFolderTreeShellMock,
  latestNodesState,
} = vi.hoisted(() => ({
  mutateAsyncMock: vi.fn(),
  apiPostMock: vi.fn(),
  toastMock: vi.fn(),
  settingsStoreMock: {
    get: vi.fn(),
    isLoading: false,
  },
  useMasterFolderTreeShellMock: vi.fn(),
  latestNodesState: {
    value: [] as Array<Record<string, unknown>>,
  },
}));

vi.mock('@/features/foldertree', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/foldertree')>();
  return {
    ...actual,
    createMasterFolderTreeTransactionAdapter: vi.fn(() => ({ apply: vi.fn() })),
    FolderTreeSearchBar: () => <div data-testid='folder-tree-search' />,
    FolderTreeViewportV2: (props: {
      renderNode: (input: any) => React.ReactNode;
    }) => (
      <div data-testid='folder-tree-viewport'>
        {latestNodesState.value.map((node, index) => (
          <div key={String(node.id ?? index)}>
            {props.renderNode({
              node,
              depth: 0,
              isSelected: false,
              isExpanded: false,
              isDragging: false,
              isSearchMatch: false,
              hasChildren: false,
              select: () => undefined,
              toggleExpand: () => undefined,
              startRename: () => undefined,
            })}
          </div>
        ))}
      </div>
    ),
    useMasterFolderTreeShell: (...args: Parameters<typeof actual.useMasterFolderTreeShell>) => {
      const options = args[0];
      latestNodesState.value = Array.isArray(options?.nodes) ? [...options.nodes] : [];
      return useMasterFolderTreeShellMock(...args);
    },
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

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: apiPostMock,
  },
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/features/kangur/admin/KangurLessonDocumentEditor', () => ({
  KangurLessonDocumentEditor: () => {
    const { lesson, document, onChange } = useLessonContentEditorContext();
    return (
      <div>
        <div data-testid='mock-doc-editor-title'>{lesson?.title ?? 'Mock Document Editor'}</div>
        <div data-testid='mock-doc-editor-block-count'>{document.blocks?.length ?? 0}</div>
        <div data-testid='mock-doc-editor-json'>{JSON.stringify(document)}</div>
        <button
          type='button'
          onClick={(): void =>
            onChange({
              version: 1,
              blocks: [
                {
                  id: 'content-text-1',
                  type: 'text',
                  html: '<p>Custom lesson content</p>',
                  align: 'left',
                },
              ],
            })
          }
        >
          Set sample content
        </button>
      </div>
    );
  },
}));

vi.mock('@/features/kangur/admin/KangurLessonNarrationPanel', () => ({
  KangurLessonNarrationPanel: () => <div data-testid='mock-narration-panel' />,
}));

vi.mock('@/shared/ui', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Breadcrumbs: () => <div data-testid='breadcrumbs' />,
  Button: ({
    children,
    onClick,
    disabled,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type='button' onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid='mock-dialog'>{children}</div> : null,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
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
  FormField: ({ label, children }: { label: string; children: React.ReactElement }) => {
    const id = label.replace(/\s+/g, '-').toLowerCase();
    return (
      <label>
        <span>{label}</span>
        {(React as any).cloneElement(children, { id })}
      </label>
    );
  },
  FormModal: ({
    isOpen,
    title,
    titleTestId,
    subtitle,
    children,
    onSave,
    onClose,
    saveText = 'Save',
    actions,
  }: {
    isOpen?: boolean;
    title: string;
    titleTestId?: string;
    subtitle?: string;
    children: React.ReactNode;
    onSave: () => void;
    onClose: () => void;
    saveText?: string;
    actions?: React.ReactNode;
  }) => {
    console.log('FormModal render:', { isOpen, title });
    return isOpen ? (
      <div data-testid='mock-form-modal'>
        <h2 data-testid={titleTestId}>{title}</h2>
        {subtitle ? <div>{subtitle}</div> : null}
        {actions}
        {children}
        <button type='button' onClick={onSave}>
          {saveText}
        </button>
        <button type='button' onClick={onClose}>
          Close
        </button>
      </div>
    ) : null;
  },
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  SectionHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
  SelectSimple: ({
    value,
    onValueChange,
    options,
    id,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    id?: string;
  }) => (
    <select id={id} value={value} onChange={(event): void => onValueChange?.(event.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  Skeleton: () => <div data-testid='skeleton' />,
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type='checkbox'
      checked={checked}
      onChange={(event): void => onCheckedChange?.(event.target.checked)}
    />
  ),
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
  TreeRow: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/shared/ui/templates/modals', () => ({
  ConfirmModal: () => null,
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: vi.fn(),
}));

vi.mock('@/features/kangur/admin/components/KangurAdminContentShell', () => ({
  KangurAdminContentShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { KANGUR_LESSON_DOCUMENTS_SETTING_KEY } from '@/features/kangur/lesson-documents';
import { AdminKangurLessonsManagerPage } from '@/features/kangur/admin/AdminKangurLessonsManagerPage';
import { KANGUR_LESSONS_SETTING_KEY } from '@/features/kangur/settings';

const baseLessons = [
  {
    id: 'kangur-lesson-clock',
    componentId: 'clock',
    contentMode: 'component',
    title: 'Nauka zegara',
    description: 'Odczytuj godziny',
    emoji: '🕐',
    color: 'from-indigo-400 to-purple-500',
    activeBg: 'bg-indigo-500',
    sortOrder: 1000,
    enabled: true,
  },
] as const;

vi.mock('@/features/kangur/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/settings')>();
  return {
    ...actual,
    createDefaultKangurLessons: vi.fn(() => []),
  };
});

describe('AdminKangurLessonsManagerPage content mode flow', () => {
  beforeEach(() => {
    mutateAsyncMock.mockReset();
    apiPostMock.mockReset();
    toastMock.mockReset();
    settingsStoreMock.get.mockReset();
    useMasterFolderTreeShellMock.mockReset();
    latestNodesState.value = [];

    useMasterFolderTreeShellMock.mockReturnValue({
      capabilities: {
        search: {
          enabled: false,
        },
      },
      search: {
        state: { isActive: false, matchNodeIds: new Set() },
        resultCountLabel: '',
        placeholder: 'Search...',
      },
      appearance: {
        rootDropUi: null,
      },
      controller: {},
      viewport: {
        scrollToNodeRef: { current: null },
      },
    });
    apiPostMock.mockResolvedValue({
      state: 'missing',
      voice: 'coral',
      latestCreatedAt: null,
      message: 'Audio has not been generated for this lesson draft yet.',
      segments: [],
    });
  });

  it('opens the content editor after creating a document-mode lesson and preserves the new lesson on content save', async () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_LESSONS_SETTING_KEY) {
        return JSON.stringify(baseLessons);
      }
      if (key === KANGUR_LESSON_DOCUMENTS_SETTING_KEY) {
        return '{}';
      }
      return null;
    });
    mutateAsyncMock.mockResolvedValue(undefined);

    render(<AdminKangurLessonsManagerPage />);

    fireEvent.click(screen.getByRole('button', { name: /add lesson/i }));
    fireEvent.change(screen.getByLabelText('Lesson Type'), {
      target: { value: 'calendar' },
    });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'SVG Playground' } });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Custom SVG lesson' },
    });
    fireEvent.change(screen.getByLabelText('Rendering Mode'), {
      target: { value: 'document' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create lesson/i }));

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));

    const initialLessonSave = mutateAsyncMock.mock.calls[0]?.[0] as { key: string; value: string };
    expect(initialLessonSave.key).toBe(KANGUR_LESSONS_SETTING_KEY);

    const createdLessons = JSON.parse(initialLessonSave.value) as Array<{
      title: string;
      contentMode: string;
      id: string;
    }>;
    const createdLesson = createdLessons.find((lesson) => lesson.title === 'SVG Playground');
    expect(createdLesson).toMatchObject({
      title: 'SVG Playground',
      contentMode: 'document',
    });

    expect(await screen.findByTestId('mock-doc-editor-title')).toHaveTextContent('SVG Playground');
    expect(screen.getByTestId('mock-doc-editor-block-count')).toHaveTextContent('2');

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'SVG Playground Updated' },
    });
    fireEvent.click(screen.getByRole('button', { name: /set sample content/i }));
    fireEvent.click(screen.getByRole('button', { name: /save content/i }));

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(3));

    const writes = mutateAsyncMock.mock.calls.map((call) => call[0]) as Array<
      { key?: string; value?: string } | undefined
    >;
    const documentSave = writes.find(
      (call) => call?.key === KANGUR_LESSON_DOCUMENTS_SETTING_KEY
    ) as { key: string; value: string } | undefined;
    expect(documentSave).toBeDefined();
    const documentStore = JSON.parse(documentSave!.value) as Record<
      string,
      { blocks: Array<{ type: string }> }
    >;
    expect(createdLesson).toBeDefined();
    expect(documentStore[createdLesson!.id]?.blocks[0]?.type).toBe('text');

    const lessonWrites = writes.filter(
      (call): call is { key: string; value: string } => call?.key === KANGUR_LESSONS_SETTING_KEY
    );
    const followupLessonSave = lessonWrites.at(-1);
    expect(followupLessonSave).toBeDefined();
    const followupLessons = JSON.parse(followupLessonSave!.value) as Array<{ title: string }>;
    expect(followupLessons.some((lesson) => lesson.title === 'SVG Playground Updated')).toBe(true);
  });

  it('clears custom content and returns the lesson to component mode', async () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_LESSONS_SETTING_KEY) {
        return JSON.stringify([
          {
            ...baseLessons[0],
            contentMode: 'document',
          },
        ]);
      }
      if (key === KANGUR_LESSON_DOCUMENTS_SETTING_KEY) {
        return JSON.stringify({
          'kangur-lesson-clock': {
            version: 1,
            blocks: [
              {
                id: 'text-1',
                type: 'text',
                html: '<p>Stored custom content</p>',
                align: 'left',
              },
            ],
          },
        });
      }
      return null;
    });
    mutateAsyncMock.mockResolvedValue(undefined);

    render(<AdminKangurLessonsManagerPage />);

    fireEvent.click(screen.getByRole('button', { name: /edit lesson content/i }));
    expect(screen.getByRole('button', { name: /clear content/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /clear content/i }));

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(2));

    const lessonSave = mutateAsyncMock.mock.calls[0]?.[0] as { key: string; value: string };
    expect(lessonSave.key).toBe(KANGUR_LESSONS_SETTING_KEY);
    const persistedLessons = JSON.parse(lessonSave.value) as Array<{ contentMode: string }>;
    expect(persistedLessons[0]?.contentMode).toBe('component');

    const documentSave = mutateAsyncMock.mock.calls[1]?.[0] as { key: string; value: string };
    expect(documentSave.key).toBe(KANGUR_LESSON_DOCUMENTS_SETTING_KEY);
    expect(JSON.parse(documentSave.value)).toEqual({});
  });

  it('opens geometry document lessons with the mosaic starter layout', async () => {
    settingsStoreMock.get.mockImplementation((key: string) => {      if (key === KANGUR_LESSONS_SETTING_KEY) {
        return JSON.stringify([
          {
            ...baseLessons[0],
            id: 'kangur-lesson-geometry-shapes',
            componentId: 'geometry_shapes',
            title: 'Figury geometryczne',
            contentMode: 'document',
          },
        ]);
      }
      if (key === KANGUR_LESSON_DOCUMENTS_SETTING_KEY) {
        return '{}';
      }
      return null;
    });

    render(<AdminKangurLessonsManagerPage />);

    fireEvent.click(screen.getByRole('button', { name: /edit lesson content/i }));

    expect(await screen.findByTestId('mock-doc-editor-title')).toHaveTextContent('Figury geometryczne');
    expect(screen.getByTestId('mock-doc-editor-block-count')).toHaveTextContent('2');
    expect(screen.getByTestId('mock-doc-editor-json')).toHaveTextContent('"denseFill":true');
    expect(screen.getByTestId('mock-doc-editor-json')).toHaveTextContent('"columnStart":1');
    expect(screen.getByTestId('mock-doc-editor-json')).toHaveTextContent('"rowStart":1');
    });

    it('imports the legacy lesson structure into the document editor draft', async () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_LESSONS_SETTING_KEY) {
        return JSON.stringify(baseLessons);
      }
      if (key === KANGUR_LESSON_DOCUMENTS_SETTING_KEY) {
        return '{}';
      }
      return null;
    });

    render(<AdminKangurLessonsManagerPage />);

    fireEvent.click(screen.getByRole('button', { name: /edit lesson content/i }));
    expect(await screen.findByTestId('mock-doc-editor-block-count')).toHaveTextContent('2');

    fireEvent.click(screen.getByRole('button', { name: /import legacy/i }));
    await waitFor(() => {
      expect(screen.getByTestId('mock-doc-editor-json')).toHaveTextContent('"Overview"');
    });
    expect(screen.getByTestId('mock-doc-editor-json')).toHaveTextContent(
      'Co pokazuje krótka wskazówka?'
    );
    expect(screen.getByTestId('mock-doc-editor-json')).toHaveTextContent('"type":"activity"');
    expect(toastMock).toHaveBeenCalledWith(
      expect.stringContaining('Legacy lesson imported'),
      expect.objectContaining({ variant: 'success' })
    );
  });

  it('bulk-imports current lessons into document drafts and switches them to document mode', async () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_LESSONS_SETTING_KEY) {
        return JSON.stringify([
          ...baseLessons,
          {
            ...baseLessons[0],
            id: 'kangur-lesson-adding',
            componentId: 'adding',
            title: 'Dodawanie',
            description: 'Dodawaj liczby krok po kroku',
            emoji: '➕',
            sortOrder: 2000,
          },
        ]);
      }
      if (key === KANGUR_LESSON_DOCUMENTS_SETTING_KEY) {
        return '{}';
      }
      return null;
    });
    mutateAsyncMock.mockResolvedValue(undefined);

    render(<AdminKangurLessonsManagerPage />);

    fireEvent.click(screen.getByRole('button', { name: /import all to editor/i }));

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(1));

    const documentSave = mutateAsyncMock.mock.calls[0]?.[0] as { key: string; value: string };
    expect(documentSave.key).toBe(KANGUR_LESSON_DOCUMENTS_SETTING_KEY);
    const documentStore = JSON.parse(documentSave.value) as Record<
      string,
      { pages?: Array<{ title?: string; blocks: Array<{ type: string; activityId?: string }> }> }
    >;
    expect(documentStore['kangur-lesson-clock']?.pages?.[0]?.title).toBe('Overview');
    expect(
      documentStore['kangur-lesson-clock']?.pages?.some((page) =>
        page.blocks.some(
          (block) => block.type === 'activity' && block.activityId === 'clock-training'
        )
      )
    ).toBe(true);
    expect(
      documentStore['kangur-lesson-adding']?.pages?.some((page) =>
        page.blocks.some((block) => block.type === 'activity' && block.activityId === 'adding-ball')
      )
    ).toBe(true);

    expect(toastMock).toHaveBeenCalledWith(
      expect.stringContaining('Imported 2 lessons to modular editor.'),
      expect.objectContaining({ variant: 'success' })
    );
  });

  it('filters lessons by editorial state', async () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_LESSONS_SETTING_KEY) {
        return JSON.stringify([
          ...baseLessons,
          {
            ...baseLessons[0],
            id: 'kangur-lesson-calendar',
            componentId: 'calendar',
            title: 'Kalendarz',
            description: 'Dni i miesiące',
            emoji: '📅',
            sortOrder: 2000,
            enabled: false,
          },
        ]);
      }
      if (key === KANGUR_LESSON_DOCUMENTS_SETTING_KEY) {
        return JSON.stringify({
          'kangur-lesson-clock': {
            version: 1,
            blocks: [
              {
                id: 'text-1',
                type: 'text',
                html: '<p>Stored custom content</p>',
                align: 'left',
              },
            ],
          },
        });
      }
      return null;
    });

    render(<AdminKangurLessonsManagerPage />);

    expect(screen.getByText('Nauka zegara')).toBeInTheDocument();
    expect(screen.getByText('Kalendarz')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /custom content/i }));

    expect(screen.getByText('Nauka zegara')).toBeInTheDocument();
    expect(screen.queryByText('Kalendarz')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /hidden/i }));

    expect(screen.queryByText('Nauka zegara')).not.toBeInTheDocument();
    expect(screen.getByText('Kalendarz')).toBeInTheDocument();
  });
});
