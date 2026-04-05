'use client';

import { useCallback } from 'react';

import type { Toast } from '@/shared/contracts/ui/ui/base';
import type { AiNode, Edge, RuntimeState } from '@/shared/lib/ai-paths';
import { CANVAS_HEIGHT, CANVAS_WIDTH, NODE_MIN_HEIGHT, NODE_WIDTH, createNodeInstanceId, palette, resolveNodeTypeId, sanitizeEdges } from '@/shared/lib/ai-paths';

import {
  SUBGRAPH_CLIPBOARD_STORAGE_KEY,
  SUBGRAPH_CLIPBOARD_VERSION,
  PASTE_OFFSET_STEP,
  cloneValue,
  parseSubgraphClipboardPayload,
  type SubgraphClipboardPayload,
} from './useCanvasInteractions.helpers';

import type { GraphMutationMeta } from '../GraphContext';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


let inMemorySubgraphClipboard: SubgraphClipboardPayload | null = null;
let pasteSequence = 0;

export interface UseCanvasInteractionsClipboardValue {
  handleCopySelection: () => Promise<void>;
  handlePasteSelection: () => Promise<void>;
  handleCutSelection: () => Promise<void>;
  handleDuplicateSelection: () => void;
  buildClipboardPayloadFromSelection: () => SubgraphClipboardPayload | null;
  writeClipboardPayload: (payload: SubgraphClipboardPayload) => Promise<void>;
  removeNodesAndConnectedEdges: (nodeIds: string[]) => {
    removedNodeCount: number;
    removedEdgeCount: number;
  };
  pasteClipboardPayload: (payload: SubgraphClipboardPayload) => {
    pastedNodeCount: number;
    pastedEdgeCount: number;
  };
  readClipboardPayload: () => Promise<SubgraphClipboardPayload | null>;
}

