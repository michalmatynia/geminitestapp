/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LabeledOptionDto } from '@/shared/contracts/base';

type UseLessonContentEditorContextType =
  typeof import('../context/LessonContentEditorContext')['useLessonContentEditorContext'];
type AdminKangurLessonsManagerPageType =
  typeof import('@/features/kangur/admin/AdminKangurLessonsManagerPage')['AdminKangurLessonsManagerPage'];

let useLessonContentEditorContext: UseLessonContentEditorContextType;
let AdminKangurLessonsManagerPage: AdminKangurLessonsManagerPageType;

const { withKangurClientError, withKangurClientErrorSync } = globalThis.__kangurClientErrorMocks();
const {
  updateLessonsMock,
  updateLessonDocumentsMock,
  updateLessonTemplatesMock,
  apiPostMock,
  toastMock,
  lessonsState,
  lessonDocumentsState,
  lessonTemplatesState,
  useMasterFolderTreeShellMock,
  latestNodesState,
  lessonTemplateLocaleMock,
  lessonDocumentLocaleMock,
} = vi.hoisted(() => ({
  updateLessonsMock: vi.fn(),
  updateLessonDocumentsMock: vi.fn(),
  updateLessonTemplatesMock: vi.fn(),
  apiPostMock: vi.fn(),
  toastMock: vi.fn(),
  lessonsState: {
    value: [] as Array<Record<string, unknown>>,
  },
  lessonDocumentsState: {
    value: {} as Record<string, unknown>,
  },
  lessonTemplatesState: {
    value: [] as Array<Record<string, unknown>>,
  },
  useMasterFolderTreeShellMock: vi.fn(),
  latestNodesState: {
    value: [] as Array<Record<string, unknown>>,
  },
  lessonTemplateLocaleMock: vi.fn(),
  lessonDocumentLocaleMock: vi.fn(),
}));

