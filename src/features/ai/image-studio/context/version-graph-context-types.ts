import type {
  LayoutMode,
  VersionEdge,
  VersionNode,
} from '@/features/ai/image-studio/utils/version-graph';

export type VersionGraphFilterType = 'base' | 'generation' | 'merge' | 'composite';

export interface VersionGraphState {
  nodes: VersionNode[];
  edges: VersionEdge[];
  allNodes: VersionNode[];
  rootNodes: VersionNode[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  mergeMode: boolean;
  mergeSelectedIds: string[];
  collapsedNodeIds: Set<string>;
  filterQuery: string;
  filterTypes: Set<VersionGraphFilterType>;
  filterHasMask: boolean | null;
  filteredNodeIds: Set<string> | null;
  layoutMode: LayoutMode;
  graphStats: {
    totalNodes: number;
    baseCount: number;
    generationCount: number;
    mergeCount: number;
    compositeCount: number;
    maxDepth: number;
    maskedCount: number;
  };
  compositeMode: boolean;
  compositeSelectedIds: string[];
  compositeResultCache: Map<string, string>;
  compositeLoading: boolean;
  isolatedNodeId: string | null;
  isolatedNodeIds: Set<string> | null;
  filterLeafOnly: boolean;
  compareMode: boolean;
  compareNodeIds: [string, string] | null;
}

export interface VersionGraphActions {
  selectNode: (slotId: string | null) => void;
  hoverNode: (slotId: string | null) => void;
  activateNode: (slotId: string) => void;
  detachSubtree: (slotId: string) => Promise<void>;
  toggleMergeMode: () => void;
  toggleMergeSelection: (slotId: string) => void;
  clearMergeSelection: () => void;
  executeMerge: () => Promise<void>;
  toggleCollapse: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  setFilterQuery: (q: string) => void;
  toggleFilterType: (t: VersionGraphFilterType) => void;
  setFilterHasMask: (v: boolean | null) => void;
  clearFilters: () => void;
  setLayoutMode: (mode: LayoutMode) => void;
  toggleCompositeMode: () => void;
  toggleCompositeSelection: (slotId: string) => void;
  clearCompositeSelection: () => void;
  executeComposite: () => Promise<void>;
  reorderCompositeLayer: (
    compositeSlotId: string,
    fromIndex: number,
    toIndex: number
  ) => Promise<void>;
  flattenComposite: (compositeSlotId: string) => Promise<void>;
  refreshCompositePreview: (compositeSlotId: string) => Promise<void>;
  isolateBranch: (nodeId: string | null) => void;
  setAnnotation: (nodeId: string, text: string) => Promise<void>;
  toggleFilterLeafOnly: () => void;
  toggleCompareMode: () => void;
  setCompareNodeIds: (ids: [string, string] | null) => void;
}
