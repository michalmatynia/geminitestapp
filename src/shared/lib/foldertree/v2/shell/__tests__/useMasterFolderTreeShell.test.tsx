import { renderHook, waitFor } from '@testing-library/react';
import { Folder } from 'lucide-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMasterFolderTreeShell } from '@/shared/lib/foldertree/v2/shell/useMasterFolderTreeShell';
import { getFolderTreeUiStateV2Key } from '@/shared/lib/foldertree/v2/settings';
import type { FolderTreeInstance } from '@/shared/utils/folder-tree-profiles-v2';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import { createDefaultFolderTreeProfilesV2 } from '@/shared/utils/folder-tree-profiles-v2';

const {
  useSettingsStoreMock,
  useUpdateSettingMock,
  useUpdateSettingsBulkMock,
  useFolderTreeInstanceV2Mock,
  useFolderTreeProfileConfigMock,
  toastMock,
} = vi.hoisted(() => ({
  useSettingsStoreMock: vi.fn(),
  useUpdateSettingMock: vi.fn(),
  useUpdateSettingsBulkMock: vi.fn(),
  useFolderTreeInstanceV2Mock: vi.fn(),
  useFolderTreeProfileConfigMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: (): unknown => useSettingsStoreMock(),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSetting: (): unknown => useUpdateSettingMock(),
  useUpdateSettingsBulk: (): unknown => useUpdateSettingsBulkMock(),
}));

vi.mock('@/shared/lib/foldertree/v2/hooks/useFolderTreeInstanceV2', () => ({
  useFolderTreeInstanceV2: (options: unknown): unknown => useFolderTreeInstanceV2Mock(options),
}));

vi.mock('@/shared/lib/foldertree/v2/shell/useFolderTreeProfileConfig', () => ({
  useFolderTreeProfileConfig: (instance: FolderTreeInstance): unknown =>
    useFolderTreeProfileConfigMock(instance),
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: (): { toast: (message: string, options?: unknown) => void } => ({
    toast: toastMock,
  }),
}));

type MockSettingsStore = {
  map: Map<string, string>;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  get: (key: string) => string | undefined;
  getBoolean: (key: string, fallback?: boolean) => boolean;
  getNumber: (key: string, fallback?: number) => number | undefined;
  refetch: () => void;
};

const createSettingsStore = ({
  entries = {},
  isLoading = false,
  isFetching = false,
}: {
  entries?: Record<string, string>;
  isLoading?: boolean;
  isFetching?: boolean;
}): MockSettingsStore => {
  const map = new Map<string, string>(Object.entries(entries));
  return {
    map,
    isLoading,
    isFetching,
    error: null,
    get: (key: string): string | undefined => map.get(key),
    getBoolean: (_key: string, fallback: boolean = false): boolean => fallback,
    getNumber: (_key: string, fallback?: number): number | undefined => fallback,
    refetch: (): void => {
      // no-op
    },
  };
};

const buildNode = (id: string): MasterTreeNode => ({
  id,
  type: 'folder',
  kind: 'folder',
  parentId: null,
  name: id,
  path: id,
  sortOrder: 0,
});

const createMockController = () => ({
  nodes: [buildNode('folder-a')],
  roots: [{ ...buildNode('folder-a'), children: [] }],
  validationIssues: [],
  selectedNodeId: null,
  selectedNode: null,
  expandedNodeIds: new Set<string>(),
  renamingNodeId: null,
  renameDraft: '',
  dragState: null,
  canUndo: false,
  undoHistory: [],
  isApplying: false,
  lastError: null,
  canDropNode: vi.fn(() => true),
  selectNode: vi.fn(),
  setExpandedNodeIds: vi.fn(),
  toggleNodeExpanded: vi.fn(),
  expandNode: vi.fn(),
  collapseNode: vi.fn(),
  expandAll: vi.fn(),
  collapseAll: vi.fn(),
  startRename: vi.fn(),
  updateRenameDraft: vi.fn(),
  cancelRename: vi.fn(),
  commitRename: vi.fn(async () => ({ ok: true })),
  startDrag: vi.fn(),
  updateDragTarget: vi.fn(),
  clearDrag: vi.fn(),
  dropDraggedNode: vi.fn(async () => ({ ok: true })),
  moveNode: vi.fn(async () => ({ ok: true })),
  reorderNode: vi.fn(async () => ({ ok: true })),
  dropNodeToRoot: vi.fn(async () => ({ ok: true })),
  replaceNodes: vi.fn(async () => ({ ok: true })),
  refreshFromAdapter: vi.fn(async () => ({ ok: true })),
  undo: vi.fn(async () => ({ ok: true })),
  clearError: vi.fn(),
});