export function useCanvasInteractionsClipboard({
  nodes,
  edges,
  activePathId,
  isPathLocked,
  notifyLocked,
  toast,
  setNodes,
  setEdges,
  setNodeSelection,
  selectEdge,
  setRuntimeState,
  pruneRuntimeInputsInternal,
  resolveActiveNodeSelectionIds,
  viewportRef,
  lastPointerCanvasPosRef,
  view,
}: {
  nodes: AiNode[];
  edges: Edge[];
  activePathId: string | null;
  isPathLocked: boolean;
  notifyLocked: () => void;
  toast: Toast;
  setNodes: (
    nodes: AiNode[] | ((prev: AiNode[]) => AiNode[]),
    mutationMeta?: GraphMutationMeta
  ) => void;
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[]), mutationMeta?: GraphMutationMeta) => void;
  setNodeSelection: (nodeIds: string[]) => void;
  selectEdge: (edgeId: string | null) => void;
  setRuntimeState: (state: RuntimeState | ((prev: RuntimeState) => RuntimeState)) => void;
  pruneRuntimeInputsInternal: (
    state: RuntimeState,
    removedEdges: Edge[],
    remainingEdges: Edge[]
  ) => RuntimeState;
  resolveActiveNodeSelectionIds: () => string[];
  viewportRef: React.RefObject<HTMLDivElement | null>;
  lastPointerCanvasPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
  view?: { x: number; y: number; scale: number } | undefined;
}): UseCanvasInteractionsClipboardValue {
  const safeView = view ?? { x: 0, y: 0, scale: 1 };
  const buildClipboardPayloadFromSelection = useCallback((): SubgraphClipboardPayload | null => {
    const selectedIds = resolveActiveNodeSelectionIds();
    if (selectedIds.length === 0) return null;
    const selectedIdSet = new Set(selectedIds);
    const copiedNodes = nodes.filter((node: AiNode): boolean => selectedIdSet.has(node.id));
    if (copiedNodes.length === 0) return null;
    const copiedEdges = edges.filter((edge: Edge): boolean =>
      Boolean(edge.from && edge.to && selectedIdSet.has(edge.from) && selectedIdSet.has(edge.to))
    );
    const bounds = copiedNodes.reduce(
      (acc: { minX: number; minY: number; maxX: number; maxY: number }, node: AiNode) => ({
        minX: Math.min(acc.minX, node.position.x),
        minY: Math.min(acc.minY, node.position.y),
        maxX: Math.max(acc.maxX, node.position.x + NODE_WIDTH),
        maxY: Math.max(acc.maxY, node.position.y + NODE_MIN_HEIGHT),
      }),
      {
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      }
    );
    return {
      version: SUBGRAPH_CLIPBOARD_VERSION,
      sourcePathId: activePathId,
      capturedAt: new Date().toISOString(),
      nodes: cloneValue(copiedNodes),
      edges: cloneValue(copiedEdges),
      bounds,
    };
  }, [activePathId, edges, nodes, resolveActiveNodeSelectionIds]);

  const writeClipboardPayload = useCallback(
    async (payload: SubgraphClipboardPayload): Promise<void> => {
      inMemorySubgraphClipboard = payload;
      try {
        window.localStorage.setItem(SUBGRAPH_CLIPBOARD_STORAGE_KEY, JSON.stringify(payload));
      } catch (error) {
        logClientError(error);
      
        // Ignore localStorage write failures.
      }
      const serialized = JSON.stringify(payload);
      try {
        if (
          typeof navigator !== 'undefined' &&
          navigator.clipboard &&
          typeof navigator.clipboard.writeText === 'function'
        ) {
          await navigator.clipboard.writeText(serialized);
        }
      } catch (error) {
        logClientError(error);
      
        // Clipboard API can be blocked in some contexts; in-memory clipboard still works.
      }
    },
    []
  );

  const removeNodesAndConnectedEdges = useCallback(
    (nodeIds: string[]): { removedNodeCount: number; removedEdgeCount: number } => {
      const resolvedNodeIds = Array.from(
        new Set(
          nodeIds
            .map((nodeId: string) => nodeId.trim())
            .filter((nodeId: string): boolean => nodeId.length > 0)
        )
      );
      if (resolvedNodeIds.length === 0) {
        return { removedNodeCount: 0, removedEdgeCount: 0 };
      }
      const nodeIdSet = new Set(resolvedNodeIds);
      const removedEdges = edges.filter((edge: Edge): boolean =>
        Boolean((edge.from && nodeIdSet.has(edge.from)) || (edge.to && nodeIdSet.has(edge.to)))
      );
      const remainingEdges = edges.filter(
        (edge: Edge): boolean =>
          !((edge.from && nodeIdSet.has(edge.from)) || (edge.to && nodeIdSet.has(edge.to)))
      );
      setNodes(
        (prev: AiNode[]): AiNode[] =>
          prev.filter((node: AiNode): boolean => !nodeIdSet.has(node.id)),
        {
          reason: 'delete',
          source: 'canvas.clipboard.remove-nodes',
          allowNodeCountDecrease: true,
        }
      );
      setEdges(remainingEdges, { reason: 'delete', source: 'canvas.clipboard.remove-nodes' });
      setRuntimeState(
        (prev: RuntimeState): RuntimeState =>
          pruneRuntimeInputsInternal(prev, removedEdges, remainingEdges)
      );
      const nextSelection = resolveActiveNodeSelectionIds().filter(
        (nodeId: string): boolean => !nodeIdSet.has(nodeId)
      );
      setNodeSelection(nextSelection);
      selectEdge(null);
      return {
        removedNodeCount: resolvedNodeIds.length,
        removedEdgeCount: removedEdges.length,
      };
    },
    [
      edges,
      pruneRuntimeInputsInternal,
      resolveActiveNodeSelectionIds,
      selectEdge,
      setEdges,
      setNodeSelection,
      setNodes,
      setRuntimeState,
    ]
  );

  const pasteClipboardPayload = useCallback(
    (payload: SubgraphClipboardPayload): { pastedNodeCount: number; pastedEdgeCount: number } => {
      if (payload.nodes.length === 0) {
        return { pastedNodeCount: 0, pastedEdgeCount: 0 };
      }
      const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
      const viewportCenterX = viewport ? viewport.width / 2 : 0;
      const viewportCenterY = viewport ? viewport.height / 2 : 0;
      const cursorAnchor = lastPointerCanvasPosRef.current;
      const targetCanvasCenterX = cursorAnchor
        ? cursorAnchor.x
        : (viewportCenterX - safeView.x) / safeView.scale;
      const targetCanvasCenterY = cursorAnchor
        ? cursorAnchor.y
        : (viewportCenterY - safeView.y) / safeView.scale;
      const boundsWidth = Math.max(1, payload.bounds.maxX - payload.bounds.minX);
      const boundsHeight = Math.max(1, payload.bounds.maxY - payload.bounds.minY);
      const pasteOffset = pasteSequence * PASTE_OFFSET_STEP;
      pasteSequence += 1;

      const existingNodeIdSet = new Set(nodes.map((node: AiNode): string => node.id));
      const existingEdgeIdSet = new Set(edges.map((edge: Edge): string => edge.id));
      const oldToNewNodeId = new Map<string, string>();

      const generateNodeId = (): string => {
        return createNodeInstanceId(existingNodeIdSet);
      };

      const generateEdgeId = (): string => {
        let candidate: string;
        do {
          candidate = `edge-${Math.random().toString(36).slice(2, 10)}`;
        } while (existingEdgeIdSet.has(candidate));
        existingEdgeIdSet.add(candidate);
        return candidate;
      };

      const offsetX = targetCanvasCenterX - boundsWidth / 2 + pasteOffset;
      const offsetY = targetCanvasCenterY - boundsHeight / 2 + pasteOffset;

      const pastedNodes = payload.nodes.map((node: AiNode): AiNode => {
        const newNodeId = generateNodeId();
        oldToNewNodeId.set(node.id, newNodeId);
        const relativeX = node.position.x - payload.bounds.minX;
        const relativeY = node.position.y - payload.bounds.minY;
        const nextX = Math.min(Math.max(offsetX + relativeX, 16), CANVAS_WIDTH - NODE_WIDTH - 16);
        const nextY = Math.min(
          Math.max(offsetY + relativeY, 16),
          CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16
        );
        return {
          ...cloneValue(node),
          id: newNodeId,
          instanceId: newNodeId,
          nodeTypeId: resolveNodeTypeId(node, palette),
          position: { x: nextX, y: nextY },
        };
      });

      const pastedEdges = payload.edges.reduce((acc: Edge[], edge: Edge) => {
        const fromId = edge.from;
        const toId = edge.to;
        if (!fromId || !toId) return acc;
        const from = oldToNewNodeId.get(fromId);
        const to = oldToNewNodeId.get(toId);
        if (!from || !to) return acc;
        acc.push({
          ...cloneValue(edge),
          id: generateEdgeId(),
          from,
          to,
        });
        return acc;
      }, []);

      const nextNodes = [...nodes, ...pastedNodes];
      const nextEdges = sanitizeEdges(nextNodes, [...edges, ...pastedEdges]);
      setNodes(nextNodes, { reason: 'drop', source: 'canvas.clipboard.paste' });
      setEdges(nextEdges, { reason: 'update', source: 'canvas.clipboard.paste' });
      setNodeSelection(pastedNodes.map((node: AiNode): string => node.id));
      selectEdge(null);
      return {
        pastedNodeCount: pastedNodes.length,
        pastedEdgeCount: pastedEdges.length,
      };
    },
    [
      edges,
      nodes,
      selectEdge,
      setEdges,
      setNodeSelection,
      setNodes,
      safeView.scale,
      safeView.x,
      safeView.y,
      viewportRef,
      lastPointerCanvasPosRef,
    ]
  );

  const handleCopySelection = useCallback(async (): Promise<void> => {
    const payload = buildClipboardPayloadFromSelection();
    if (!payload) {
      toast('Select at least one node to copy.', { variant: 'info' });
      return;
    }
    await writeClipboardPayload(payload);
    toast(
      `Copied ${payload.nodes.length} node${payload.nodes.length === 1 ? '' : 's'} and ${payload.edges.length} wire${payload.edges.length === 1 ? '' : 's'}.`,
      { variant: 'success' }
    );
  }, [buildClipboardPayloadFromSelection, toast, writeClipboardPayload]);

  const readClipboardPayload = useCallback(async (): Promise<SubgraphClipboardPayload | null> => {
    if (inMemorySubgraphClipboard) {
      return cloneValue(inMemorySubgraphClipboard);
    }
    try {
      const stored = window.localStorage.getItem(SUBGRAPH_CLIPBOARD_STORAGE_KEY);
      if (stored) {
        const parsed = parseSubgraphClipboardPayload(JSON.parse(stored) as unknown);
        if (parsed) {
          inMemorySubgraphClipboard = parsed;
          return cloneValue(parsed);
        }
      }
    } catch (error) {
      logClientError(error);
    
      // Ignore parse/storage errors and continue to system clipboard.
    }
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof navigator.clipboard.readText === 'function'
      ) {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText.trim()) {
          const parsed = parseSubgraphClipboardPayload(JSON.parse(clipboardText) as unknown);
          if (parsed) {
            inMemorySubgraphClipboard = parsed;
            return cloneValue(parsed);
          }
        }
      }
    } catch (error) {
      logClientError(error);
    
      // Clipboard read may be unavailable due to browser permissions.
    }
    return null;
  }, []);

  const handlePasteSelection = useCallback(async (): Promise<void> => {
    if (isPathLocked) {
      notifyLocked();
      return;
    }
    const payload = await readClipboardPayload();
    if (!payload || payload.nodes.length === 0) {
      toast('Clipboard does not contain AI Path nodes.', { variant: 'info' });
      return;
    }
    const { pastedNodeCount, pastedEdgeCount } = pasteClipboardPayload(payload);
    toast(
      `Pasted ${pastedNodeCount} node${pastedNodeCount === 1 ? '' : 's'} and ${pastedEdgeCount} wire${pastedEdgeCount === 1 ? '' : 's'}.`,
      { variant: 'success' }
    );
  }, [isPathLocked, notifyLocked, pasteClipboardPayload, readClipboardPayload, toast]);

  const handleCutSelection = useCallback(async (): Promise<void> => {
    if (isPathLocked) {
      notifyLocked();
      return;
    }
    const payload = buildClipboardPayloadFromSelection();
    if (!payload) {
      toast('Select at least one node to cut.', { variant: 'info' });
      return;
    }
    await writeClipboardPayload(payload);
    const selectedIds = resolveActiveNodeSelectionIds();
    const { removedNodeCount, removedEdgeCount } = removeNodesAndConnectedEdges(selectedIds);
    toast(
      `Cut ${removedNodeCount} node${removedNodeCount === 1 ? '' : 's'} and ${removedEdgeCount} wire${removedEdgeCount === 1 ? '' : 's'}.`,
      { variant: 'success' }
    );
  }, [
    buildClipboardPayloadFromSelection,
    isPathLocked,
    notifyLocked,
    removeNodesAndConnectedEdges,
    resolveActiveNodeSelectionIds,
    toast,
    writeClipboardPayload,
  ]);

  const handleDuplicateSelection = useCallback((): void => {
    if (isPathLocked) {
      notifyLocked();
      return;
    }
    const payload = buildClipboardPayloadFromSelection();
    if (!payload) {
      toast('Select at least one node to duplicate.', { variant: 'info' });
      return;
    }
    const { pastedNodeCount, pastedEdgeCount } = pasteClipboardPayload(payload);
    toast(
      `Duplicated ${pastedNodeCount} node${pastedNodeCount === 1 ? '' : 's'} and ${pastedEdgeCount} wire${pastedEdgeCount === 1 ? '' : 's'}.`,
      { variant: 'success' }
    );
  }, [
    buildClipboardPayloadFromSelection,
    isPathLocked,
    notifyLocked,
    pasteClipboardPayload,
    toast,
  ]);

  return {
    handleCopySelection,
    handlePasteSelection,
    handleCutSelection,
    handleDuplicateSelection,
    buildClipboardPayloadFromSelection,
    writeClipboardPayload,
    removeNodesAndConnectedEdges,
    pasteClipboardPayload,
    readClipboardPayload,
  };
}
