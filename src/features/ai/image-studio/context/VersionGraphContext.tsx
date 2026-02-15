'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useToast } from '@/shared/ui';

import { useSlotsState, useSlotsActions } from './SlotsContext';
import { readMeta } from '../utils/metadata';
import {
  computeVersionGraph,
  computeTimelineLayout,
  type VersionNode,
  type VersionEdge,
  type LayoutMode,
} from '../utils/version-graph';

import type { CompositeLayerConfig, SlotGenerationMetadata } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export type { VersionNode, VersionEdge, LayoutMode };

export interface VersionGraphState {
  /** Visible nodes (after collapse filtering) */
  nodes: VersionNode[];
  /** Visible edges (after collapse filtering) */
  edges: VersionEdge[];
  /** All nodes before collapse filtering */
  allNodes: VersionNode[];
  rootNodes: VersionNode[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  mergeMode: boolean;
  mergeSelectedIds: string[];
  /** Collapse */
  collapsedNodeIds: Set<string>;
  /** Filter */
  filterQuery: string;
  filterTypes: Set<'base' | 'generation' | 'merge' | 'composite'>;
  filterHasMask: boolean | null;
  filteredNodeIds: Set<string> | null;
  /** Layout */
  layoutMode: LayoutMode;
  /** Stats */
  graphStats: {
    totalNodes: number;
    baseCount: number;
    generationCount: number;
    mergeCount: number;
    compositeCount: number;
    maxDepth: number;
    maskedCount: number;
  };
  /** Composite mode */
  compositeMode: boolean;
  compositeSelectedIds: string[];
  compositeResultCache: Map<string, string>;
  compositeLoading: boolean;
  /** Isolate branch */
  isolatedNodeId: string | null;
  isolatedNodeIds: Set<string> | null;
  /** Leaf filter */
  filterLeafOnly: boolean;
  /** Compare mode */
  compareMode: boolean;
  compareNodeIds: [string, string] | null;
}

export interface VersionGraphActions {
  selectNode: (slotId: string | null) => void;
  hoverNode: (slotId: string | null) => void;
  activateNode: (slotId: string) => void;
  toggleMergeMode: () => void;
  toggleMergeSelection: (slotId: string) => void;
  clearMergeSelection: () => void;
  executeMerge: () => Promise<void>;
  /** Collapse */
  toggleCollapse: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  /** Filter */
  setFilterQuery: (q: string) => void;
  toggleFilterType: (t: 'base' | 'generation' | 'merge' | 'composite') => void;
  setFilterHasMask: (v: boolean | null) => void;
  clearFilters: () => void;
  /** Layout */
  setLayoutMode: (mode: LayoutMode) => void;
  /** Composite mode */
  toggleCompositeMode: () => void;
  toggleCompositeSelection: (slotId: string) => void;
  clearCompositeSelection: () => void;
  executeComposite: () => Promise<void>;
  reorderCompositeLayer: (compositeSlotId: string, fromIndex: number, toIndex: number) => Promise<void>;
  flattenComposite: (compositeSlotId: string) => Promise<void>;
  refreshCompositePreview: (compositeSlotId: string) => Promise<void>;
  /** Isolate branch */
  isolateBranch: (nodeId: string | null) => void;
  /** Annotations */
  setAnnotation: (nodeId: string, text: string) => Promise<void>;
  /** Leaf filter */
  toggleFilterLeafOnly: () => void;
  /** Compare mode */
  toggleCompareMode: () => void;
  setCompareNodeIds: (ids: [string, string] | null) => void;
}

// ── Contexts ─────────────────────────────────────────────────────────────────

const VersionGraphStateContext = createContext<VersionGraphState | null>(null);
const VersionGraphActionsContext = createContext<VersionGraphActions | null>(null);

// ── Helpers ──────────────────────────────────────────────────────────────────


function resolveSourceIds(
  meta: SlotGenerationMetadata,
  slotById: Map<string, { id: string }>,
): string[] {
  const ordered: string[] = [];

  if (Array.isArray(meta.sourceSlotIds)) {
    for (const id of meta.sourceSlotIds) {
      if (typeof id !== 'string') continue;
      if (!slotById.has(id)) continue;
      if (ordered.includes(id)) continue;
      ordered.push(id);
    }
  }

  if (typeof meta.sourceSlotId === 'string' && slotById.has(meta.sourceSlotId) && !ordered.includes(meta.sourceSlotId)) {
    ordered.push(meta.sourceSlotId);
  }

  return ordered;
}

/** Collect all recursive descendant IDs for a set of collapsed nodes. */
function collectHiddenIds(
  collapsedIds: Set<string>,
  allNodes: VersionNode[],
): Set<string> {
  const nodeById = new Map(allNodes.map((n) => [n.id, n]));
  const hidden = new Set<string>();

  function walkDown(nodeId: string): void {
    const node = nodeById.get(nodeId);
    if (!node) return;
    for (const childId of node.childIds) {
      if (hidden.has(childId)) continue;
      hidden.add(childId);
      // If the child is also collapsed, still hide its descendants
      walkDown(childId);
    }
  }

  for (const cid of collapsedIds) {
    walkDown(cid);
  }

  return hidden;
}

/** Check if a node matches the filter criteria. */
function matchesFilter(
  node: VersionNode,
  query: string,
  types: Set<'base' | 'generation' | 'merge' | 'composite'>,
  hasMask: boolean | null,
): boolean {
  // Type filter
  if (types.size > 0 && !types.has(node.type)) return false;

  // Mask filter
  if (hasMask === true && !node.hasMask) return false;
  if (hasMask === false && node.hasMask) return false;

  // Text query
  if (query) {
    const q = query.toLowerCase();
    const labelMatch = node.label.toLowerCase().includes(q);
    const meta = readMeta(node.slot);
    const promptMatch = meta.generationParams?.prompt?.toLowerCase().includes(q) ?? false;
    if (!labelMatch && !promptMatch) return false;
  }

  return true;
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function VersionGraphProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { slots, selectedSlotId, workingSlotId } = useSlotsState();
  const { setSelectedSlotId, setWorkingSlotId, createSlots, updateSlotMutation } = useSlotsActions();
  const { toast } = useToast();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelectedIds, setMergeSelectedIds] = useState<string[]>([]);

