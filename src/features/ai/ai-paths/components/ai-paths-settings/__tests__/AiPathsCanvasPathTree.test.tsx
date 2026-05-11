/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AiPathsCanvasPathTree } from '../sections/AiPathsCanvasPathTree';

let pageContextMock: Record<string, unknown> = {};

const handleCreatePathMock = vi.fn();

vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom');
  return {
    ...actual,
    createPortal: (node: unknown) => node,
  };
});

vi.mock('../AiPathsSettingsPageContext', () => ({
  useAiPathsSettingsPageContext: () => pageContextMock,
  useAiPathsSettingsPagePathActionsContext: () => pageContextMock,
  useAiPathsSettingsPageWorkspaceContext: () => pageContextMock,
}));

vi.mock('@/features/ai/ai-paths/utils/ai-paths-master-tree-adapter', () => ({
  createAiPathsMasterTreeAdapter: () => ({}),
}));

vi.mock('@/shared/lib/foldertree/public', () => ({
  FolderTreeViewportV2: () => <div data-testid='folder-tree-viewport' />,
  MasterFolderTreeViewport: () => <div data-testid='master-folder-tree-viewport' />,
  handleMasterTreeDrop: vi.fn(),
  resolveFolderTreeIconSet: (
    _resolveIcon: unknown,
    input: Record<
      string,
      {
        fallback: React.ComponentType<{ className?: string }>;
      }
    >
  ) => ({
    FolderClosedIcon: input['FolderClosedIcon'].fallback,
    FolderOpenIcon: input['FolderOpenIcon'].fallback,
    FileIcon: input['FileIcon'].fallback,
    DragHandleIcon: input['DragHandleIcon'].fallback,
  }),
  useMasterFolderTreeSearch: () => ({
    query: '',
    effectiveQuery: '',
    isActive: false,
    config: {
      enabled: false,
      debounceMs: 0,
      filterMode: 'highlight',
      matchFields: ['name'],
      minQueryLength: 1,
    },
    matchNodeIds: new Set(),
    results: [],
    filteredNodes: [],
    filteredExpandedNodeIds: [],
  }),
  useMasterFolderTreeViewModel: () => ({
    profile: {
      version: 2,
      placeholders: {
        preset: 'classic',
        style: {},
        emphasis: 'soft',
        rootDropLabel: 'Drop here',
        inlineDropLabel: 'Drop here',
      },
      icons: {
        slots: {
          folderClosed: 'folderClosed',
          folderOpen: 'folderOpen',
          file: 'file',
          root: 'root',
          dragHandle: 'drag',
        },
        byKind: {},
      },
      nesting: {
        defaultAllow: true,
        blockedTargetKinds: [],
        rules: [],
      },
      interactions: {
        selectionBehavior: 'single',
      },
      keyboard: undefined,
      multiSelect: undefined,
      search: undefined,
      statusIcons: undefined,
      badges: undefined,
    },
    capabilities: {
      keyboard: {
        enabled: true,
        arrowNavigation: true,
        enterToRename: true,
        deleteKey: false,
      },
      multiSelect: {
        enabled: false,
        ctrlClick: true,
        shiftClick: true,
        selectAll: true,
      },
      search: {
        enabled: false,
        debounceMs: 0,
        filterMode: 'highlight',
        matchFields: ['name'],
        minQueryLength: 1,
      },
    },
    appearance: {
      rootDropUi: null,
      resolveIcon: () => () => null,
      placeholderClasses: {
        rootIdle: '',
        rootActive: '',
        lineIdle: '',
        lineActive: '',
        badgeIdle: '',
        badgeActive: '',
      },
    },
    controller: {
      expandNode: vi.fn(),
      selectNode: vi.fn(),
      replaceNodes: vi.fn(),
      updateRenameDraft: vi.fn(),
      cancelRename: vi.fn(),
      nodes: [],
      renameDraft: '',
      expandedNodeIds: new Set(),
      selectedNodeId: null,
      isApplying: false,
      lastError: null,
      setExpandedNodeIds: vi.fn(),
      expandToNode: vi.fn(),
    },
    searchState: {
      query: '',
      effectiveQuery: '',
      isActive: false,
      config: {
        enabled: false,
        debounceMs: 0,
        filterMode: 'highlight',
        matchFields: ['name'],
        minQueryLength: 1,
      },
      matchNodeIds: new Set(),
      results: [],
      filteredNodes: [],
      filteredExpandedNodeIds: [],
    },
    viewport: {
      scrollToNodeRef: {
        current: null,
      },
      scrollToNode: vi.fn(),
      revealNode: vi.fn(),
    },
  }),
  useMasterFolderTreeShell: () => ({
    controller: {
      expandNode: vi.fn(),
      selectNode: vi.fn(),
      replaceNodes: vi.fn(),
      updateRenameDraft: vi.fn(),
      cancelRename: vi.fn(),
      nodes: [],
      renameDraft: '',
      expandedNodeIds: new Set(),
      selectedNodeId: null,
      isApplying: false,
      lastError: null,
      setExpandedNodeIds: vi.fn(),
      expandToNode: vi.fn(),
    },
    profile: {
      version: 2,
      placeholders: {
        preset: 'classic',
        style: {},
        emphasis: 'soft',
        rootDropLabel: 'Drop here',
        inlineDropLabel: 'Drop here',
      },
      icons: {
        slots: {
          folderClosed: 'folderClosed',
          folderOpen: 'folderOpen',
          file: 'file',
          root: 'root',
          dragHandle: 'drag',
        },
        byKind: {},
      },
      nesting: {
        defaultAllow: true,
        blockedTargetKinds: [],
        rules: [],
      },
      interactions: {
        selectionBehavior: 'single',
      },
      keyboard: undefined,
      multiSelect: undefined,
      search: undefined,
      statusIcons: undefined,
      badges: undefined,
    },
    capabilities: {
      keyboard: {
        enabled: true,
        arrowNavigation: true,
        enterToRename: true,
        deleteKey: false,
      },
      multiSelect: {
        enabled: false,
        ctrlClick: true,
        shiftClick: true,
        selectAll: true,
      },
      search: {
        enabled: false,
        debounceMs: 0,
        filterMode: 'highlight',
        matchFields: ['name'],
        minQueryLength: 1,
      },
    },
    appearance: {
      rootDropUi: null,
      resolveIcon: () => () => null,
      placeholderClasses: {
        rootIdle: '',
        rootActive: '',
        lineIdle: '',
        lineActive: '',
        badgeIdle: '',
        badgeActive: '',
      },
    },
    panel: {},
    viewport: {
      scrollToNodeRef: {
        current: null,
      },
      scrollToNode: vi.fn(),
      revealNode: vi.fn(),
    },
  }),
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  FolderTreePanel: ({
    header,
    children,
  }: {
    header: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      {header}
      {children}
    </div>
  ),
}));

const buildPageContext = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  activePathId: 'path-main',
  handleCreatePath: handleCreatePathMock,
  handleDeletePath: vi.fn(async () => undefined),
  handleDuplicatePath: vi.fn(),
  handleMoveFolder: vi.fn(async () => undefined),
  handleMovePathToFolder: vi.fn(async () => undefined),
  handleRenameFolder: vi.fn(async () => undefined),
  handleSwitchPath: vi.fn(),
  paths: [
    {
      id: 'path-main',
      name: 'Path Main',
      createdAt: '2026-03-05',
      updatedAt: '2026-03-05',
      folderPath: 'drafts/seo',
    },
  ],
  toast: vi.fn(),
  ...overrides,
});

describe('AiPathsCanvasPathTree', () => {
  afterEach(() => {
    handleCreatePathMock.mockReset();
    vi.clearAllMocks();
  });

  it('creates a new path inside the active path folder', () => {
    pageContextMock = buildPageContext();

    render(<AiPathsCanvasPathTree />);

    fireEvent.click(screen.getByRole('button', { name: 'Path' }));

    expect(handleCreatePathMock).toHaveBeenCalledWith({ folderPath: 'drafts/seo' });
  });

  it('creates a nested group path from the prompt dialog', async () => {
    pageContextMock = buildPageContext();

    render(<AiPathsCanvasPathTree />);

    fireEvent.click(screen.getByRole('button', { name: 'Group' }));

    expect(screen.getByRole('dialog', { name: 'New Path Group' })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Group name' }), {
      target: { value: 'Translations' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Group' }));

    await waitFor(() => {
      expect(handleCreatePathMock).toHaveBeenCalledWith({
        folderPath: 'drafts/seo/Translations',
      });
    });
  });
});
