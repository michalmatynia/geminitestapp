'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { AiNode, Edge, NodeDefinition, RuntimeState } from '@/features/ai/ai-paths/lib';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  NODE_MIN_HEIGHT,
  NODE_WIDTH,
  VIEW_MARGIN,
  clampScale,
  clampTranslate,
  getDefaultConfigForType,
  getPortOffsetY,
  sanitizeEdges,
  validateConnection,
} from '@/features/ai/ai-paths/lib';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useToast } from '@/shared/ui';
import { DRAG_KEYS, getFirstDragValue, setDragData } from '@/shared/utils/drag-drop';

import { useCanvasState, useCanvasActions, useCanvasRefs } from './useCanvas';
import { useEdgePaths } from './useEdgePaths';
import { useGraphState, useGraphActions } from './useGraph';
import { useRuntimeActions } from './useRuntime';
import { useSelectionState, useSelectionActions } from './useSelection';

type MarqueeMode = 'replace' | 'add' | 'subtract';

type MarqueeSelectionState = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  mode: MarqueeMode;
  baseNodeIds: string[];
};

type SubgraphClipboardPayload = {
  version: 1;
  sourcePathId: string | null;
  capturedAt: string;
  nodes: AiNode[];
  edges: Edge[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
};

const SUBGRAPH_CLIPBOARD_VERSION = 1 as const;
const SUBGRAPH_CLIPBOARD_STORAGE_KEY = 'ai-paths:canvas-subgraph-clipboard:v1';
const PASTE_OFFSET_STEP = 28;

let inMemorySubgraphClipboard: SubgraphClipboardPayload | null = null;
let pasteSequence = 0;

const cloneValue = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const parseSubgraphClipboardPayload = (
  value: unknown
): SubgraphClipboardPayload | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record['version'] !== SUBGRAPH_CLIPBOARD_VERSION) return null;
  const nodes = record['nodes'];
  const edges = record['edges'];
  if (!Array.isArray(nodes) || !Array.isArray(edges)) return null;
  const bounds = record['bounds'];
  if (!bounds || typeof bounds !== 'object' || Array.isArray(bounds)) return null;
  const boundsRecord = bounds as Record<string, unknown>;
  const minX = Number(boundsRecord['minX']);
  const minY = Number(boundsRecord['minY']);
  const maxX = Number(boundsRecord['maxX']);
  const maxY = Number(boundsRecord['maxY']);
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }
  return {
    version: SUBGRAPH_CLIPBOARD_VERSION,
    sourcePathId:
      typeof record['sourcePathId'] === 'string' ? record['sourcePathId'] : null,
    capturedAt:
      typeof record['capturedAt'] === 'string'
        ? record['capturedAt']
        : new Date().toISOString(),
    nodes: cloneValue(nodes as AiNode[]),
    edges: cloneValue(edges as Edge[]),
    bounds: { minX, minY, maxX, maxY },
  };
};

const getMarqueeRect = (state: MarqueeSelectionState): {
  left: number;
  top: number;
  width: number;
  height: number;
} => ({
  left: Math.min(state.startX, state.currentX),
  top: Math.min(state.startY, state.currentY),
  width: Math.abs(state.currentX - state.startX),
  height: Math.abs(state.currentY - state.startY),
});

/**
 * Hook that manages all canvas-related interactions (pan, drag, connect, drop)
 * using AI-Paths contexts.
 *
 * This hook replaces the prop-drilling of handlers by providing them directly
 * from the context-aware logic.
 */
