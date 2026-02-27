import type { AiNode, Edge } from '@/shared/lib/ai-paths';

export type MarqueeMode = 'replace' | 'add' | 'subtract';

export type MarqueeSelectionState = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  mode: MarqueeMode;
  baseNodeIds: string[];
};

export type SubgraphClipboardPayload = {
  version: 1;
  sourcePathId: string | null;
  capturedAt: string;
  nodes: AiNode[];
  edges: Edge[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
};

export type TouchPointSample = {
  x: number;
  y: number;
  time: number;
};

export type TouchGestureState =
  | {
    mode: 'pinch';
    pointerIds: [number, number];
    startDistance: number;
    startScale: number;
    anchorCanvas: { x: number; y: number };
  }
  | {
    mode: 'pan';
    pointerId: number;
    recentSamples: TouchPointSample[];
  };

export type TouchLongPressSelectionState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startedAt: number;
  indicatorViewportX: number;
  indicatorViewportY: number;
  mode: MarqueeMode;
  baseNodeIds: string[];
  timerId: number | null;
};

export type TouchLongPressIndicatorState = {
  x: number;
  y: number;
  progress: number;
  phase: 'pending' | 'activated';
};

export interface HandleSelectNodeOptions {
  toggle?: boolean;
}

export const SUBGRAPH_CLIPBOARD_VERSION = 1 as const;
export const SUBGRAPH_CLIPBOARD_STORAGE_KEY = 'ai-paths:canvas-subgraph-clipboard:v1';
export const PASTE_OFFSET_STEP = 28;
export const ZOOM_ANIMATION_DURATION_MS = 160;
export const WHEEL_ZOOM_SENSITIVITY = 0.0016;
export const WHEEL_ZOOM_EASING = 0.26;
export const WHEEL_ZOOM_STOP_THRESHOLD = 0.0009;
export const TOUCH_PINCH_MIN_DISTANCE = 8;
export const TOUCH_PAN_INERTIA_SAMPLE_WINDOW_MS = 140;
export const TOUCH_PAN_INERTIA_MIN_SPEED = 0.045;
export const TOUCH_PAN_INERTIA_STOP_SPEED = 0.015;
export const TOUCH_PAN_INERTIA_FRICTION_PER_FRAME = 0.9;
export const TOUCH_LONG_PRESS_SELECTION_DELAY_MS = 280;
export const TOUCH_LONG_PRESS_SELECTION_MOVE_TOLERANCE_PX = 10;
export const TOUCH_LONG_PRESS_ACTIVATED_VISIBLE_MS = 200;
export const TOUCH_LONG_PRESS_HAPTIC_MS = 12;

export const cloneValue = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const parseSubgraphClipboardPayload = (
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

export const getMarqueeRect = (state: MarqueeSelectionState): {
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

export const getPointerCaptureTarget = (
  event: React.PointerEvent<Element>
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

export const setPointerCaptureSafe = (
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

export const releasePointerCaptureSafe = (
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
