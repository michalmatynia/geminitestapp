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
  useMasterFolderTreeSearch: () => null,
  useMasterFolderTreeShell: () => ({
    profile: {},
    capabilities: {
      search: {},
    },
    appearance: {
      rootDropUi: null,
      resolveIcon: () => null,
    },
    controller: {
      expandNode: vi.fn(),
      nodes: [],
      renameDraft: '',
      cancelRename: vi.fn(),
      updateRenameDraft: vi.fn(),
    },
    viewport: {
      scrollToNodeRef: {
        current: null,
      },
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