  // Collapse state
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());

  // Composite mode state
  const [compositeMode, setCompositeMode] = useState(false);
  const [compositeSelectedIds, setCompositeSelectedIds] = useState<string[]>([]);
  const [compositeResultCache, setCompositeResultCache] = useState<Map<string, string>>(new Map());
  const [compositeLoading, setCompositeLoading] = useState(false);

  // Filter state
  const [filterQuery, setFilterQuery] = useState('');
  const [filterTypes, setFilterTypes] = useState<Set<'base' | 'generation' | 'merge' | 'composite'>>(new Set());
  const [filterHasMask, setFilterHasMask] = useState<boolean | null>(null);
  const [filterLeafOnly, setFilterLeafOnly] = useState(false);

  // Layout state
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('dag');

  // Isolate branch state
  const [isolatedNodeId, setIsolatedNodeId] = useState<string | null>(null);

  // Compare mode state
  const [compareMode, setCompareMode] = useState(false);
  const [compareNodeIds, setCompareNodeIds] = useState<[string, string] | null>(null);

  const activeSlotId = useMemo(
    () => workingSlotId ?? selectedSlotId ?? null,
    [workingSlotId, selectedSlotId],
  );

  const scopedSlots = useMemo(() => {
    if (!activeSlotId) return [];

    const slotById = new Map(slots.map((slot) => [slot.id, slot]));
    const activeSlot = slotById.get(activeSlotId);
    if (!activeSlot) return [];

    const childrenBySource = new Map<string, string[]>();
    for (const slot of slots) {
      const sourceIds = resolveSourceIds(readMeta(slot), slotById);
      for (const sourceId of sourceIds) {
        const existing = childrenBySource.get(sourceId);
        if (existing) {
          existing.push(slot.id);
        } else {
          childrenBySource.set(sourceId, [slot.id]);
        }
      }
    }

    const rootIds = resolveSourceIds(readMeta(activeSlot), slotById);
    if (rootIds.length === 0) {
      rootIds.push(activeSlot.id);
    }

    // Scope to the current card branch: source image(s) + current card + descendants.
    const includedIds = new Set<string>([activeSlot.id, ...rootIds]);
    const queue: string[] = [activeSlot.id];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      const children = childrenBySource.get(current) ?? [];
      for (const childId of children) {
        if (includedIds.has(childId)) continue;
        includedIds.add(childId);
        queue.push(childId);
      }
    }

    return slots.filter((slot) => includedIds.has(slot.id));
  }, [slots, activeSlotId]);

  // Compute base graph only for the scoped card subset.
  const baseGraph = useMemo(() => computeVersionGraph(scopedSlots), [scopedSlots]);

  useEffect(() => {
    setSelectedNodeId(activeSlotId);
    setHoveredNodeId(null);
    setMergeMode(false);
    setMergeSelectedIds([]);
    setCompositeMode(false);
    setCompositeSelectedIds([]);
    setCompositeResultCache(new Map());
    setCompositeLoading(false);
    setCollapsedNodeIds(new Set());
    setIsolatedNodeId(null);
    setCompareMode(false);
    setCompareNodeIds(null);
  }, [activeSlotId]);

  // Apply layout mode
  const layoutGraph = useMemo(() => {
    if (layoutMode === 'dag') return baseGraph;
    const orientation = layoutMode === 'timeline-h' ? 'horizontal' : 'vertical';
    const result = computeTimelineLayout(baseGraph.nodes, baseGraph.edges, orientation);
    return { ...baseGraph, nodes: result.nodes, edges: result.edges };
  }, [baseGraph, layoutMode]);

  // Compute hidden IDs from collapse
  const hiddenIds = useMemo(
    () => collectHiddenIds(collapsedNodeIds, layoutGraph.nodes),
    [collapsedNodeIds, layoutGraph.nodes],
  );

  // Filter out collapsed descendants
  const visibleNodes = useMemo(
    () => layoutGraph.nodes.filter((n) => !hiddenIds.has(n.id)),
    [layoutGraph.nodes, hiddenIds],
  );
  const visibleEdges = useMemo(
    () => layoutGraph.edges.filter((e) => !hiddenIds.has(e.source) && !hiddenIds.has(e.target)),
    [layoutGraph.edges, hiddenIds],
  );

  // Compute filtered node IDs (for dimming, not hiding)
  const filteredNodeIds = useMemo<Set<string> | null>(() => {
    const hasFilter = filterQuery || filterTypes.size > 0 || filterHasMask !== null || filterLeafOnly;
    if (!hasFilter) return null;

    const matched = new Set<string>();
    for (const node of visibleNodes) {
      if (!matchesFilter(node, filterQuery, filterTypes, filterHasMask)) continue;
      if (filterLeafOnly && node.childIds.length > 0) continue;
      matched.add(node.id);
    }
    return matched;
  }, [visibleNodes, filterQuery, filterTypes, filterHasMask, filterLeafOnly]);

  // Compute graph stats
  const graphStats = useMemo(() => {
    const all = layoutGraph.nodes;
    let baseCount = 0;
    let generationCount = 0;
    let mergeCount = 0;
    let compositeCount = 0;
    let maxDepth = 0;
    let maskedCount = 0;
    for (const node of all) {
      if (node.type === 'base') baseCount += 1;
      else if (node.type === 'generation') generationCount += 1;
      else if (node.type === 'composite') compositeCount += 1;
      else mergeCount += 1;
      if (node.depth > maxDepth) maxDepth = node.depth;
      if (node.hasMask) maskedCount += 1;
    }
    return { totalNodes: all.length, baseCount, generationCount, mergeCount, compositeCount, maxDepth, maskedCount };
  }, [layoutGraph.nodes]);

  // Compute isolated node IDs (ancestors + descendants + self)
  const isolatedNodeIds = useMemo<Set<string> | null>(() => {
    if (!isolatedNodeId) return null;
    const nodeById = new Map(layoutGraph.nodes.map((n) => [n.id, n]));
    const result = new Set<string>();
    result.add(isolatedNodeId);

    // Walk up through parents
    const upQueue = [isolatedNodeId];
    while (upQueue.length > 0) {
      const id = upQueue.shift()!;
      const node = nodeById.get(id);
      if (!node) continue;
      for (const parentId of node.parentIds) {
        if (!result.has(parentId)) {
          result.add(parentId);
          upQueue.push(parentId);
        }
      }
    }

    // Walk down through children
    const downQueue = [isolatedNodeId];
    while (downQueue.length > 0) {
      const id = downQueue.shift()!;
      const node = nodeById.get(id);
      if (!node) continue;
      for (const childId of node.childIds) {
        if (!result.has(childId)) {
          result.add(childId);
          downQueue.push(childId);
        }
      }
    }

    return result;
  }, [isolatedNodeId, layoutGraph.nodes]);

  // ── Actions ──

  const selectNode = useCallback(
    (slotId: string | null) => {
      setSelectedNodeId(slotId);
    },
    [],
  );

  const hoverNode = useCallback((slotId: string | null) => {
    setHoveredNodeId(slotId);
  }, []);

  const activateNode = useCallback(
    (slotId: string) => {
      setWorkingSlotId(slotId);
      setSelectedNodeId(slotId);
      setSelectedSlotId(slotId);
    },
    [setWorkingSlotId, setSelectedSlotId],
  );

  const toggleMergeMode = useCallback(() => {
    setMergeMode((prev) => {
      if (prev) {
        setMergeSelectedIds([]);
      } else {
        // Exit composite mode when entering merge mode
        setCompositeMode(false);
        setCompositeSelectedIds([]);
      }
      return !prev;
    });
  }, []);

  const toggleMergeSelection = useCallback((slotId: string) => {
    setMergeSelectedIds((prev) =>
      prev.includes(slotId)
        ? prev.filter((id) => id !== slotId)
        : [...prev, slotId],
    );
  }, []);

  const clearMergeSelection = useCallback(() => {
    setMergeSelectedIds([]);
  }, []);

  const executeMerge = useCallback(async () => {
    if (mergeSelectedIds.length < 2) {
      toast('Select at least 2 nodes to merge.', { variant: 'info' });
      return;
    }

    const selectedSlots = mergeSelectedIds
      .map((id) => slots.find((s) => s.id === id))
      .filter(Boolean);

    if (selectedSlots.length < 2) {
      toast('Selected nodes no longer exist.', { variant: 'error' });
      return;
    }

    try {
      const created = await createSlots([
        {
          name: `Merge (${mergeSelectedIds.length})`,
          folderPath: selectedSlots[0]!.folderPath,
          metadata: {
            role: 'merge',
            sourceSlotIds: mergeSelectedIds,
            relationType: 'merge:output',
          },
        },
      ]);

      const newSlot = created[0];
      if (newSlot) {
        setSelectedNodeId(newSlot.id);
        setSelectedSlotId(newSlot.id);
      }

      setMergeMode(false);
      setMergeSelectedIds([]);
      toast('Merge node created.', { variant: 'success' });
    } catch {
      toast('Failed to create merge node.', { variant: 'error' });
    }
  }, [mergeSelectedIds, slots, createSlots, setSelectedSlotId, toast]);

  // Collapse actions
  const toggleCollapse = useCallback((nodeId: string) => {
    setCollapsedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedNodeIds(new Set());
  }, []);

  const collapseAll = useCallback(() => {
    // Collapse all nodes that have children
    const withChildren = new Set<string>();
    for (const node of layoutGraph.nodes) {
      if (node.childIds.length > 0) {
        withChildren.add(node.id);
      }
    }
    setCollapsedNodeIds(withChildren);
  }, [layoutGraph.nodes]);

  // Composite actions
  const toggleCompositeMode = useCallback(() => {
    setCompositeMode((prev) => {
      if (prev) {
        setCompositeSelectedIds([]);
        setCompositeResultCache(new Map());
      } else {
        // Exit merge mode when entering composite mode
        setMergeMode(false);
        setMergeSelectedIds([]);
      }
      return !prev;
    });
  }, []);

  const toggleCompositeSelection = useCallback((slotId: string) => {
    setCompositeSelectedIds((prev) =>
      prev.includes(slotId)
        ? prev.filter((id) => id !== slotId)
        : [...prev, slotId],
    );
  }, []);

  const clearCompositeSelection = useCallback(() => {
    setCompositeSelectedIds([]);
  }, []);

  const refreshCompositePreviewInternal = useCallback(async (slotId: string, layers: CompositeLayerConfig[]) => {
    setCompositeLoading(true);
    try {
      const res = await fetch('/api/image-studio/composite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layers }),
      });
      if (!res.ok) throw new Error('Composite API failed');
      const data = (await res.json()) as { resultImageBase64: string };
      setCompositeResultCache((prev) => {
        const next = new Map(prev);
        next.set(slotId, data.resultImageBase64);
        return next;
      });
      // Persist the composited image on the slot
      await updateSlotMutation.mutateAsync({
        id: slotId,
        data: { imageBase64: data.resultImageBase64 },
      });
    } catch {
      toast('Failed to generate composite preview.', { variant: 'error' });
    } finally {
      setCompositeLoading(false);
    }
  }, [updateSlotMutation, toast]);

  const executeComposite = useCallback(async () => {
    if (compositeSelectedIds.length < 2) {
      toast('Select at least 2 nodes to composite.', { variant: 'info' });
      return;
    }

    const selectedSlots = compositeSelectedIds
      .map((id) => slots.find((s) => s.id === id))
      .filter(Boolean);

    if (selectedSlots.length < 2) {
      toast('Selected nodes no longer exist.', { variant: 'error' });
      return;
    }

    try {
      const layers: CompositeLayerConfig[] = compositeSelectedIds.map((slotId, index) => ({
        slotId,
        order: index,
      }));

      const created = await createSlots([
        {
          name: `Composite (${compositeSelectedIds.length})`,
          folderPath: selectedSlots[0]!.folderPath,
          metadata: {
            role: 'composite',
            sourceSlotIds: compositeSelectedIds,
            relationType: 'composite:output',
            compositeConfig: { layers },
          },
        },
      ]);

      const newSlot = created[0];
      if (newSlot) {
        setSelectedNodeId(newSlot.id);
        setSelectedSlotId(newSlot.id);
        // Trigger preview refresh for the new composite node
        void refreshCompositePreviewInternal(newSlot.id, layers);
      }

      setCompositeMode(false);
      setCompositeSelectedIds([]);
      toast('Composite node created.', { variant: 'success' });
    } catch {
      toast('Failed to create composite node.', { variant: 'error' });
    }
  }, [compositeSelectedIds, slots, createSlots, setSelectedSlotId, toast, refreshCompositePreviewInternal]);

  const refreshCompositePreview = useCallback(async (compositeSlotId: string) => {
    const slot = slots.find((s) => s.id === compositeSlotId);
    if (!slot) return;
    const meta = readMeta(slot);
    const layers = meta.compositeConfig?.layers;
    if (!layers || layers.length === 0) return;
    await refreshCompositePreviewInternal(compositeSlotId, layers);
  }, [slots, refreshCompositePreviewInternal]);

  const reorderCompositeLayer = useCallback(async (compositeSlotId: string, fromIndex: number, toIndex: number) => {
    const slot = slots.find((s) => s.id === compositeSlotId);
    if (!slot) return;
    const meta = readMeta(slot);
    const layers = meta.compositeConfig?.layers;
    if (!layers) return;

    const reordered = [...layers];
    const [moved] = reordered.splice(fromIndex, 1);
    if (!moved) return;
    reordered.splice(toIndex, 0, moved);
    // Re-assign order indices
    const updated = reordered.map((l, i) => ({ ...l, order: i }));

    // Clear cached result for this slot before re-fetching
    setCompositeResultCache((prev) => {
      const next = new Map(prev);
      next.delete(compositeSlotId);
      return next;
    });

    await updateSlotMutation.mutateAsync({
      id: compositeSlotId,
      data: {
        metadata: { ...meta, compositeConfig: { ...meta.compositeConfig, layers: updated } } as Record<string, unknown>,
      },
    });

    // Refresh preview with new layer order
    void refreshCompositePreviewInternal(compositeSlotId, updated);
  }, [slots, updateSlotMutation, refreshCompositePreviewInternal]);

  const flattenComposite = useCallback(async (compositeSlotId: string) => {
    const slot = slots.find((s) => s.id === compositeSlotId);
    if (!slot) return;
    const meta = readMeta(slot);
    const layers = meta.compositeConfig?.layers;
    if (!layers || layers.length === 0) return;

    setCompositeLoading(true);
    try {
      const res = await fetch('/api/image-studio/composite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layers, flatten: true }),
      });
      if (!res.ok) throw new Error('Composite flatten API failed');
      const data = (await res.json()) as { resultImageBase64: string };

      // Create a new independent node with the flattened image
      const created = await createSlots([
        {
          name: `Flattened (${layers.length})`,
          folderPath: slot.folderPath,
          imageBase64: data.resultImageBase64,
          metadata: {
            role: 'composite',
            sourceSlotId: compositeSlotId,
            relationType: 'composite:flatten',
          },
        },
      ]);

      const flatSlot = created[0];
      if (flatSlot) {
        // Update composite config with flattenedSlotId
        await updateSlotMutation.mutateAsync({
          id: compositeSlotId,
          data: {
            metadata: {
              ...meta,
              compositeConfig: { ...meta.compositeConfig, layers, flattenedSlotId: flatSlot.id },
            } as Record<string, unknown>,
          },
        });
        setSelectedNodeId(flatSlot.id);
        setSelectedSlotId(flatSlot.id);
      }

      toast('Composite flattened to new node.', { variant: 'success' });
    } catch {
      toast('Failed to flatten composite.', { variant: 'error' });
    } finally {
      setCompositeLoading(false);
    }
  }, [slots, createSlots, updateSlotMutation, setSelectedSlotId, toast]);

  // Filter actions
  const setFilterQueryAction = useCallback((q: string) => {
    setFilterQuery(q);
  }, []);

  const toggleFilterType = useCallback((t: 'base' | 'generation' | 'merge' | 'composite') => {
    setFilterTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) {
        next.delete(t);
      } else {
        next.add(t);
      }
      return next;
    });
  }, []);

  const setFilterHasMaskAction = useCallback((v: boolean | null) => {
    setFilterHasMask(v);
  }, []);

  const clearFilters = useCallback(() => {
    setFilterQuery('');
    setFilterTypes(new Set());
    setFilterHasMask(null);
    setFilterLeafOnly(false);
  }, []);

  const toggleFilterLeafOnly = useCallback(() => {
    setFilterLeafOnly((prev) => !prev);
  }, []);

  // Layout action
  const setLayoutModeAction = useCallback((mode: LayoutMode) => {
    setLayoutMode(mode);
  }, []);

  // Isolate branch action
  const isolateBranch = useCallback((nodeId: string | null) => {
    setIsolatedNodeId(nodeId);
  }, []);

  // Annotation action
  const setAnnotation = useCallback(async (nodeId: string, text: string) => {
    const slot = slots.find((s) => s.id === nodeId);
    if (!slot) return;
    const existingMeta = readMeta(slot);
    await updateSlotMutation.mutateAsync({
      id: nodeId,
      data: {
        metadata: { ...existingMeta, annotation: text || undefined } as Record<string, unknown>,
      },
    });
  }, [slots, updateSlotMutation]);

  // Compare mode actions
  const toggleCompareMode = useCallback(() => {
    setCompareMode((prev) => {
      if (prev) {
        setCompareNodeIds(null);
      }
      return !prev;
    });
  }, []);

  const setCompareNodeIdsAction = useCallback((ids: [string, string] | null) => {
    setCompareNodeIds(ids);
  }, []);

  const state = useMemo<VersionGraphState>(
    () => ({
      nodes: visibleNodes,
      edges: visibleEdges,
      allNodes: layoutGraph.nodes,
      rootNodes: layoutGraph.rootNodes,
      selectedNodeId,
      hoveredNodeId,
      mergeMode,
      mergeSelectedIds,
      collapsedNodeIds,
      filterQuery,
      filterTypes,
      filterHasMask,
      filteredNodeIds,
      filterLeafOnly,
      layoutMode,
      graphStats,
      compositeMode,
      compositeSelectedIds,
      compositeResultCache,
      compositeLoading,
      isolatedNodeId,
      isolatedNodeIds,
      compareMode,
      compareNodeIds,
    }),
    [
      visibleNodes, visibleEdges, layoutGraph.nodes, layoutGraph.rootNodes,
      selectedNodeId, hoveredNodeId, mergeMode, mergeSelectedIds,
      collapsedNodeIds, filterQuery, filterTypes, filterHasMask, filteredNodeIds, filterLeafOnly,
      layoutMode, graphStats, compositeMode, compositeSelectedIds, compositeResultCache, compositeLoading,
      isolatedNodeId, isolatedNodeIds, compareMode, compareNodeIds,
    ],
  );

  const actions = useMemo<VersionGraphActions>(
    () => ({
      selectNode,
      hoverNode,
      activateNode,
      toggleMergeMode,
      toggleMergeSelection,
      clearMergeSelection,
      executeMerge,
      toggleCollapse,
      expandAll,
      collapseAll,
      toggleCompositeMode,
      toggleCompositeSelection,
      clearCompositeSelection,
      executeComposite,
      reorderCompositeLayer,
      flattenComposite,
      refreshCompositePreview,
      setFilterQuery: setFilterQueryAction,
      toggleFilterType,
      setFilterHasMask: setFilterHasMaskAction,
      toggleFilterLeafOnly,
      clearFilters,
      setLayoutMode: setLayoutModeAction,
      isolateBranch,
      setAnnotation,
      toggleCompareMode,
      setCompareNodeIds: setCompareNodeIdsAction,
    }),
    [
      selectNode, hoverNode, activateNode,
      toggleMergeMode, toggleMergeSelection, clearMergeSelection, executeMerge,
      toggleCollapse, expandAll, collapseAll,
      toggleCompositeMode, toggleCompositeSelection, clearCompositeSelection,
      executeComposite, reorderCompositeLayer, flattenComposite, refreshCompositePreview,
      setFilterQueryAction, toggleFilterType, setFilterHasMaskAction, toggleFilterLeafOnly, clearFilters,
      setLayoutModeAction, isolateBranch, setAnnotation, toggleCompareMode, setCompareNodeIdsAction,
    ],
  );

  return (
    <VersionGraphActionsContext.Provider value={actions}>
      <VersionGraphStateContext.Provider value={state}>
        {children}
      </VersionGraphStateContext.Provider>
    </VersionGraphActionsContext.Provider>
  );
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useVersionGraphState(): VersionGraphState {
  const ctx = useContext(VersionGraphStateContext);
  if (!ctx) throw new Error('useVersionGraphState must be used within a VersionGraphProvider');
  return ctx;
}

export function useVersionGraphActions(): VersionGraphActions {
  const ctx = useContext(VersionGraphActionsContext);
  if (!ctx) throw new Error('useVersionGraphActions must be used within a VersionGraphProvider');
  return ctx;
}

export function useVersionGraph(): VersionGraphState & VersionGraphActions {
  return { ...useVersionGraphState(), ...useVersionGraphActions() };
}
