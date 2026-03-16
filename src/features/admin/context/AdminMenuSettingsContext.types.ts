import type { AdminMenuLayoutNodeSemantic } from '@/features/admin/pages/admin-menu-layout-master-tree';
import type { AdminMenuLayoutNodeEntry as AdminMenuLayoutNodeState } from '@/features/admin/pages/admin-menu-layout-types';
import type {
  AdminMenuCustomNode,
  AdminNavLeaf,
  AdminNavNodeEntry,
} from '@/shared/contracts/admin';
import type { IdLabelOptionDto } from '@/shared/contracts/base';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

export type { AdminMenuLayoutNodeState };

export interface AdminMenuSettingsStateContextValue {
  favorites: string[];
  sectionColors: Record<string, string>;
  customEnabled: boolean;
  customNav: AdminMenuCustomNode[];
  query: string;
  libraryQuery: string;
  sections: Array<IdLabelOptionDto>;
  flattened: AdminNavLeaf[];
  favoritesSet: Set<string>;
  favoritesList: (AdminNavLeaf | undefined)[];
  filteredItems: AdminNavLeaf[];
  layoutMasterNodes: MasterTreeNode[];
  layoutNodeStateById: Map<string, AdminMenuLayoutNodeState>;
  libraryItems: AdminNavNodeEntry[];
  libraryItemMap: Map<string, AdminNavNodeEntry>;
  customIds: Set<string>;
  filteredLibraryItems: AdminNavNodeEntry[];
  isDirty: boolean;
  isDefaultState: boolean;
  isSaving: boolean;
}

export interface AdminMenuSettingsActionsContextValue {
  setQuery: (q: string) => void;
  setLibraryQuery: (q: string) => void;
  setCustomEnabled: (enabled: boolean) => void;
  handleToggleFavorite: (id: string, checked: boolean) => void;
  moveFavorite: (id: string, direction: 'up' | 'down') => void;
  updateSectionColor: (sectionId: string, value: string) => void;
  handleAddRootNode: (kind: 'link' | 'group') => string;
  addCustomChildNode: (parentId: string, kind: 'link' | 'group') => string | null;
  removeCustomNodeById: (nodeId: string) => void;
  updateCustomNodeLabelById: (nodeId: string, value: string) => void;
  updateCustomNodeHrefById: (nodeId: string, value: string) => void;
  updateCustomNodeSemanticById: (nodeId: string, semantic: AdminMenuLayoutNodeSemantic) => void;
  replaceCustomNavFromMasterNodes: (nextNodes: MasterTreeNode[]) => void;
  addBuiltInNode: (entry: AdminNavNodeEntry) => void;
  handleSave: () => Promise<void>;
  handleReset: () => void;
}

export type AdminMenuSettingsContextValue = AdminMenuSettingsStateContextValue &
  AdminMenuSettingsActionsContextValue;
