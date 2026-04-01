import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminMenuSettingsContextValue } from '@/features/admin/context/AdminMenuSettingsContext';
import { AdminMenuSettingsPage } from '@/features/admin/pages/AdminMenuSettingsPage';

const mockSelectNode = vi.fn();
const mockExpandNode = vi.fn();
const mockDropNodeToRoot = vi.fn(async () => ({ success: true, ok: true }));

const mockController = {
  selectedNodeId: 'system',
  selectedNode: { id: 'system', name: 'System' },
  selectNode: mockSelectNode,
  expandNode: mockExpandNode,
  dropNodeToRoot: mockDropNodeToRoot,
  expandToNode: vi.fn(),
  scrollToNode: vi.fn(),
};

const useMasterFolderTreeShellMock = vi.fn(() => ({
  appearance: { rootDropUi: undefined },
  controller: mockController,
  viewport: { scrollToNodeRef: { current: null } },
}));

vi.mock('@/shared/lib/foldertree/public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/foldertree/public')>();
  return {
    ...actual,
    createMasterFolderTreeTransactionAdapter: ({
      onApply,
    }: {
      onApply?: (tx: {
        nextNodes: unknown[];
        previousNodes: unknown[];
        operation: { type: string };
      }) => Promise<void> | void;
    }) => ({
      prepare: async (tx: unknown) => ({ tx, preparedAt: Date.now() }),
      apply: async (tx: {
        nextNodes: unknown[];
        previousNodes: unknown[];
        operation: { type: string };
      }) => {
        await onApply?.(tx);
        return { tx, appliedAt: Date.now() };
      },
      commit: async () => {},
      rollback: async () => {},
    }),
    useMasterFolderTreeShell: (...args: unknown[]) => useMasterFolderTreeShellMock(...args),
    FolderTreeViewportV2: () => <div data-testid='folder-tree-viewport' />,
  };
});

let mockContextValue: AdminMenuSettingsContextValue;

vi.mock('@/features/admin/context/AdminMenuSettingsContext', async () => {
  const ReactModule = await import('react');
  return {
    AdminMenuSettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useAdminMenuSettings: () => mockContextValue,
  };
});

const createContextValue = (): AdminMenuSettingsContextValue => {
  const addBuiltInNode = vi.fn();

  return {
    favorites: [],
    sectionColors: {},
    customEnabled: true,
    customNav: [
      {
        id: 'system',
        label: 'System',
        href: '/admin/settings',
      },
    ],
    query: '',
    libraryQuery: '',
    sections: [],
    flattened: [],
    favoritesSet: new Set<string>(),
    favoritesList: [],
    filteredItems: [],
    layoutMasterNodes: [
      {
        id: 'system',
        type: 'folder',
        kind: 'folder',
        parentId: null,
        name: 'System',
        path: 'system',
        sortOrder: 0,
        metadata: {
          adminMenu: {
            nodeId: 'system',
            isBuiltIn: true,
            semantic: 'link',
            href: '/admin/settings',
          },
        },
      },
    ],
    layoutNodeStateById: new Map([
      [
        'system',
        {
          id: 'system',
          label: 'System',
          semantic: 'link',
          href: '/admin/settings',
          isBuiltIn: true,
        },
      ],
    ]),
    libraryItems: [
      {
        id: 'system/settings/menu',
        label: 'Admin Menu',
        href: '/admin/settings/menu',
        parents: ['System', 'Settings'],
        item: {
          id: 'system/settings/menu',
          label: 'Admin Menu',
          href: '/admin/settings/menu',
        },
      },
    ],
    libraryItemMap: new Map(),
    customIds: new Set<string>(['system']),
    filteredLibraryItems: [
      {
        id: 'system/settings/menu',
        label: 'Admin Menu',
        href: '/admin/settings/menu',
        parents: ['System', 'Settings'],
        item: {
          id: 'system/settings/menu',
          label: 'Admin Menu',
          href: '/admin/settings/menu',
        },
      },
    ],
    isDirty: false,
    isDefaultState: false,
    isSaving: false,
    setQuery: vi.fn(),
    setLibraryQuery: vi.fn(),
    setCustomEnabled: vi.fn(),
    handleToggleFavorite: vi.fn(),
    moveFavorite: vi.fn(),
    updateSectionColor: vi.fn(),
    handleAddRootNode: vi.fn(() => 'custom-root'),
    addCustomChildNode: vi.fn(() => 'custom-child'),
    removeCustomNodeById: vi.fn(),
    updateCustomNodeLabelById: vi.fn(),
    updateCustomNodeHrefById: vi.fn(),
    updateCustomNodeSemanticById: vi.fn(),
    replaceCustomNavFromMasterNodes: vi.fn(),
    addBuiltInNode,
    handleSave: vi.fn(async () => {}),
    handleReset: vi.fn(),
  };
};

describe('AdminMenuSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContextValue = createContextValue();
  });

  it('renders master folder tree layout section', () => {
    render(<AdminMenuSettingsPage />);

    expect(screen.getByText('Menu Builder')).toBeInTheDocument();
    expect(screen.getByTestId('folder-tree-viewport')).toBeInTheDocument();
    expect(screen.getByText('Selected Item')).toBeInTheDocument();
  });

  it('keeps built-in selected node fields read-only', () => {
    render(<AdminMenuSettingsPage />);

    expect(screen.getByDisplayValue('System')).toBeDisabled();
    expect(screen.getByDisplayValue('/admin/settings')).toBeDisabled();
    expect(
      screen.getByText(
        'Built-in node metadata is locked. You can still move or remove this node from the custom layout.'
      )
    ).toBeInTheDocument();
  });

  it('adds built-in node from library pane', () => {
    render(<AdminMenuSettingsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(mockContextValue.addBuiltInNode).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'system/settings/menu' })
    );
  });
});