export function useCanvasInteractions(args?: {
  confirmNodeSwitch?: (nodeId: string) => boolean | Promise<boolean>;
}) {
  const { confirmNodeSwitch } = args ?? {};
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();

  // Context: Canvas
  const { view, panState, dragState, connecting, connectingPos, lastDrop } = useCanvasState();
  const {
    updateView,
    startPan,
    endPan,
    startDrag,
    endDrag,
    startConnection,
    endConnection,
    setConnectingPos,
    setLastDrop
  } = useCanvasActions();
  const { viewportRef, canvasRef } = useCanvasRefs();

  // Context: Graph
  const { nodes, edges, isPathLocked, activePathId } = useGraphState();
  const { setNodes, setEdges, updateNode, removeNode, removeEdge } = useGraphActions();

  // Context: Selection
  const {
    selectedNodeId,
    selectedNodeIds,
    selectedEdgeId,
    selectionToolMode,
  } = useSelectionState();
  const {
    selectNode,
    setNodeSelection,
    selectEdge,
  } = useSelectionActions();

  // Context: Runtime
  const { setRuntimeState } = useRuntimeActions();

  // Derived: Edge paths
  const edgePaths = useEdgePaths();
  const selectedNodeIdSet = useMemo(
    (): Set<string> => new Set(selectedNodeIds),
    [selectedNodeIds]
  );

  // Refs for throttling and timers
  const pendingDragRef = useRef<{ nodeId: string; x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lockedToastAtRef = useRef<number>(0);
  const [marqueeSelection, setMarqueeSelection] =
    useState<MarqueeSelectionState | null>(null);

  const getPointerCaptureTarget = (
    event: React.PointerEvent<HTMLElement>
  ): (Element & {
    setPointerCapture?: (pointerId: number) => void;
    releasePointerCapture?: (pointerId: number) => void;
    hasPointerCapture?: (pointerId: number) => boolean;
  }) | null => {
    const nativeCurrentTarget = event.nativeEvent.currentTarget;
    const candidates: EventTarget[] = [
      event.currentTarget,
      ...(nativeCurrentTarget ? [nativeCurrentTarget] : []),
      event.target,
    ];
    for (const candidate of candidates) {
      if (candidate instanceof Element) {
        return candidate as Element & {
          setPointerCapture?: (pointerId: number) => void;
          releasePointerCapture?: (pointerId: number) => void;
          hasPointerCapture?: (pointerId: number) => boolean;
        };
      }
    }
    return null;
  };

  const setPointerCaptureSafe = (
    target: (Element & { setPointerCapture?: (pointerId: number) => void }) | null,
    pointerId: number
  ): void => {
    if (!target || typeof target.setPointerCapture !== 'function') return;
    try {
      target.setPointerCapture(pointerId);
    } catch {
      // Ignore pointer-capture errors from detached/non-capturing targets.
    }
  };

  const releasePointerCaptureSafe = (
    target: (Element & {
      releasePointerCapture?: (pointerId: number) => void;
      hasPointerCapture?: (pointerId: number) => boolean;
    }) | null,
    pointerId: number
  ): void => {
    if (!target || typeof target.releasePointerCapture !== 'function') return;
    try {
      if (typeof target.hasPointerCapture !== 'function' || target.hasPointerCapture(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
    } catch {
      // Ignore release failures for already-detached targets.
    }
  };

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  const pruneRuntimeInputsInternal = useCallback(
    (state: RuntimeState, removedEdges: Edge[], remainingEdges: Edge[]): RuntimeState => {
      if (removedEdges.length === 0) return state;
      const remainingTargets = new Set<string>();
      remainingEdges.forEach((edge: Edge) => {
        if (!edge.toPort) return;
        remainingTargets.add(`${edge.to}:${edge.toPort}`);
      });

      const existingInputs = state.inputs ?? {};
      let nextInputs: Record<string, Record<string, unknown>> = existingInputs;
      let changed = false;

      removedEdges.forEach((edge: Edge) => {
        if (!edge.toPort) return;
        const targetKey = `${edge.to}:${edge.toPort}`;
        if (remainingTargets.has(targetKey)) return;
        const nodeInputs = (nextInputs?.[edge.to] ?? {});
        if (!(edge.toPort in nodeInputs)) return;
        if (!changed) {
          nextInputs = { ...existingInputs };
          changed = true;
        }
        const nextNodeInputs = { ...nodeInputs };
        delete nextNodeInputs[edge.toPort];
        if (Object.keys(nextNodeInputs).length === 0) {
          const { [edge.to]: _, ...restInputs } = nextInputs;
          nextInputs = restInputs;
        } else {
          nextInputs[edge.to] = nextNodeInputs;
        }
      });

      if (!changed) return state;
      return { ...state, inputs: nextInputs };
    },
    []
  );

  const notifyLocked = useCallback((): void => {
    const now = Date.now();
    if (now - lockedToastAtRef.current < 800) return;
    lockedToastAtRef.current = now;
    toast('This path is locked. Unlock it to edit nodes or connections.', {
      variant: 'info',
    });
  }, [toast]);

  const setViewClamped = useCallback((next: { x: number; y: number; scale: number }): void => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    const clampedScale = clampScale(next.scale);
    const clamped = clampTranslate(next.x, next.y, clampedScale, viewport);
    updateView({ x: clamped.x, y: clamped.y, scale: clampedScale });
  }, [viewportRef, updateView]);

  const getPortPosition = useCallback((
    node: AiNode,
    portName: string | undefined,
    side: 'input' | 'output'
  ): { x: number; y: number } => {
    const ports = side === 'input' ? node.inputs : node.outputs;
    const index = portName ? ports.indexOf(portName) : -1;
    const safeIndex = index >= 0 ? index : Math.max(0, Math.floor(ports.length / 2));
    const x = node.position.x + (side === 'output' ? NODE_WIDTH : 0);
    const y = node.position.y + getPortOffsetY(safeIndex, ports.length);
    return { x, y };
  }, []);

  const isTypingTarget = (target: EventTarget | null): boolean => {
    const element = target as HTMLElement | null;
    if (!element) return false;
    if (element.isContentEditable) return true;
    const tag = element.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    return Boolean(element.closest('input, textarea, select, [contenteditable="true"]'));
  };

  const resolveActiveNodeSelectionIds = useCallback((): string[] => {
    if (selectedNodeIds.length > 0) {
      return selectedNodeIds.filter((id: string): boolean => id.trim().length > 0);
    }
    if (selectedNodeId) return [selectedNodeId];
    return [];
  }, [selectedNodeId, selectedNodeIds]);

  const buildClipboardPayloadFromSelection =
    useCallback((): SubgraphClipboardPayload | null => {
      const selectedIds = resolveActiveNodeSelectionIds();
      if (selectedIds.length === 0) return null;
      const selectedIdSet = new Set(selectedIds);
      const copiedNodes = nodes.filter((node: AiNode): boolean => selectedIdSet.has(node.id));
      if (copiedNodes.length === 0) return null;
      const copiedEdges = edges.filter(
        (edge: Edge): boolean =>
          selectedIdSet.has(edge.from) && selectedIdSet.has(edge.to)
      );
      const bounds = copiedNodes.reduce(
        (
          acc: { minX: number; minY: number; maxX: number; maxY: number },
          node: AiNode
        ) => ({
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

  const handleCopySelection = useCallback(async (): Promise<void> => {
    const payload = buildClipboardPayloadFromSelection();
    if (!payload) {
      toast('Select at least one node to copy.', { variant: 'info' });
      return;
    }
    inMemorySubgraphClipboard = payload;
    try {
      window.localStorage.setItem(
        SUBGRAPH_CLIPBOARD_STORAGE_KEY,
        JSON.stringify(payload)
      );
    } catch {
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
    } catch {
      // Clipboard API can be blocked in some contexts; in-memory clipboard still works.
    }
    toast(
      `Copied ${payload.nodes.length} node${payload.nodes.length === 1 ? '' : 's'} and ${payload.edges.length} wire${payload.edges.length === 1 ? '' : 's'}.`,
      { variant: 'success' }
    );
  }, [buildClipboardPayloadFromSelection, toast]);

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
    } catch {
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
          const parsed = parseSubgraphClipboardPayload(
            JSON.parse(clipboardText) as unknown
          );
          if (parsed) {
            inMemorySubgraphClipboard = parsed;
            return cloneValue(parsed);
          }
        }
      }
    } catch {
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
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    const viewportCenterX = viewport ? viewport.width / 2 : 0;
    const viewportCenterY = viewport ? viewport.height / 2 : 0;
    const targetCanvasCenterX = (viewportCenterX - view.x) / view.scale;
    const targetCanvasCenterY = (viewportCenterY - view.y) / view.scale;
    const boundsWidth = Math.max(1, payload.bounds.maxX - payload.bounds.minX);
    const boundsHeight = Math.max(1, payload.bounds.maxY - payload.bounds.minY);
    const pasteOffset = pasteSequence * PASTE_OFFSET_STEP;
    pasteSequence += 1;

    const existingNodeIdSet = new Set(nodes.map((node: AiNode): string => node.id));
    const existingEdgeIdSet = new Set(edges.map((edge: Edge): string => edge.id));
    const oldToNewNodeId = new Map<string, string>();

    const generateNodeId = (): string => {
      let candidate = '';
      do {
        candidate = `node-${Math.random().toString(36).slice(2, 10)}`;
      } while (existingNodeIdSet.has(candidate));
      return candidate;
    };

    const generateEdgeId = (): string => {
      let candidate = '';
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
      existingNodeIdSet.add(newNodeId);
      const relativeX = node.position.x - payload.bounds.minX;
      const relativeY = node.position.y - payload.bounds.minY;
      const nextX = Math.min(
        Math.max(offsetX + relativeX, 16),
        CANVAS_WIDTH - NODE_WIDTH - 16
      );
      const nextY = Math.min(
        Math.max(offsetY + relativeY, 16),
        CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16
      );
      return {
        ...cloneValue(node),
        id: newNodeId,
        position: { x: nextX, y: nextY },
      };
    });

    const pastedEdges = payload.edges.reduce((acc: Edge[], edge: Edge) => {
      const from = oldToNewNodeId.get(edge.from);
      const to = oldToNewNodeId.get(edge.to);
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
    setNodes(nextNodes);
    setEdges(nextEdges);
    setNodeSelection(pastedNodes.map((node: AiNode): string => node.id));
    selectEdge(null);
    toast(
      `Pasted ${pastedNodes.length} node${pastedNodes.length === 1 ? '' : 's'} and ${pastedEdges.length} wire${pastedEdges.length === 1 ? '' : 's'}.`,
      { variant: 'success' }
    );
  }, [
    edges,
    isPathLocked,
    nodes,
    notifyLocked,
    readClipboardPayload,
    selectEdge,
    setEdges,
    setNodeSelection,
    setNodes,
    toast,
    view.scale,
    view.x,
    view.y,
    viewportRef,
  ]);

  const resolveNodesWithinMarquee = useCallback(
    (state: MarqueeSelectionState): string[] => {
      const rect = getMarqueeRect(state);
      if (rect.width < 2 && rect.height < 2) return [];
      const x1 = (rect.left - view.x) / view.scale;
      const y1 = (rect.top - view.y) / view.scale;
      const x2 = (rect.left + rect.width - view.x) / view.scale;
      const y2 = (rect.top + rect.height - view.y) / view.scale;
      const minX = Math.min(x1, x2);
      const minY = Math.min(y1, y2);
      const maxX = Math.max(x1, x2);
      const maxY = Math.max(y1, y2);
      return nodes
        .filter((node: AiNode): boolean => {
          const nodeLeft = node.position.x;
          const nodeTop = node.position.y;
          const nodeRight = node.position.x + NODE_WIDTH;
          const nodeBottom = node.position.y + NODE_MIN_HEIGHT;
          return !(
            nodeRight < minX ||
            nodeLeft > maxX ||
            nodeBottom < minY ||
            nodeTop > maxY
          );
        })
        .map((node: AiNode): string => node.id);
    },
    [nodes, view.scale, view.x, view.y]
  );

  const applyMarqueeSelection = useCallback(
    (state: MarqueeSelectionState): void => {
      const marqueeNodeIds = resolveNodesWithinMarquee(state);
      const marqueeSet = new Set(marqueeNodeIds);
      const baseSet = new Set(state.baseNodeIds);
      const resolvedIds =
        state.mode === 'replace'
          ? marqueeNodeIds
          : state.mode === 'add'
            ? Array.from(new Set([...state.baseNodeIds, ...marqueeNodeIds]))
            : state.baseNodeIds.filter((id: string): boolean => !marqueeSet.has(id));
      if (state.mode !== 'replace' && baseSet.size === 0 && marqueeSet.size === 0) {
        setNodeSelection([]);
        return;
      }
      setNodeSelection(resolvedIds);
    },
    [resolveNodesWithinMarquee, setNodeSelection]
  );

  const selectionMarqueeRect = useMemo((): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null => {
    if (!marqueeSelection) return null;
    const rect = getMarqueeRect(marqueeSelection);
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }, [marqueeSelection]);

  // ---------------------------------------------------------------------------
  // View Actions
  // ---------------------------------------------------------------------------

  const zoomTo = useCallback((targetScale: number): void => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport) {
      setViewClamped({ ...view, scale: targetScale });
      return;
    }
    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;
    const nextScale = clampScale(targetScale);
    const canvasX = (centerX - view.x) / view.scale;
    const canvasY = (centerY - view.y) / view.scale;
    const nextX = centerX - canvasX * nextScale;
    const nextY = centerY - canvasY * nextScale;
    const clamped = clampTranslate(nextX, nextY, nextScale, viewport);
    updateView({ x: clamped.x, y: clamped.y, scale: nextScale });
  }, [view, viewportRef, setViewClamped, updateView]);

  const fitToNodes = useCallback((): void => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport || nodes.length === 0) {
      setViewClamped({ x: VIEW_MARGIN, y: VIEW_MARGIN, scale: 1 });
      return;
    }
    const padding = 120;
    const bounds = nodes.reduce(
      (acc, node) => {
        const x1 = node.position.x;
        const y1 = node.position.y;
        const x2 = node.position.x + NODE_WIDTH;
        const y2 = node.position.y + NODE_MIN_HEIGHT;
        return {
          minX: Math.min(acc.minX, x1),
          minY: Math.min(acc.minY, y1),
          maxX: Math.max(acc.maxX, x2),
          maxY: Math.max(acc.maxY, y2),
        };
      },
      {
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      }
    );
    const width = Math.max(1, bounds.maxX - bounds.minX + padding * 2);
    const height = Math.max(1, bounds.maxY - bounds.minY + padding * 2);
    const scaleX = viewport.width / width;
    const scaleY = viewport.height / height;
    const nextScale = clampScale(Math.min(scaleX, scaleY));
    const centerX = bounds.minX + (bounds.maxX - bounds.minX) / 2;
    const centerY = bounds.minY + (bounds.maxY - bounds.minY) / 2;
    const nextX = viewport.width / 2 - centerX * nextScale;
    const nextY = viewport.height / 2 - centerY * nextScale;
    const clamped = clampTranslate(nextX, nextY, nextScale, viewport);
    updateView({ x: clamped.x, y: clamped.y, scale: nextScale });
  }, [nodes, viewportRef, setViewClamped, updateView]);

  const resetView = useCallback((): void => {
    setViewClamped({ x: VIEW_MARGIN, y: VIEW_MARGIN, scale: 1 });
  }, [setViewClamped]);

  const ensureNodeVisible = useCallback((node: AiNode): void => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport) return;
    const nodeLeft = node.position.x * view.scale + view.x;
    const nodeTop = node.position.y * view.scale + view.y;
    const nodeRight = nodeLeft + NODE_WIDTH * view.scale;
    const nodeBottom = nodeTop + NODE_MIN_HEIGHT * view.scale;
    let nextX = view.x;
    let nextY = view.y;
    if (nodeLeft < VIEW_MARGIN) {
      nextX += VIEW_MARGIN - nodeLeft;
    } else if (nodeRight > viewport.width - VIEW_MARGIN) {
      nextX -= nodeRight - (viewport.width - VIEW_MARGIN);
    }
    if (nodeTop < VIEW_MARGIN) {
      nextY += VIEW_MARGIN - nodeTop;
    } else if (nodeBottom > viewport.height - VIEW_MARGIN) {
      nextY -= nodeBottom - (viewport.height - VIEW_MARGIN);
    }
    const clamped = clampTranslate(nextX, nextY, view.scale, viewport);
    updateView({ x: clamped.x, y: clamped.y, scale: view.scale });
  }, [view, viewportRef, updateView]);

  // ---------------------------------------------------------------------------
  // Interaction Handlers
  // ---------------------------------------------------------------------------

  const handlePointerDownNode = useCallback(async (
    event: React.PointerEvent<HTMLDivElement>,
    nodeId: string
  ): Promise<void> => {
    if (isPathLocked) {
      notifyLocked();
      return;
    }
    
    event.stopPropagation();
    const target = getPointerCaptureTarget(event);
    const pointerId = event.pointerId;
    const clientX = event.clientX;
    const clientY = event.clientY;

    if (confirmNodeSwitch) {
      const result = confirmNodeSwitch(nodeId);
      const confirmed = result instanceof Promise ? await result : result;
      if (!confirmed) return;
    }

    setPointerCaptureSafe(target, pointerId);
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (!viewport) return;
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return;
    const canvasX = (clientX - viewport.left - view.x) / view.scale;
    const canvasY = (clientY - viewport.top - view.y) / view.scale;
    
    startDrag(nodeId, canvasX - node.position.x, canvasY - node.position.y);
  }, [isPathLocked, nodes, view, viewportRef, startDrag, notifyLocked, confirmNodeSwitch]);

  const handlePointerMoveNode = useCallback((
    event: React.PointerEvent<HTMLDivElement>,
    nodeId: string
  ): void => {
    if (dragState?.nodeId !== nodeId) return;
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (!viewport) return;
    const nextX = Math.min(
      Math.max((event.clientX - viewport.left - view.x) / view.scale - dragState.offsetX, 16),
      CANVAS_WIDTH - NODE_WIDTH - 16
    );
    const nextY = Math.min(
      Math.max((event.clientY - viewport.top - view.y) / view.scale - dragState.offsetY, 16),
      CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16
    );

    // RAF throttling
    pendingDragRef.current = { nodeId, x: nextX, y: nextY };
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        if (pendingDragRef.current) {
          const { nodeId: id, x, y } = pendingDragRef.current;
          updateNode(id, { position: { x, y } });
        }
        rafIdRef.current = null;
      });
    }
  }, [dragState, view, viewportRef, updateNode]);

  const handlePointerUpNode = useCallback((
    event: React.PointerEvent<HTMLDivElement>,
    nodeId: string
  ): void => {
    if (dragState?.nodeId !== nodeId) return;
    releasePointerCaptureSafe(getPointerCaptureTarget(event), event.pointerId);

    // Flush any pending RAF drag update
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (pendingDragRef.current) {
      const { nodeId: id, x, y } = pendingDragRef.current;
      updateNode(id, { position: { x, y } });
      pendingDragRef.current = null;
    }

    endDrag();
  }, [dragState, endDrag, updateNode]);

  const handlePanStart = useCallback((event: React.PointerEvent<HTMLDivElement>): void => {
    const canvasEl = canvasRef.current;
    const targetEl = event.target as Element | null;
    if (targetEl?.closest('path')) return;
    if (
      event.target !== event.currentTarget &&
      event.target !== canvasEl &&
      targetEl?.tagName?.toLowerCase() !== 'svg'
    ) {
      return;
    }
    if (connecting) {
      endConnection();
      return;
    }
    if (selectionToolMode === 'select') {
      const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
      if (!viewport) return;
      const mode: MarqueeMode = event.altKey
        ? 'subtract'
        : event.shiftKey
          ? 'add'
          : 'replace';
      const startX = event.clientX - viewport.left;
      const startY = event.clientY - viewport.top;
      const baseNodeIds = mode === 'replace' ? [] : [...selectedNodeIdSet];
      if (mode === 'replace') {
        setNodeSelection([]);
      }
      selectEdge(null);
      setPointerCaptureSafe(getPointerCaptureTarget(event), event.pointerId);
      setMarqueeSelection({
        startX,
        startY,
        currentX: startX,
        currentY: startY,
        mode,
        baseNodeIds,
      });
      return;
    }
    setPointerCaptureSafe(getPointerCaptureTarget(event), event.pointerId);
    startPan(event.clientX, event.clientY);
  }, [
    canvasRef,
    connecting,
    endConnection,
    selectedNodeIdSet,
    selectionToolMode,
    setNodeSelection,
    selectEdge,
    startPan,
    viewportRef,
  ]);

  const handlePanMove = useCallback((event: React.PointerEvent<HTMLDivElement>): void => {
    if (marqueeSelection) {
      const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
      if (!viewport) return;
      const nextState: MarqueeSelectionState = {
        ...marqueeSelection,
        currentX: event.clientX - viewport.left,
        currentY: event.clientY - viewport.top,
      };
      setMarqueeSelection(nextState);
      applyMarqueeSelection(nextState);
      return;
    }
    if (connecting) {
      const viewport = viewportRef.current?.getBoundingClientRect();
      if (!viewport) return;
      const x = (event.clientX - viewport.left - view.x) / view.scale;
      const y = (event.clientY - viewport.top - view.y) / view.scale;
      setConnectingPos({ x, y });
      return;
    }
    if (!panState) return;
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    const nextX = panState.originX + (event.clientX - panState.startX);
    const nextY = panState.originY + (event.clientY - panState.startY);
    const clamped = clampTranslate(nextX, nextY, view.scale, viewport);
    updateView({ x: clamped.x, y: clamped.y });
  }, [
    applyMarqueeSelection,
    connecting,
    marqueeSelection,
    panState,
    setConnectingPos,
    updateView,
    view,
    viewportRef,
  ]);

  const handlePanEnd = useCallback((event: React.PointerEvent<HTMLDivElement>): void => {
    if (marqueeSelection) {
      releasePointerCaptureSafe(getPointerCaptureTarget(event), event.pointerId);
      setMarqueeSelection(null);
      return;
    }
    if (panState) {
      releasePointerCaptureSafe(getPointerCaptureTarget(event), event.pointerId);
      endPan();
    }
    if (connecting) {
      endConnection();
    }
  }, [marqueeSelection, panState, connecting, endPan, endConnection]);

  // ---------------------------------------------------------------------------
  // Edge Handlers
  // ---------------------------------------------------------------------------

  const handleRemoveEdge = useCallback((edgeId: string): void => {
    if (isPathLocked) {
      notifyLocked();
      return;
    }
    const target = edges.find((edge) => edge.id === edgeId) ?? null;
    if (!target) return;

    removeEdge(edgeId);
    
    // Cleanup runtime inputs for removed edge
    const remaining = edges.filter((e) => e.id !== edgeId);
    setRuntimeState((prev: RuntimeState) => pruneRuntimeInputsInternal(prev, [target], remaining));

    if (selectedEdgeId === edgeId) {
      selectEdge(null);
    }
  }, [edges, isPathLocked, notifyLocked, removeEdge, setRuntimeState, pruneRuntimeInputsInternal, selectedEdgeId, selectEdge]);

  const handleDisconnectPort = useCallback((direction: 'input' | 'output', nodeId: string, port: string): void => {
    if (isPathLocked) {
      notifyLocked();
      return;
    }
    const shouldRemove = (edge: Edge): boolean =>
      direction === 'input'
        ? edge.to === nodeId && edge.toPort === port
        : edge.from === nodeId && edge.fromPort === port;
    
    const removed = edges.filter(shouldRemove);
    const remaining = edges.filter((e) => !shouldRemove(e));

    setEdges(remaining);
    setRuntimeState((prev: RuntimeState) => pruneRuntimeInputsInternal(prev, removed, remaining));

    if (selectedEdgeId) {
      const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
      if (selectedEdge && shouldRemove(selectedEdge)) {
        selectEdge(null);
      }
    }
  }, [edges, isPathLocked, notifyLocked, setEdges, setRuntimeState, pruneRuntimeInputsInternal, selectedEdgeId, selectEdge]);

  const handleStartConnection = useCallback(async (
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string
  ): Promise<void> => {
    if (isPathLocked) {
      notifyLocked();
      return;
    }
    
    if (confirmNodeSwitch) {
      const result = confirmNodeSwitch(node.id);
      const confirmed = result instanceof Promise ? await result : result;
      if (!confirmed) return;
    }

    event.stopPropagation();
    const start = getPortPosition(node, port, 'output');
    startConnection(node.id, port, start);
  }, [isPathLocked, getPortPosition, startConnection, notifyLocked, confirmNodeSwitch]);

  const handleCompleteConnection = useCallback((
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string
  ): void => {
    if (isPathLocked) {
      notifyLocked();
      return;
    }
    event.stopPropagation();
    if (!connecting) return;
    if (connecting.fromNodeId === node.id && connecting.fromPort === port) {
      endConnection();
      return;
    }

    const fromNode = nodes.find((n) => n.id === connecting.fromNodeId);
    if (!fromNode) {
      endConnection();
      return;
    }

    const validation = validateConnection(fromNode, node, connecting.fromPort, port);
    if (!validation.valid) {
      toast(validation.message ?? 'Invalid connection.', { variant: 'error' });
      endConnection();
      return;
    }

    const newEdge: Edge = {
      id: `edge-${Math.random().toString(36).slice(2, 8)}`,
      from: connecting.fromNodeId,
      to: node.id,
      fromPort: connecting.fromPort,
      toPort: port,
    };

    setEdges((prev) => [...prev, newEdge]);
    toast('Connection created.', { variant: 'success' });
    endConnection();
  }, [connecting, nodes, isPathLocked, endConnection, setEdges, toast, notifyLocked]);

  const handleReconnectInput = useCallback(async (
    event: React.PointerEvent<HTMLButtonElement>,
    nodeId: string,
    port: string
  ): Promise<void> => {
    if (isPathLocked) {
      notifyLocked();
      return;
    }
    if (connecting) return;
    
    const edgeToMove = edges.find((e) => e.to === nodeId && e.toPort === port);
    if (!edgeToMove?.from || !edgeToMove.fromPort) return;
    
    const fromNode = nodes.find((n) => n.id === edgeToMove.from);
    if (!fromNode) return;

    if (confirmNodeSwitch) {
      const result = confirmNodeSwitch(nodeId);
      const confirmed = result instanceof Promise ? await result : result;
      if (!confirmed) return;
    }

    const start = getPortPosition(fromNode, edgeToMove.fromPort, 'output');
    const viewport = viewportRef.current?.getBoundingClientRect();
    const nextPos = viewport
      ? {
        x: (event.clientX - viewport.left - view.x) / view.scale,
        y: (event.clientY - viewport.top - view.y) / view.scale,
      }
      : start;

    const remaining = edges.filter((e) => e.id !== edgeToMove.id);
    setEdges(remaining);
    setRuntimeState((prev: RuntimeState) => pruneRuntimeInputsInternal(prev, [edgeToMove], remaining));

    if (selectedEdgeId === edgeToMove.id) {
      selectEdge(null);
    }

    startConnection(edgeToMove.from, edgeToMove.fromPort, start);
    setConnectingPos(nextPos);
  }, [
    edges,
    nodes,
    view,
    viewportRef,
    isPathLocked,
    connecting,
    startConnection,
    setConnectingPos,
    setEdges,
    setRuntimeState,
    pruneRuntimeInputsInternal,
    selectedEdgeId,
    selectEdge,
    getPortPosition,
    notifyLocked,
    confirmNodeSwitch
  ]);

  // ---------------------------------------------------------------------------
  // Node Handlers
  // ---------------------------------------------------------------------------

  const handleDeleteSelectedNode = useCallback((): void => {
    const nodeIdsToDelete = resolveActiveNodeSelectionIds();
    if (nodeIdsToDelete.length === 0) return;
    if (isPathLocked) {
      notifyLocked();
      return;
    }
    const nodeIdSet = new Set(nodeIdsToDelete);
    const isSingleNode = nodeIdsToDelete.length === 1;
    const targetNode = isSingleNode
      ? nodes.find((n) => n.id === nodeIdsToDelete[0])
      : null;
    const label = isSingleNode
      ? targetNode?.title || 'this node'
      : `${nodeIdsToDelete.length} nodes`;
    
    confirm({
      title: 'Remove Node?',
      message: `Are you sure you want to remove ${label}? This will delete all connected wires.`,
      confirmText: 'Remove',
      isDangerous: true,
      onConfirm: () => {
        if (isSingleNode && nodeIdsToDelete[0]) {
          removeNode(nodeIdsToDelete[0]);
        } else {
          setNodes((prev: AiNode[]): AiNode[] =>
            prev.filter((node: AiNode): boolean => !nodeIdSet.has(node.id))
          );
        }
        
        const removedEdges = edges.filter(
          (e) => nodeIdSet.has(e.from) || nodeIdSet.has(e.to)
        );
        const remainingEdges = edges.filter(
          (e) => !nodeIdSet.has(e.from) && !nodeIdSet.has(e.to)
        );
        
        setEdges(remainingEdges);
        setRuntimeState((prev: RuntimeState) => pruneRuntimeInputsInternal(prev, removedEdges, remainingEdges));
        
        selectNode(null);
        setNodeSelection([]);
        selectEdge(null);
      }
    });
  }, [
    resolveActiveNodeSelectionIds,
    isPathLocked,
    nodes,
    confirm,
    edges,
    notifyLocked,
    pruneRuntimeInputsInternal,
    removeNode,
    selectEdge,
    selectNode,
    setEdges,
    setNodeSelection,
    setNodes,
    setRuntimeState,
  ]);

  const handleSelectNode = useCallback(async (nodeId: string): Promise<void> => {
    if (nodeId === selectedNodeId) return;
    
    if (confirmNodeSwitch) {
      const result = confirmNodeSwitch(nodeId);
      const confirmed = result instanceof Promise ? await result : result;
      if (!confirmed) return;
    }
    
    selectEdge(null);
    selectNode(nodeId);
  }, [selectedNodeId, selectNode, selectEdge, confirmNodeSwitch]);

  // ---------------------------------------------------------------------------
  // Drag & Drop Handlers
  // ---------------------------------------------------------------------------

  const handleDragStart = useCallback((
    event: React.DragEvent<HTMLDivElement>,
    node: NodeDefinition
  ): void => {
    if (isPathLocked) {
      event.preventDefault();
      notifyLocked();
      return;
    }
    const payload = JSON.stringify(node);
    setDragData(
      event.dataTransfer,
      { [DRAG_KEYS.AI_NODE]: payload },
      { effectAllowed: 'copy' }
    );
  }, [isPathLocked, notifyLocked]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    if (isPathLocked) {
      notifyLocked();
      return;
    }
    
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (!viewport) return;
    const canvasRect = canvasRef.current?.getBoundingClientRect() ?? null;

    const raw = getFirstDragValue(event.dataTransfer, [DRAG_KEYS.AI_NODE]);
    if (!raw) return;

    let payload: NodeDefinition | null = null;
    try {
      payload = JSON.parse(raw) as NodeDefinition;
    } catch (_error) {
      toast('Failed to add node. Invalid data.', { variant: 'error' });
      return;
    }
    
    if (!payload?.type) return;

    const localX = canvasRect
      ? (event.clientX - canvasRect.left) / view.scale
      : (event.clientX - viewport.left - view.x) / view.scale;
    const localY = canvasRect
      ? (event.clientY - canvasRect.top) / view.scale
      : (event.clientY - viewport.top - view.y) / view.scale;
    
    const nextX = Math.min(Math.max(localX - NODE_WIDTH / 2, 16), CANVAS_WIDTH - NODE_WIDTH - 16);
    const nextY = Math.min(Math.max(localY - NODE_MIN_HEIGHT / 2, 16), CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16);
    
    const defaultConfig = getDefaultConfigForType(payload.type, payload.outputs, payload.inputs);
    const mergedConfig = payload.config ? { ...defaultConfig, ...payload.config } : defaultConfig;
    
    const newNodeId = `node-${Math.random().toString(36).slice(2, 10)}`;
    const newNode: AiNode = {
      ...payload,
      id: newNodeId,
      position: { x: nextX, y: nextY },
      ...(mergedConfig ? { config: mergedConfig } : {}),
    };

    setNodes((prev) => [...prev, newNode]);
    selectNode(newNodeId);
    setLastDrop({ x: nextX, y: nextY });
    ensureNodeVisible(newNode);
    toast(`Node added: ${payload.title}`, { variant: 'success' });
  }, [isPathLocked, viewportRef, canvasRef, view, setNodes, selectNode, setLastDrop, ensureNodeVisible, toast, notifyLocked]);

  // ---------------------------------------------------------------------------
  // Lifecycle Effects
  // ---------------------------------------------------------------------------

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === 'c') {
        if (isTypingTarget(event.target)) return;
        event.preventDefault();
        void handleCopySelection();
        return;
      }
      if (modifier && event.key.toLowerCase() === 'v') {
        if (isTypingTarget(event.target)) return;
        event.preventDefault();
        void handlePasteSelection();
        return;
      }
      if (event.key === 'Escape') {
        setMarqueeSelection(null);
        endConnection();
        selectEdge(null);
      }
      if (event.key === 'Backspace' || event.key === 'Delete') {
        if (isTypingTarget(event.target)) return;
        if (selectedEdgeId) {
          event.preventDefault();
          handleRemoveEdge(selectedEdgeId);
        } else if (selectedNodeId) {
          event.preventDefault();
          handleDeleteSelectedNode();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    endConnection,
    handleCopySelection,
    handleDeleteSelectedNode,
    handlePasteSelection,
    handleRemoveEdge,
    selectedEdgeId,
    selectedNodeId,
    selectEdge,
  ]);

  // Global pointer listeners for clearing state
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-port]')) return;
      if (target?.closest('path')) return;
      if (target?.closest('[data-edge-panel]')) return;
      
      endConnection();
      selectEdge(null);
    };
    const handlePointerUp = () => {
      setMarqueeSelection(null);
      endConnection();
    };
    
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [endConnection, selectEdge]);

  // Cleanup RAF
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  return {
    // Refs
    viewportRef,
    canvasRef,
    // State
    view,
    panState,
    dragState,
    connecting,
    connectingPos,
    selectionMarqueeRect,
    lastDrop,
    edgePaths,
    // Handlers
    handlePointerDownNode,
    handlePointerMoveNode,
    handlePointerUpNode,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleRemoveEdge,
    handleDisconnectPort,
    handleStartConnection,
    handleCompleteConnection,
    handleReconnectInput,
    handleDeleteSelectedNode,
    handleSelectNode,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleCopySelection,
    handlePasteSelection,
    ConfirmationModal,
    // Actions
    zoomTo,
    fitToNodes,
    resetView,
    ensureNodeVisible,
    pruneRuntimeInputs: pruneRuntimeInputsInternal,
  };
}
