import { useCallback, useRef } from 'react';
import type { AiNode, RuntimeState, Edge } from '@/shared/lib/ai-paths';
import { 
  getMarqueeRect, 
  setPointerCaptureSafe 
} from '../useCanvasInteractions.helpers';
import type { MarqueeMode, MarqueeSelectionState } from '../useCanvasInteractions.helpers';

export function useCanvasStateHandlers(args: {
  isPathLocked: boolean;
  toast: any;
  viewportRef: React.RefObject<HTMLDivElement>;
  nodes: AiNode[];
  edges: Edge[];
  setNodes: (nodes: AiNode[]) => void;
  setRuntimeState: (state: (prev: RuntimeState) => RuntimeState) => void;
  selectionToolMode: MarqueeMode;
  selectionScopeMode: 'replace' | 'add' | 'toggle';
  setNodeSelection: (ids: string[]) => void;
  toggleNodeSelection: (id: string) => void;
  startPan: (x: number, y: number) => void;
}) {
  const { toast, viewportRef, startPan } = args;

  const lastPointerCanvasPosRef = useRef({ x: 0, y: 0 });
  const hasCanvasKeyboardFocusRef = useRef(false);

  const notifyLocked = useCallback((): void => {
    toast('This path is locked. Unlock it in Path Settings to make changes.', {
      variant: 'info',
    });
  }, [toast]);

  const resolveViewportPointFromClient = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return null;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    [viewportRef]
  );

  const updateLastPointerCanvasPosFromClient = useCallback(
    (clientX: number, clientY: number): void => {
      const point = resolveViewportPointFromClient(clientX, clientY);
      if (point) {
        lastPointerCanvasPosRef.current = point;
      }
    },
    [resolveViewportPointFromClient]
  );

  const pruneRuntimeInputsInternal = useCallback(
    (state: RuntimeState, removedEdges: Edge[], remainingEdges: Edge[]): RuntimeState => {
      if (removedEdges.length === 0) return state;
      const remainingTargets = new Set<string>();
      remainingEdges.forEach((edge: Edge) => {
        if (!edge.to || !edge.toPort) return;
        remainingTargets.add(`${edge.to}:${edge.toPort}`);
      });

      const existingInputs = state.inputs ?? {};
      let nextInputs = existingInputs;
      let changed = false;

      removedEdges.forEach((edge: Edge) => {
        if (!edge.to || !edge.toPort) return;
        const targetKey = `${edge.to}:${edge.toPort}`;
        if (remainingTargets.has(targetKey)) return;
        const nodeInputs = nextInputs?.[edge.to] ?? {};
        if (!(edge.toPort in nodeInputs)) return;
        if (!changed) {
          nextInputs = { ...existingInputs };
          changed = true;
        }
        const nextNodeInputs = { ...nodeInputs };
        delete nextNodeInputs[edge.toPort];
        if (Object.keys(nextNodeInputs).length === 0) {
          delete nextInputs[edge.to];
        } else {
          nextInputs[edge.to] = nextNodeInputs;
        }
      });

      if (!changed) return state;
      return { ...state, inputs: nextInputs };
    },
    []
  );

  const resolveActiveNodeSelectionIds = useCallback((): string[] => {
    return args.nodes
      .filter((node: AiNode): boolean => args.nodes.some(n => n.id === node.id)) // Placeholder for selection logic
      .map((node: AiNode): string => node.id);
  }, [args.nodes]);

  const resolveNodesWithinMarquee = useCallback(
    (marquee: MarqueeSelectionState): string[] => {
      const rect = getMarqueeRect(marquee);
      return args.nodes
        .filter((node: AiNode): boolean => {
          const nodeWidth = 260; // NODE_WIDTH
          const nodeHeight = 184; // NODE_MIN_HEIGHT
          const nodeRight = node.position.x + nodeWidth;
          const nodeBottom = node.position.y + nodeHeight;
          return (
            node.position.x < rect.left + rect.width &&
            nodeRight > rect.left &&
            node.position.y < rect.top + rect.height &&
            nodeBottom > rect.top
          );
        })
        .map((node: AiNode): string => node.id);
    },
    [args.nodes]
  );

  const resolveNodeSelectionByScope = useCallback(
    (currentSelection: string[], marqueeNodes: string[]): string[] => {
      if (args.selectionScopeMode === 'add') {
        return Array.from(new Set([...currentSelection, ...marqueeNodes]));
      }
      if (args.selectionScopeMode === 'toggle') {
        const next = new Set(currentSelection);
        marqueeNodes.forEach((id) => {
          if (next.has(id)) next.delete(id);
          else next.add(id);
        });
        return Array.from(next);
      }
      return marqueeNodes;
    },
    [args.selectionScopeMode]
  );

  const handlePanStart = useCallback(
    (event: React.MouseEvent | React.PointerEvent | React.TouchEvent): void => {
      const isTouchEvent = 'touches' in event;
      const clientX = isTouchEvent ? event.touches[0]?.clientX : (event as React.MouseEvent).clientX;
      const clientY = isTouchEvent ? event.touches[0]?.clientY : (event as React.MouseEvent).clientY;

      if (clientX === undefined || clientY === undefined) return;

      const viewportPoint = resolveViewportPointFromClient(clientX, clientY);
      if (!viewportPoint) return;

      if (!isTouchEvent) {
        setPointerCaptureSafe(args.viewportRef.current, (event as React.PointerEvent).pointerId);
      }

      startPan(viewportPoint.x, viewportPoint.y);
    },
    [args.viewportRef, resolveViewportPointFromClient, startPan]
  );

  return {
    notifyLocked,
    resolveViewportPointFromClient,
    updateLastPointerCanvasPosFromClient,
    pruneRuntimeInputsInternal,
    resolveActiveNodeSelectionIds,
    resolveNodesWithinMarquee,
    resolveNodeSelectionByScope,
    handlePanStart,
    lastPointerCanvasPosRef,
    hasCanvasKeyboardFocusRef,
  };
}
