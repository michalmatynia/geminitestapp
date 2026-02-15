import { renderHook } from '@testing-library/react';
import { Folder } from 'lucide-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMasterFolderTreeConfig } from '@/features/foldertree/hooks/useMasterFolderTreeConfig';
import { useMasterFolderTreeInstance } from '@/features/foldertree/hooks/useMasterFolderTreeInstance';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import type { MasterTreeNode } from '@/shared/utils';
import { createDefaultFolderTreeProfilesV2 } from '@/shared/utils/folder-tree-profiles-v2';
import {
  FOLDER_TREE_UI_STATE_V1_SETTING_KEY,
  serializeFolderTreeUiStateV1,
  createDefaultFolderTreeUiStateV1,
} from '@/shared/utils/folder-tree-ui-state-v1';


vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: vi.fn(),
}));
vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSetting: vi.fn(),
}));
vi.mock('@/shared/ui/toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));
vi.mock('@/features/foldertree/hooks/useMasterFolderTreeConfig', () => ({
  useMasterFolderTreeConfig: vi.fn(),
}));

const createNodes = (suffix: string): MasterTreeNode[] => [
  {
    id: `folder-${suffix}`,
    type: 'folder',
    kind: 'folder',
    parentId: null,
    name: `Folder ${suffix}`,
    path: `folder-${suffix}`,
    sortOrder: 0,
  },
];

describe('useMasterFolderTreeInstance', () => {
  const mutateAsync = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useMasterFolderTreeConfig).mockReturnValue({
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
    vi.mocked(useSettingsStore).mockReturnValue({
      map: new Map(),
      isLoading: false,
      isFetching: false,
      error: null,
      get: () => undefined,
      getBoolean: (_key: string, fallback: boolean = false) => fallback,
      getNumber: (_key: string, fallback?: number) => fallback,
      refetch: () => {},
    });
    vi.mocked(useUpdateSetting).mockReturnValue({
      mutateAsync,
    } as unknown as ReturnType<typeof useUpdateSetting>);
  });

  it('returns profile + appearance and keeps controller in sync with external nodes', () => {
    const initialNodes = createNodes('a');

    const { result, rerender } = renderHook(
      ({ nodes, selectedNodeId }: { nodes: MasterTreeNode[]; selectedNodeId: string | null }) =>
        useMasterFolderTreeInstance({
          instance: 'notes',
          nodes,
          selectedNodeId,
        }),
      {
        initialProps: {
          nodes: initialNodes,
          selectedNodeId: 'folder-a',
        },
      }
    );

    expect(useMasterFolderTreeConfig).toHaveBeenCalledWith('notes');
    expect(result.current.controller.nodes.map((node: MasterTreeNode) => node.id)).toEqual(['folder-a']);
    expect(result.current.controller.selectedNodeId).toBe('folder-a');

    rerender({
      nodes: createNodes('b'),
      selectedNodeId: null as any,
    });

    expect(result.current.controller.nodes.map((node: MasterTreeNode) => node.id)).toEqual(['folder-b']);
    expect(result.current.controller.selectedNodeId as any).toEqual(null);
  });

  it('hydrates expanded state from persisted settings and exposes panel collapse control', () => {
    const nodes = createNodes('a');
    const persistedUiState = createDefaultFolderTreeUiStateV1();
    persistedUiState.notes.expandedNodeIds = ['folder-a'];
    persistedUiState.notes.panelCollapsed = true;
    const serializedUiState = serializeFolderTreeUiStateV1(persistedUiState);

    vi.mocked(useSettingsStore).mockReturnValue({
      map: new Map([[FOLDER_TREE_UI_STATE_V1_SETTING_KEY, serializedUiState]]),
      isLoading: false,
      isFetching: false,
      error: null,
      get: (key: string) => (key === FOLDER_TREE_UI_STATE_V1_SETTING_KEY ? serializedUiState : undefined),
      getBoolean: (_key: string, fallback: boolean = false) => fallback,
      getNumber: (_key: string, fallback?: number) => fallback,
      refetch: () => {},
    });

    const { result } = renderHook(() =>
      useMasterFolderTreeInstance({
        instance: 'notes',
        nodes,
      })
    );

    expect(result.current.controller.expandedNodeIds.has('folder-a')).toBe(true);
    expect(result.current.panelCollapsed).toBe(true);

    result.current.setPanelCollapsed(false);
    expect(mutateAsync).toHaveBeenCalledWith({
      key: FOLDER_TREE_UI_STATE_V1_SETTING_KEY,
      value: expect.any(String),
    });
  });
});