vi.mock('@/shared/lib/foldertree/public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/foldertree/public')>();
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

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: apiPostMock,
  },
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessons', () => ({
  useKangurLessons: () => ({
    data: lessonsState.value,
    isLoading: false,
    error: null,
  }),
  useKangurLessonDocuments: (options?: { locale?: string | null }) => {
    lessonDocumentLocaleMock(options?.locale ?? null);
    return {
      data: lessonDocumentsState.value,
      isLoading: false,
      error: null,
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
    return { data: lessonTemplatesState.value };
  },
  useUpdateKangurLessonTemplates: () => ({
    mutateAsync: updateLessonTemplatesMock,
    isPending: false,
  }),
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

vi.mock('@/features/kangur/shared/ui', () => ({
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
  FormModal: (props: {
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
    const {
      isOpen,
      title,
      titleTestId,
      subtitle,
      children,
      onSave,
      onClose,
      saveText = 'Save',
      actions,
    } = props;

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
    onChange,
    options,
    id,
    ariaLabel,
    title,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    onChange?: (value: string) => void;
    options: Array<LabeledOptionDto<string>>;
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
        onValueChange?.(event.target.value);
        onChange?.(event.target.value);
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

vi.mock('@/features/kangur/shared/ui/templates/modals', () => ({
  ConfirmModal: () => null,
}));

vi.mock('@/features/kangur/observability/client', () => ({
  ...(() => {
    const { withKangurClientError, withKangurClientErrorSync } =
      globalThis.__kangurClientErrorMocks();
    return { withKangurClientError, withKangurClientErrorSync };
  })(),
}));

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
] as const;

vi.mock('@/features/kangur/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/settings')>();
  return {
    ...actual,
    createDefaultKangurLessons: vi.fn(() => []),
  };
});

describe('AdminKangurLessonsManagerPage content mode flow', () => {
  beforeEach(async () => {
    vi.resetModules();
    updateLessonsMock.mockReset();
    updateLessonDocumentsMock.mockReset();
    updateLessonTemplatesMock.mockReset();
    apiPostMock.mockReset();
    toastMock.mockReset();
    lessonTemplateLocaleMock.mockReset();
    lessonDocumentLocaleMock.mockReset();
    useMasterFolderTreeShellMock.mockReset();
    latestNodesState.value = [];
    lessonsState.value = [...baseLessons];
    lessonDocumentsState.value = {};
    lessonTemplatesState.value = [];

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
    ({ useLessonContentEditorContext } = await import('../context/LessonContentEditorContext'));
    ({ AdminKangurLessonsManagerPage } = await import(
      '@/features/kangur/admin/AdminKangurLessonsManagerPage'
    ));
  });

  it('opens the content editor after creating a document-mode lesson and preserves the new lesson on content save', async () => {
    lessonsState.value = [...baseLessons];
    lessonDocumentsState.value = {};
    updateLessonsMock.mockResolvedValue(undefined);
    updateLessonDocumentsMock.mockResolvedValue(undefined);

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

    await waitFor(() => expect(updateLessonsMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(updateLessonTemplatesMock).toHaveBeenCalledTimes(1));

    const createdLessons = updateLessonsMock.mock.calls[0]?.[0] as Array<{
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

    await waitFor(() => expect(updateLessonDocumentsMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(updateLessonsMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(updateLessonTemplatesMock).toHaveBeenCalledTimes(2));

    const documentStore = updateLessonDocumentsMock.mock.calls[0]?.[0] as Record<
      string,
      { blocks: Array<{ type: string }> }
    >;
    expect(createdLesson).toBeDefined();
    expect(documentStore[createdLesson!.id]?.blocks[0]?.type).toBe('text');

    const followupLessons = updateLessonsMock.mock.calls.at(-1)?.[0] as Array<{
      title: string;
    }>;
    expect(followupLessons.some((lesson) => lesson.title === 'SVG Playground Updated')).toBe(true);
  });

  it('saves localized template copy without overwriting the structural lesson when editing a non-default locale', async () => {
    lessonTemplatesState.value = [
      {
        componentId: 'clock',
        subject: 'maths',
        ageGroup: 'ten_year_old',
        label: 'Clock',
        title: 'Clock basics',
        description: 'Learn to tell time',
        emoji: '🕐',
        color: 'kangur-gradient-accent-indigo-reverse',
        activeBg: 'bg-indigo-500',
        sortOrder: 100,
      },
    ];
    updateLessonsMock.mockResolvedValue(undefined);
    updateLessonTemplatesMock.mockResolvedValue(undefined);

    render(<AdminKangurLessonsManagerPage />);

    fireEvent.change(screen.getByLabelText('Content locale'), {
      target: { value: 'en' },
    });
    expect(lessonTemplateLocaleMock).toHaveBeenLastCalledWith('en');
    expect(lessonDocumentLocaleMock).toHaveBeenLastCalledWith('en');

    fireEvent.click(screen.getByRole('button', { name: /^edit lesson$/i }));
    expect(screen.getByDisplayValue('Clock basics')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Clock mastery' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Practice reading clocks in English' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save lesson/i }));

    await waitFor(() => expect(updateLessonsMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(updateLessonTemplatesMock).toHaveBeenCalledTimes(1));

    const persistedLessons = updateLessonsMock.mock.calls[0]?.[0] as Array<{
      id: string;
      title: string;
      description: string;
    }>;
    expect(
      persistedLessons.find((lesson) => lesson.id === 'kangur-lesson-clock')
    ).toMatchObject({
      title: 'Nauka zegara',
      description: 'Odczytuj godziny',
    });

    const persistedTemplates = updateLessonTemplatesMock.mock.calls[0]?.[0] as Array<{
      componentId: string;
      title: string;
      description: string;
      label: string;
    }>;
    expect(
      persistedTemplates.find((template) => template.componentId === 'clock')
    ).toMatchObject({
      label: 'Clock',
      title: 'Clock mastery',
      description: 'Practice reading clocks in English',
    });
  });

  it('clears custom content and returns the lesson to component mode', async () => {
    lessonsState.value = [
      {
        ...baseLessons[0],
        contentMode: 'document',
      },
    ];
    lessonDocumentsState.value = {
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
    };
    updateLessonsMock.mockResolvedValue(undefined);
    updateLessonDocumentsMock.mockResolvedValue(undefined);

    render(<AdminKangurLessonsManagerPage />);

    fireEvent.click(screen.getByRole('button', { name: /edit lesson content/i }));
    expect(screen.getByRole('button', { name: /clear content/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /clear content/i }));

    await waitFor(() => expect(updateLessonsMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(updateLessonDocumentsMock).toHaveBeenCalledTimes(1));

    const persistedLessons = updateLessonsMock.mock.calls[0]?.[0] as Array<{
      contentMode: string;
    }>;
    expect(persistedLessons[0]?.contentMode).toBe('component');

    expect(updateLessonDocumentsMock.mock.calls[0]?.[0]).toEqual({});
  });

  it('opens geometry document lessons with the mosaic starter layout', async () => {
    lessonsState.value = [
      {
        ...baseLessons[0],
        id: 'kangur-lesson-geometry-shapes',
        componentId: 'geometry_shapes',
        title: 'Figury geometryczne',
        contentMode: 'document',
      },
    ];
    lessonDocumentsState.value = {};

    render(<AdminKangurLessonsManagerPage />);

    fireEvent.click(screen.getByRole('button', { name: /edit lesson content/i }));

    expect(await screen.findByTestId('mock-doc-editor-title')).toHaveTextContent('Figury geometryczne');
    expect(screen.getByTestId('mock-doc-editor-block-count')).toHaveTextContent('2');
    expect(screen.getByTestId('mock-doc-editor-json')).toHaveTextContent('"denseFill":true');
    expect(screen.getByTestId('mock-doc-editor-json')).toHaveTextContent('"columnStart":1');
    expect(screen.getByTestId('mock-doc-editor-json')).toHaveTextContent('"rowStart":1');
  });

  it('imports the legacy lesson structure into the document editor draft', async () => {
    lessonsState.value = [...baseLessons];
    lessonDocumentsState.value = {};

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
      expect.stringContaining('Legacy content imported'),
      expect.objectContaining({ variant: 'success' })
    );
  });

  it('bulk-imports current lessons into document drafts and switches them to document mode', async () => {
    lessonsState.value = [
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
    ];
    lessonDocumentsState.value = {};
    updateLessonDocumentsMock.mockResolvedValue(undefined);

    render(<AdminKangurLessonsManagerPage />);

    fireEvent.click(screen.getByRole('button', { name: /import all to editor/i }));

    await waitFor(() => expect(updateLessonDocumentsMock).toHaveBeenCalledTimes(1));

    const documentStore = updateLessonDocumentsMock.mock.calls[0]?.[0] as Record<
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
    lessonsState.value = [
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
    ];
    lessonDocumentsState.value = {
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
    };

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