describe('useMasterFolderTreeShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUpdateSettingMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    });
    useUpdateSettingsBulkMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    });
    useFolderTreeProfileConfigMock.mockReturnValue({
      profile: createDefaultFolderTreeProfilesV2().notes,
      appearance: {
        placeholderClasses: {
          lineIdle: 'line-idle',
          lineActive: 'line-active',
          badgeIdle: 'badge-idle',
          badgeActive: 'badge-active',
          rootIdle: 'root-idle',
          rootActive: 'root-active',
        },
        rootDropUi: {
          label: 'Drop to root',
          idleClassName: 'idle',
          activeClassName: 'active',
        },
        resolveIcon: () => Folder,
      },
    });
  });

  it('hydrates uncontrolled expanded state once and does not replay on settings refetch churn', async () => {
    const controller = createMockController();
    const uiStateKey = getFolderTreeUiStateV2Key('case_resolver_case_hierarchy');
    let settingsStore = createSettingsStore({
      entries: {
        [uiStateKey]: JSON.stringify({
          expandedNodeIds: ['folder-a'],
          panelCollapsed: false,
        }),
      },
    });

    useSettingsStoreMock.mockImplementation(() => settingsStore);
    useFolderTreeInstanceV2Mock.mockReturnValue(controller);

    const { rerender } = renderHook(() =>
      useMasterFolderTreeShell({
        instance: 'case_resolver_case_hierarchy',
        nodes: [buildNode('folder-a')],
        adapter: undefined,
      })
    );

    await waitFor(() => {
      expect(controller.setExpandedNodeIds).toHaveBeenCalledWith(['folder-a']);
    });

    controller.setExpandedNodeIds.mockClear();
    controller.expandedNodeIds = new Set<string>();

    settingsStore = createSettingsStore({
      entries: {
        [uiStateKey]: JSON.stringify({
          expandedNodeIds: ['folder-a'],
          panelCollapsed: false,
        }),
      },
      isFetching: true,
    });
    rerender();

    settingsStore = createSettingsStore({
      entries: {
        [uiStateKey]: JSON.stringify({
          expandedNodeIds: ['folder-a'],
          panelCollapsed: false,
        }),
      },
      isFetching: false,
    });
    rerender();

    expect(controller.setExpandedNodeIds).not.toHaveBeenCalled();
  });

  it('preserves persisted empty expansion arrays and surfaces persisted state metadata', async () => {
    const controller = createMockController();
    const uiStateKey = getFolderTreeUiStateV2Key('case_resolver_case_hierarchy');
    const settingsStore = createSettingsStore({
      entries: {
        [uiStateKey]: JSON.stringify({
          expandedNodeIds: [],
          panelCollapsed: false,
        }),
      },
    });

    useSettingsStoreMock.mockImplementation(() => settingsStore);
    useFolderTreeInstanceV2Mock.mockReturnValue(controller);

    const { result } = renderHook(() =>
      useMasterFolderTreeShell({
        instance: 'case_resolver_case_hierarchy',
        nodes: [buildNode('folder-a')],
        adapter: undefined,
      })
    );

    await waitFor(() => {
      expect(controller.setExpandedNodeIds).toHaveBeenCalledWith([]);
    });

    const initialOptions = useFolderTreeInstanceV2Mock.mock.calls[0]?.[0] as {
      initiallyExpandedNodeIds: unknown[];
    };
    expect(initialOptions.initiallyExpandedNodeIds).toEqual([]);
    expect(result.current.panel.hasPersistedState).toBe(true);
  });

  it('keeps live replay behavior when expandedNodeIds is controlled by caller', async () => {
    const controller = createMockController();
    const instance: FolderTreeInstance = 'notes';
    let settingsStore = createSettingsStore({
      entries: {},
    });

    useSettingsStoreMock.mockImplementation(() => settingsStore);
    useFolderTreeInstanceV2Mock.mockReturnValue(controller);

    const { rerender, result } = renderHook(
      (props: { externalExpanded: string[] }) =>
        useMasterFolderTreeShell({
          instance,
          nodes: [buildNode('folder-a')],
          adapter: undefined,
          expandedNodeIds: props.externalExpanded,
        }),
      {
        initialProps: { externalExpanded: ['folder-a'] },
      }
    );

    await waitFor(() => {
      expect(controller.setExpandedNodeIds).toHaveBeenCalledWith(['folder-a']);
    });
    expect(result.current.panel.hasPersistedState).toBe(false);

    controller.setExpandedNodeIds.mockClear();
    settingsStore = createSettingsStore({
      entries: {},
      isFetching: true,
    });
    rerender({ externalExpanded: ['folder-b'] });

    await waitFor(() => {
      expect(controller.setExpandedNodeIds).toHaveBeenCalledWith(['folder-b']);
    });
  });

  it('returns shared profile/appearance and persists panel collapse changes', async () => {
    const controller = createMockController();
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    useUpdateSettingMock.mockReturnValue({
      mutateAsync,
    });
    useSettingsStoreMock.mockImplementation(() =>
      createSettingsStore({
        entries: {},
      })
    );
    useFolderTreeInstanceV2Mock.mockReturnValue(controller);

    const { result } = renderHook(() =>
      useMasterFolderTreeShell({
        instance: 'notes',
        nodes: [buildNode('folder-a')],
      })
    );

    expect(result.current.profile).toEqual(createDefaultFolderTreeProfilesV2().notes);
    expect(result.current.capabilities.keyboard).toEqual({
      enabled: true,
      arrowNavigation: true,
      enterToRename: true,
      deleteKey: false,
    });
    expect(result.current.capabilities.multiSelect).toEqual({
      enabled: false,
      ctrlClick: true,
      shiftClick: true,
      selectAll: true,
    });
    expect(result.current.capabilities.search).toEqual({
      enabled: false,
      debounceMs: 200,
      filterMode: 'highlight',
      matchFields: ['name'],
      minQueryLength: 1,
    });
    expect(result.current.appearance.resolveIcon({ slot: 'file', fallback: Folder })).toBe(Folder);

    result.current.panel.setCollapsed(true);

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        key: 'folder_tree_ui_state::notes',
        value: expect.stringContaining('"panelCollapsed":true'),
      });
    });
  });
});
