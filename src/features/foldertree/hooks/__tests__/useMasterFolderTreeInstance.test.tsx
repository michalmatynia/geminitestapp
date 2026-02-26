import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMasterFolderTreeInstance } from '@/features/foldertree/hooks/useMasterFolderTreeInstance';
import {
  FOLDER_TREE_V2_MIGRATION_MARKER_KEY,
  getFolderTreeUiStateV2Key,
} from '@/features/foldertree/v2/settings';
import { type FolderTreeInstance } from '@/shared/utils/folder-tree-profiles-v2';

const {
  useSettingsStoreMock,
  useUpdateSettingMock,
  useUpdateSettingsBulkMock,
  useFolderTreeInstanceV2Mock,
  toastMock,
} = vi.hoisted(() => ({
  useSettingsStoreMock: vi.fn(),
  useUpdateSettingMock: vi.fn(),
  useUpdateSettingsBulkMock: vi.fn(),
  useFolderTreeInstanceV2Mock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: (): unknown => useSettingsStoreMock(),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSetting: (): unknown => useUpdateSettingMock(),
  useUpdateSettingsBulk: (): unknown => useUpdateSettingsBulkMock(),
}));

vi.mock('@/features/foldertree/v2/hooks/useFolderTreeInstanceV2', () => ({
  useFolderTreeInstanceV2: (options: unknown): unknown => useFolderTreeInstanceV2Mock(options),
}));

vi.mock('@/features/foldertree/hooks/useMasterFolderTreeConfig', () => ({
  useMasterFolderTreeConfig: () => ({
    profile: {} as unknown,
    appearance: {
      placeholderClasses: {} as unknown,
      rootDropUi: {
        label: 'Drop here',
        idleClassName: '',
        activeClassName: '',
      },
      resolveIcon: ({ fallback }: { fallback: unknown }) => fallback,
    },
  }),
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

const buildNode = (id: string) => ({
  id,
  type: 'folder' as const,
  kind: 'folder',
  parentId: null,
  name: id,
  path: id,
  sortOrder: 0,
});

const createMockController = () => ({
  nodes: [buildNode('folder-a')],
  roots: [buildNode('folder-a')],
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

describe('useMasterFolderTreeInstance expansion sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUpdateSettingMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    });
    useUpdateSettingsBulkMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('hydrates uncontrolled expanded state once and does not replay on settings refetch churn', async () => {
    const controller = createMockController();
    const uiStateKey = getFolderTreeUiStateV2Key('case_resolver_cases');
    let settingsStore = createSettingsStore({
      entries: {
        [FOLDER_TREE_V2_MIGRATION_MARKER_KEY]: '2026-02-25T00:00:00.000Z',
        [uiStateKey]: JSON.stringify({
          expandedNodeIds: ['folder-a'],
          panelCollapsed: false,
        }),
      },
    });

    useSettingsStoreMock.mockImplementation(() => settingsStore);
    useFolderTreeInstanceV2Mock.mockReturnValue(controller);

    const { rerender } = renderHook(() =>
      useMasterFolderTreeInstance({
        instance: 'case_resolver_cases',
        nodes: [buildNode('folder-a')],
        adapter: undefined,
      }),
    );

    await waitFor(() => {
      expect(controller.setExpandedNodeIds).toHaveBeenCalledWith(['folder-a']);
    });

    controller.setExpandedNodeIds.mockClear();
    controller.expandedNodeIds = new Set<string>();

    settingsStore = createSettingsStore({
      entries: {
        [FOLDER_TREE_V2_MIGRATION_MARKER_KEY]: '2026-02-25T00:00:00.000Z',
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
        [FOLDER_TREE_V2_MIGRATION_MARKER_KEY]: '2026-02-25T00:00:00.000Z',
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

  it('preserves persisted empty expansion arrays (fully collapsed state)', async () => {
    const controller = createMockController();
    const uiStateKey = getFolderTreeUiStateV2Key('case_resolver_cases');
    const settingsStore = createSettingsStore({
      entries: {
        [FOLDER_TREE_V2_MIGRATION_MARKER_KEY]: '2026-02-25T00:00:00.000Z',
        [uiStateKey]: JSON.stringify({
          expandedNodeIds: [],
          panelCollapsed: false,
        }),
      },
    });

    useSettingsStoreMock.mockImplementation(() => settingsStore);
    useFolderTreeInstanceV2Mock.mockReturnValue(controller);

    const { result } = renderHook(() =>
      useMasterFolderTreeInstance({
        instance: 'case_resolver_cases',
        nodes: [buildNode('folder-a')],
        adapter: undefined,
      }),
    );

    await waitFor(() => {
      expect(controller.setExpandedNodeIds).toHaveBeenCalledWith([]);
    });

    const initialOptions = useFolderTreeInstanceV2Mock.mock.calls[0]?.[0];
    expect(initialOptions.initiallyExpandedNodeIds).toEqual([]);
    expect(result.current.hasPersistedUiState).toBe(true);
  });

  it('keeps live replay behavior when expandedNodeIds is controlled by caller', async () => {
    const controller = createMockController();
    const instance: FolderTreeInstance = 'notes';
    let settingsStore = createSettingsStore({
      entries: {
        [FOLDER_TREE_V2_MIGRATION_MARKER_KEY]: '2026-02-25T00:00:00.000Z',
      },
    });

    useSettingsStoreMock.mockImplementation(() => settingsStore);
    useFolderTreeInstanceV2Mock.mockReturnValue(controller);

    const { rerender, result } = renderHook(
      (props: { externalExpanded: string[] }) =>
        useMasterFolderTreeInstance({
          instance,
          nodes: [buildNode('folder-a')],
          adapter: undefined,
          expandedNodeIds: props.externalExpanded,
        }),
      {
        initialProps: { externalExpanded: ['folder-a'] },
      },
    );

    await waitFor(() => {
      expect(controller.setExpandedNodeIds).toHaveBeenCalledWith(['folder-a']);
    });
    expect(result.current.hasPersistedUiState).toBe(false);

    controller.setExpandedNodeIds.mockClear();
    settingsStore = createSettingsStore({
      entries: {
        [FOLDER_TREE_V2_MIGRATION_MARKER_KEY]: '2026-02-25T00:00:00.000Z',
      },
      isFetching: true,
    });
    rerender({ externalExpanded: ['folder-b'] });

    await waitFor(() => {
      expect(controller.setExpandedNodeIds).toHaveBeenCalledWith(['folder-b']);
    });
  });
});
