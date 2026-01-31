"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AiNode, Edge, NodeDefinition } from "@/features/ai-paths/lib";
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
} from "@/features/ai-paths/lib";

type ToastFn = (message: string, options?: { variant?: string }) => void;

type UseAiPathsCanvasInteractionsArgs = {
  nodes: AiNode[];
  setNodes: React.Dispatch<React.SetStateAction<AiNode[]>>;
  edges: Edge[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  selectedNodeId: string | null;
  setSelectedNodeId: (value: string | null) => void;
  clearRuntimeInputsForEdges: (removed: Edge[], remaining: Edge[]) => void;
  reportAiPathsError: (error: unknown, context: Record<string, unknown>, fallbackMessage?: string) => void;
  toast: ToastFn;
};

type ConnectingState = {
  fromNodeId: string;
  fromPort: string;
  start: { x: number; y: number };
};

export function useAiPathsCanvasInteractions({
  nodes,
  setNodes,
  edges,
  setEdges,
  selectedNodeId,
  setSelectedNodeId,
  clearRuntimeInputsForEdges,
  reportAiPathsError,
  toast,
}: UseAiPathsCanvasInteractionsArgs) {
  // Initial view centered on the middle of the canvas where nodes are placed
  const [view, setView] = useState({ x: -600, y: -320, scale: 1 });
  const [connecting, setConnecting] = useState<ConnectingState | null>(null);
  const [connectingPos, setConnectingPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [lastDrop, setLastDrop] = useState<{ x: number; y: number } | null>(null);
  const [dragState, setDragState] = useState<{
    nodeId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [panState, setPanState] = useState<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const pendingDragRef = useRef<{ nodeId: string; x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastDropTimerRef = useRef<number | null>(null);

  useEffect((): void | (() => void) => {
    if (!lastDrop) return;
    if (lastDropTimerRef.current) {
      window.clearTimeout(lastDropTimerRef.current);
    }
    lastDropTimerRef.current = window.setTimeout((): void => {
      setLastDrop(null);
      lastDropTimerRef.current = null;
    }, 1600);
    return (): void => {
      if (lastDropTimerRef.current) {
        window.clearTimeout(lastDropTimerRef.current);
        lastDropTimerRef.current = null;
      }
    };
  }, [lastDrop]);

  // Cleanup RAF on unmount
  useEffect((): () => void => {
    return (): void => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  useEffect((): void | (() => void) => {
    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-port]")) return;
      if (target?.closest("path")) return;
      if (target?.closest("[data-edge-panel]")) return;
      setConnecting(null);
      setConnectingPos(null);
      setSelectedEdgeId(null);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return (): void => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect((): void | (() => void) => {
    const handlePointerUp = (): void => {
      setConnecting(null);
      setConnectingPos(null);
    };
    window.addEventListener("pointerup", handlePointerUp);
    return (): void => window.removeEventListener("pointerup", handlePointerUp);
  }, []);

  const handleRemoveEdge = useCallback(
    (edgeId: string): void => {
      setEdges((prev: Edge[]): Edge[] => {
        const target = prev.find((edge: Edge): boolean => edge.id === edgeId) ?? null;
        if (!target) return prev;
        const remaining = prev.filter((edge: Edge): boolean => edge.id !== edgeId);
        clearRuntimeInputsForEdges([target], remaining);
        return remaining;
      });
      if (selectedEdgeId === edgeId) {
        setSelectedEdgeId(null);
      }
    },
    [clearRuntimeInputsForEdges, selectedEdgeId, setEdges]
  );

  const handleDisconnectPort = useCallback(
    (direction: "input" | "output", nodeId: string, port: string): void => {
      setEdges((prev: Edge[]): Edge[] => {
        const shouldRemove = (edge: Edge): boolean =>
          direction === "input"
            ? edge.to === nodeId && edge.toPort === port
            : edge.from === nodeId && edge.fromPort === port;
        const removed = prev.filter((edge: Edge): boolean => shouldRemove(edge));
        const remaining = prev.filter((edge: Edge): boolean => !shouldRemove(edge));
        if (selectedEdgeId) {
          const selectedEdge = prev.find((edge: Edge) => edge.id === selectedEdgeId);
          if (selectedEdge && shouldRemove(selectedEdge)) {
            setSelectedEdgeId(null);
          }
        }
        clearRuntimeInputsForEdges(removed, remaining);
        return remaining;
      });
    },
    [clearRuntimeInputsForEdges, selectedEdgeId, setEdges]
  );

  const isTypingTarget = (target: EventTarget | null): boolean => {
    const element = target as HTMLElement | null;
    if (!element) return false;
    if (element.isContentEditable) return true;
    const tag = element.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    return Boolean(element.closest("input, textarea, select, [contenteditable=\"true\"]"));
  };

  const handleDeleteSelectedNode = useCallback((): void => {
    if (!selectedNodeId) return;
    const targetNode = nodes.find((node: AiNode): boolean => node.id === selectedNodeId);
    const label = targetNode?.title || "this node";
    const confirmed = window.confirm(`Remove ${label}? This will delete connected wires.`);
    if (!confirmed) return;
    setNodes((prev: AiNode[]): AiNode[] => prev.filter((node: AiNode): boolean => node.id !== selectedNodeId));
    setEdges((prev: Edge[]): Edge[] => {
      const removed = prev.filter(
        (edge: Edge): boolean => edge.from === selectedNodeId || edge.to === selectedNodeId
      );
      const remaining = prev.filter(
        (edge: Edge): boolean => edge.from !== selectedNodeId && edge.to !== selectedNodeId
      );
      clearRuntimeInputsForEdges(removed, remaining);
      return remaining;
    });
    setSelectedNodeId(null);
  }, [nodes, selectedNodeId, clearRuntimeInputsForEdges, setEdges, setNodes, setSelectedNodeId]);

  useEffect((): void | (() => void) => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setConnecting(null);
        setConnectingPos(null);
        setSelectedEdgeId(null);
      }
      if (event.key === "Backspace" || event.key === "Delete") {
        if (isTypingTarget(event.target)) return;
        if (selectedEdgeId) {
          event.preventDefault();
          handleRemoveEdge(selectedEdgeId);
          return;
        }
        if (selectedNodeId) {
          event.preventDefault();
          handleDeleteSelectedNode();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return (): void => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEdgeId, selectedNodeId, handleRemoveEdge, handleDeleteSelectedNode]);

  useEffect((): void => {
    setEdges((prev: Edge[]): Edge[] => sanitizeEdges(nodes, prev));
  }, [nodes, setEdges]);

  const setViewClamped = (next: { x: number; y: number; scale: number }): void => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    const clampedScale = clampScale(next.scale);
    const clamped = clampTranslate(next.x, next.y, clampedScale, viewport);
    setView({ x: clamped.x, y: clamped.y, scale: clampedScale });
  };

  const zoomTo = (targetScale: number): void => {
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
    setView({ x: clamped.x, y: clamped.y, scale: nextScale });
  };

  const fitToNodesWith = (items: AiNode[]): void => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport || items.length === 0) {
      resetView();
      return;
    }
    const padding = 120;
    const bounds = items.reduce(
      (acc: { minX: number; minY: number; maxX: number; maxY: number }, node: AiNode) => {
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
    setView({ x: clamped.x, y: clamped.y, scale: nextScale });
  };

  const fitToNodes = (): void => {
    fitToNodesWith(nodes);
  };

  const resetView = (): void => {
    setViewClamped({ x: VIEW_MARGIN, y: VIEW_MARGIN, scale: 1 });
  };

  const ensureNodeVisible = (node: AiNode): void => {
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
    setView({ x: clamped.x, y: clamped.y, scale: view.scale });
  };

  const getPortPosition = useCallback((
    node: AiNode,
    portName: string | undefined,
    side: "input" | "output"
  ): { x: number; y: number } => {
    const ports = side === "input" ? node.inputs : node.outputs;
    const index = portName ? ports.indexOf(portName) : -1;
    const safeIndex = index >= 0 ? index : Math.max(0, Math.floor(ports.length / 2));
    const x = node.position.x + (side === "output" ? NODE_WIDTH : 0);
    const y = node.position.y + getPortOffsetY(safeIndex, ports.length);
    return { x, y };
  }, []);

  const handleReconnectInput = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, nodeId: string, port: string): void => {
      if (connecting) return;
      let edgeToMove: Edge | null = null;
      for (let index = edges.length - 1; index >= 0; index -= 1) {
        const edge = edges[index];
        if (edge && edge.to === nodeId && edge.toPort === port) {
          edgeToMove = edge;
          break;
        }
      }
      if (!edgeToMove || !edgeToMove.from || !edgeToMove.fromPort) return;
      const fromNode = nodes.find((node: AiNode): boolean => node.id === edgeToMove.from);
      if (!fromNode) return;
      const start = getPortPosition(fromNode, edgeToMove.fromPort, "output");
      const viewport = viewportRef.current?.getBoundingClientRect();
      const nextPos = viewport
        ? {
            x: (event.clientX - viewport.left - view.x) / view.scale,
            y: (event.clientY - viewport.top - view.y) / view.scale,
          }
        : start;
      setEdges((prev: Edge[]): Edge[] => {
        const remaining = prev.filter(
          (edge: Edge): boolean => edge.id !== edgeToMove.id
        );
        clearRuntimeInputsForEdges([edgeToMove], remaining);
        return remaining;
      });
      if (selectedEdgeId === edgeToMove.id) {
        setSelectedEdgeId(null);
      }
      setConnecting({ fromNodeId: edgeToMove.from, fromPort: edgeToMove.fromPort, start });
      setConnectingPos(nextPos);
    },
    [connecting, edges, nodes, selectedEdgeId, view, getPortPosition, clearRuntimeInputsForEdges, setEdges]
  );

  // Create a stable key based only on edge-relevant node data (position, ports)
  // This prevents edge recalculation when only config/title changes occur
  const nodePositionsKey = useMemo(
    (): string =>
      nodes
        .map(
          (n: AiNode): string =>
            `${n.id}:${n.position.x}:${n.position.y}:${n.inputs.length}:${n.outputs.length}`
        )
        .join("|"),
    [nodes]
  );

  const edgePaths = useMemo((): { id: string; path: string; label?: string; arrow?: { x: number; y: number; angle: number } }[] => {
    const nodeMap = new Map(nodes.map((node: AiNode): [string, AiNode] => [node.id, node]));
    const midpoint = (a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number } => ({
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    });
    return edges
      .map((edge: Edge): { id: string; path: string; label?: string; arrow?: { x: number; y: number; angle: number } } | null => {
        const from = nodeMap.get(edge.from);
        const to = nodeMap.get(edge.to);
        if (!from || !to) return null;
        const fromPort =
          edge.fromPort ?? (from.outputs.length > 0 ? from.outputs[0] : undefined);
        const toPort = edge.toPort ?? (to.inputs.length > 0 ? to.inputs[0] : undefined);
        const fromPos = getPortPosition(from, fromPort, "output");
        const toPos = getPortPosition(to, toPort, "input");
        const p0 = { x: fromPos.x, y: fromPos.y };
        const p3 = { x: toPos.x, y: toPos.y };
        const midX = p0.x + (p3.x - p0.x) * 0.5;
        const p1 = { x: midX, y: p0.y };
        const p2 = { x: midX, y: p3.y };
        const q0 = midpoint(p0, p1);
        const q1 = midpoint(p1, p2);
        const q2 = midpoint(p2, p3);
        const r0 = midpoint(q0, q1);
        const r1 = midpoint(q1, q2);
        const s = midpoint(r0, r1);
        const path = [
          `M ${p0.x} ${p0.y}`,
          `C ${q0.x} ${q0.y}, ${r0.x} ${r0.y}, ${s.x} ${s.y}`,
          `C ${r1.x} ${r1.y}, ${q2.x} ${q2.y}, ${p3.x} ${p3.y}`,
        ].join(" ");
        let dx = r1.x - r0.x;
        let dy = r1.y - r0.y;
        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
          dx = p3.x - p0.x;
          dy = p3.y - p0.y;
        }
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        return {
          id: edge.id,
          path,
          label: edge.label,
          arrow: { x: s.x, y: s.y, angle },
        };
      })
      .filter(Boolean) as { id: string; path: string; label?: string | undefined; arrow?: { x: number; y: number; angle: number } | undefined }[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edges, nodePositionsKey]);

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    nodeId: string
  ): void => {
    event.stopPropagation();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (!viewport) return;
    const node = nodes.find((item: AiNode): boolean => item.id === nodeId);
    if (!node) return;
    const canvasX = (event.clientX - viewport.left - view.x) / view.scale;
    const canvasY = (event.clientY - viewport.top - view.y) / view.scale;
    setDragState({
      nodeId,
      offsetX: canvasX - node.position.x,
      offsetY: canvasY - node.position.y,
    });
  };

  const handlePointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
    nodeId: string
  ): void => {
    if (!dragState || dragState.nodeId !== nodeId) return;
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (!viewport) return;
    const nextX = Math.min(
      Math.max((event.clientX - viewport.left - view.x) / view.scale - dragState.offsetX, 16),
      CANVAS_WIDTH - NODE_WIDTH - 16
    );
    const nextY = Math.min(
      Math.max((event.clientY - viewport.left - view.y) / view.scale - dragState.offsetY, 16),
      CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16
    );

    // RAF throttling: batch position updates to animation frames
    pendingDragRef.current = { nodeId, x: nextX, y: nextY };
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame((): void => {
        if (pendingDragRef.current) {
          const { nodeId: id, x, y } = pendingDragRef.current;
          setNodes((prev: AiNode[]): AiNode[] =>
            prev.map((node: AiNode): AiNode =>
              node.id === id ? { ...node, position: { x, y } } : node
            )
          );
        }
        rafIdRef.current = null;
      });
    }
  };

  const handlePointerUp = (
    event: React.PointerEvent<HTMLDivElement>,
    nodeId: string
  ): void => {
    if (dragState?.nodeId !== nodeId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);

    // Flush any pending RAF drag update immediately on pointer up
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (pendingDragRef.current) {
      const { nodeId: id, x, y } = pendingDragRef.current;
      setNodes((prev: AiNode[]): AiNode[] =>
        prev.map((node: AiNode): AiNode =>
          node.id === id ? { ...node, position: { x, y } } : node
        )
      );
      pendingDragRef.current = null;
    }

    setDragState(null);
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    node: NodeDefinition
  ): void => {
    event.dataTransfer.effectAllowed = "copy";
    const payload = JSON.stringify(node);
    event.dataTransfer.setData("application/x-ai-node", payload);
    event.dataTransfer.setData("text/plain", payload);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (!viewport) return;
    const canvasRect = canvasRef.current?.getBoundingClientRect() ?? null;
    const data =
      event.dataTransfer.getData("application/x-ai-node") ||
      event.dataTransfer.getData("text/plain");
    if (!data) return;
    let payload: NodeDefinition | null = null;
    try {
      payload = JSON.parse(data) as NodeDefinition;
    } catch (error) {
      reportAiPathsError(error, { action: "dropNode", dataPreview: data.slice(0, 120) });
      toast("Failed to add node. Drag again.", { variant: "error" });
      return;
    }
    if (!payload) return;
    const localX = canvasRect
      ? (event.clientX - canvasRect.left) / view.scale
      : (event.clientX - viewport.left - view.x) / view.scale;
    const localY = canvasRect
      ? (event.clientY - canvasRect.top) / view.scale
      : (event.clientY - viewport.top - view.y) / view.scale;
    const nextX = Math.min(
      Math.max(localX - NODE_WIDTH / 2, 16),
      CANVAS_WIDTH - NODE_WIDTH - 16
    );
    const nextY = Math.min(
      Math.max(localY - NODE_MIN_HEIGHT / 2, 16),
      CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16
    );
    const defaultConfig = getDefaultConfigForType(payload.type, payload.outputs, payload.inputs);
    const mergedConfig = payload.config
      ? {
          ...(defaultConfig ?? {}),
          ...payload.config,
        }
      : defaultConfig;
    const newNode: AiNode = {
      ...payload,
      id: `node-${Math.random().toString(36).slice(2, 8)}`,
      position: { x: nextX, y: nextY },
      ...(mergedConfig ? { config: mergedConfig } : {}),
    };
    setSelectedNodeId(newNode.id);
    setNodes((prev: AiNode[]): AiNode[] => [...prev, newNode]);
    ensureNodeVisible(newNode);
    setLastDrop({ x: nextX, y: nextY });
    toast(`Node added: ${payload.title}`, { variant: "success" });
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleStartConnection = (
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string
  ): void => {
    event.stopPropagation();
    const start = getPortPosition(node, port, "output");
    setConnecting({ fromNodeId: node.id, fromPort: port, start });
    setConnectingPos(start);
  };

  const handleCompleteConnection = (
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string
  ): void => {
    event.stopPropagation();
    if (!connecting) return;
    if (connecting.fromNodeId === node.id && connecting.fromPort === port) {
      setConnecting(null);
      setConnectingPos(null);
      return;
    }

    const fromNode = nodes.find((n: AiNode): boolean => n.id === connecting.fromNodeId);
    if (!fromNode) {
      setConnecting(null);
      setConnectingPos(null);
      return;
    }

    const validation = validateConnection(
      fromNode,
      node,
      connecting.fromPort,
      port
    );

    if (!validation.valid) {
      toast(validation.message ?? "Invalid connection.", { variant: "error" });
      setConnecting(null);
      setConnectingPos(null);
      return;
    }

    setEdges((prev: Edge[]): Edge[] => [
      ...prev,
      {
        id: `edge-${Math.random().toString(36).slice(2, 8)}`,
        from: connecting.fromNodeId,
        to: node.id,
        fromPort: connecting.fromPort,
        toPort: port,
      },
    ]);
    toast("Connection created.", { variant: "success" });
    setConnecting(null);
    setConnectingPos(null);
  };

  const handlePanStart = (event: React.PointerEvent<HTMLDivElement>): void => {
    const canvasEl = canvasRef.current;
    const targetEl = event.target as Element | null;
    if (targetEl?.closest("path")) return;
    if (
      event.target !== event.currentTarget &&
      event.target !== canvasEl &&
      targetEl?.tagName?.toLowerCase() !== "svg"
    ) {
      return;
    }
    if (connecting) {
      setConnecting(null);
      setConnectingPos(null);
      return;
    }
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    setPanState({
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y,
    });
  };

  const handlePanMove = (event: React.PointerEvent<HTMLDivElement>): void => {
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
    setView({ x: clamped.x, y: clamped.y, scale: view.scale });
  };

  const handlePanEnd = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (panState) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      setPanState(null);
    }
    if (connecting) {
      setConnecting(null);
      setConnectingPos(null);
    }
  };

  const handleSelectEdge = (edgeId: string | null): void => {
    setSelectedEdgeId(edgeId);
    if (edgeId) {
      setSelectedNodeId(null);
    }
  };

  const handleSelectNode = (nodeId: string): void => {
    setSelectedEdgeId(null);
    setSelectedNodeId(nodeId);
  };

  const getCanvasCenterPosition = (): { x: number; y: number } => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport) return { x: VIEW_MARGIN, y: VIEW_MARGIN };
    const centerX = (viewport.width / 2 - view.x) / view.scale;
    const centerY = (viewport.height / 2 - view.y) / view.scale;
    const nextX = Math.min(
      Math.max(centerX - NODE_WIDTH / 2, 16),
      CANVAS_WIDTH - NODE_WIDTH - 16
    );
    const nextY = Math.min(
      Math.max(centerY - NODE_MIN_HEIGHT / 2, 16),
      CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16
    );
    return { x: nextX, y: nextY };
  };

  const connectingFromNode = useMemo(
    (): AiNode | null => (connecting ? nodes.find((node: AiNode): boolean => node.id === connecting.fromNodeId) ?? null : null),
    [connecting, nodes]
  );

  return {
    viewportRef,
    canvasRef,
    view,
    panState,
    dragState,
    connecting,
    connectingPos,
    lastDrop,
    selectedEdgeId,
    edgePaths,
    connectingFromNode,
    ensureNodeVisible,
    getCanvasCenterPosition,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDragStart,
    handleDrop,
    handleDragOver,
    handleStartConnection,
    handleCompleteConnection,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleReconnectInput,
    handleRemoveEdge,
    handleDisconnectPort,
    handleDeleteSelectedNode,
    handleSelectEdge,
    handleSelectNode,
    zoomTo,
    fitToNodes,
    resetView,
  };
}

export type AiPathsCanvasInteractions = ReturnType<typeof useAiPathsCanvasInteractions>;
