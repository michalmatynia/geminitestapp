/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiPathsMasterTreePanel } from '../AiPathsMasterTreePanel';

vi.mock('@/features/ai/ai-paths/utils/ai-paths-master-tree-adapter', () => ({
  createAiPathsMasterTreeAdapter: () => ({}),
}));

vi.mock('@/shared/hooks/ui/usePrompt', () => ({
  usePrompt: () => ({
    prompt: vi.fn(),
    PromptInputModal: () => null,
  }),
}));

vi.mock('@/shared/utils/folder-tree-profiles-v2', () => ({
  canNestTreeNodeV2: () => true,
}));

vi.mock('@/shared/lib/foldertree/public', () => ({
  FolderTreeViewportV2: ({
    controller,
    renderNode,
  }: {
    controller: { nodes: Array<Record<string, unknown>> };
    renderNode: (input: Record<string, unknown>) => React.ReactNode;
  }) => (
    <div data-testid='folder-tree-viewport'>
      {controller.nodes.map((node) => (
        <React.Fragment key={String(node['id'])}>
          {renderNode({
            node,
            depth: 0,
            hasChildren: false,
            isExpanded: true,
            isSelected: false,
            isRenaming: false,
            isDropTarget: false,
            dropPosition: null,
            select: vi.fn(),
            toggleExpand: vi.fn(),
            startRename: vi.fn(),
          })}
        </React.Fragment>
      ))}
    </div>
  ),
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
  useMasterFolderTreeShell: ({ nodes }: { nodes: Array<Record<string, unknown>> }) => ({
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
      nodes,
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

vi.mock('@/shared/ui/data-display.public', () => ({
  TreeCaret: () => <span data-testid='tree-caret' />,
  TreeContextMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TreeRow: ({
    children,
    className,
    role,
    'aria-level': ariaLevel,
    'aria-selected': ariaSelected,
  }: {
    children: React.ReactNode;
    className?: string;
    role?: string;
    'aria-level'?: number;
    'aria-selected'?: boolean;
  }) => (
    <div className={className} role={role} aria-level={ariaLevel} aria-selected={ariaSelected}>
      {children}
    </div>
  ),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Button: ({
    children,
    onClick,
    type = 'button',
    className,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    type?: 'button' | 'submit' | 'reset';
    className?: string;
    disabled?: boolean;
  }) => (
    <button type={type} onClick={onClick} className={className} disabled={disabled}>
      {children}
    </button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

const buildProps = (overrides: Partial<React.ComponentProps<typeof AiPathsMasterTreePanel>> = {}) => ({
  activePathId: 'path-1',
  handleCreatePath: vi.fn(),
  handleDeletePath: vi.fn(async () => undefined),
  handleDuplicatePath: vi.fn(),
  handleMoveFolder: vi.fn(async () => undefined),
  handleMovePathToFolder: vi.fn(async () => undefined),
  handleRenameFolder: vi.fn(async () => undefined),
  handleSwitchPath: vi.fn(),
  paths: [
    {
      id: 'path-1',
      name: 'Path One',
      createdAt: '2026-04-10T10:00:00.000Z',
      updatedAt: '2026-04-10T10:00:00.000Z',
      folderPath: '',
    },
  ],
  toast: vi.fn(),
  ...overrides,
});

describe('AiPathsMasterTreePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps row click as selection-only in list mode and exposes preview/delete actions', () => {
    const props = buildProps({
      pathClickBehavior: 'select',
      showPathHoverActions: true,
      onPathOpen: vi.fn(),
    });

    render(<AiPathsMasterTreePanel {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Path One' }));

    expect(props.handleSwitchPath).not.toHaveBeenCalled();
    expect(props.onPathOpen).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Preview Path One' }));

    expect(props.handleSwitchPath).toHaveBeenCalledWith('path-1');
    expect(props.onPathOpen).toHaveBeenCalledWith('path-1');

    fireEvent.click(screen.getByRole('button', { name: 'Delete Path One' }));

    expect(props.handleDeletePath).toHaveBeenCalledWith('path-1');
  });

  it('keeps single-click open behavior in canvas mode', () => {
    const props = buildProps();

    render(<AiPathsMasterTreePanel {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Path One' }));

    expect(props.handleSwitchPath).toHaveBeenCalledWith('path-1');
    expect(screen.queryByRole('button', { name: 'Preview Path One' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Path One' })).not.toBeInTheDocument();
  });
});
