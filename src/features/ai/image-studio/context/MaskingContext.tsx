'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { type VectorShape, type VectorToolMode } from '@/shared/lib/vector-drawing';
import { api } from '@/shared/lib/api-client';
import { useToast } from '@/shared/ui';

import { useProjectsState } from './ProjectsContext';
import { useSlotsState } from './SlotsContext';
import { sanitizeStudioProjectId } from '@/shared/lib/ai/image-studio/utils/project-session';

// ── Types ────────────────────────────────────────────────────────────────────

export type MaskGenerationMode = 'ai-polygon' | 'ai-bbox' | 'threshold' | 'edges';

type PixelBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type MaskDetectionSettings = {
  thresholdSensitivity: number;
  edgeSensitivity: number;
};

const DEFAULT_MASK_DETECTION_SETTINGS: MaskDetectionSettings = {
  thresholdSensitivity: 55,
  edgeSensitivity: 55,
};

const IMAGE_STUDIO_MASK_STATE_LOCAL_KEY_PREFIX = 'image_studio_mask_state_';

type MaskingProjectLocalState = {
  version: 1;
  projectId: string;
  savedAt: string;
  tool: VectorToolMode;
  maskShapes: VectorShape[];
  activeMaskId: string | null;
  selectedPointIndex: number | null;
  maskInvert: boolean;
  maskFeather: number;
  brushRadius: number;
  maskGenMode: MaskGenerationMode;
  slotMaskDetectionSettings: Record<string, MaskDetectionSettings>;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const clampInt = (value: unknown, min: number, max: number, fallback: number): number => {
  const numeric =
    typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.max(min, Math.min(max, numeric));
};

const normalizeTool = (value: unknown): VectorToolMode => {
  if (
    value === 'select' ||
    value === 'polygon' ||
    value === 'lasso' ||
    value === 'rect' ||
    value === 'ellipse' ||
    value === 'brush'
  ) {
    return value;
  }
  return 'select';
};

const normalizeMaskGenMode = (value: unknown): MaskGenerationMode => {
  if (value === 'ai-polygon' || value === 'ai-bbox' || value === 'threshold' || value === 'edges') {
    return value;
  }
  return 'ai-polygon';
};

const normalizeMaskDetectionSettingsMap = (
  value: unknown
): Record<string, MaskDetectionSettings> => {
  const record = asRecord(value);
  if (!record) return {};

  const next: Record<string, MaskDetectionSettings> = {};
  Object.entries(record).forEach(([key, candidate]) => {
    const normalizedKey = key.trim();
    if (!normalizedKey) return;
    const entry = asRecord(candidate);
    if (!entry) return;
    next[normalizedKey] = {
      thresholdSensitivity: clampInt(
        entry['thresholdSensitivity'],
        0,
        100,
        DEFAULT_MASK_DETECTION_SETTINGS.thresholdSensitivity
      ),
      edgeSensitivity: clampInt(
        entry['edgeSensitivity'],
        0,
        100,
        DEFAULT_MASK_DETECTION_SETTINGS.edgeSensitivity
      ),
    };
  });
  return next;
};

const normalizeMaskShape = (value: unknown, index: number): VectorShape | null => {
  const record = asRecord(value);
  if (!record) return null;

  const type = record['type'];
  if (
    type !== 'polygon' &&
    type !== 'lasso' &&
    type !== 'rect' &&
    type !== 'ellipse' &&
    type !== 'brush'
  ) {
    return null;
  }

  const pointsRaw = Array.isArray(record['points']) ? record['points'] : [];
  const points = pointsRaw
    .map((point) => {
      const pointRecord = asRecord(point);
      if (!pointRecord) return null;
      const x =
        typeof pointRecord['x'] === 'number' && Number.isFinite(pointRecord['x'])
          ? pointRecord['x']
          : null;
      const y =
        typeof pointRecord['y'] === 'number' && Number.isFinite(pointRecord['y'])
          ? pointRecord['y']
          : null;
      if (x === null || y === null) return null;
      return { x, y };
    })
    .filter((point): point is { x: number; y: number } => Boolean(point));

  if (points.length === 0) return null;

  const normalizedId = asTrimmedString(record['id']) ?? `shape_${index + 1}`;
  const normalizedName = asTrimmedString(record['name']) ?? `Shape ${index + 1}`;
  const roleRaw = asTrimmedString(record['role']);
  const role =
    roleRaw === 'product' ||
    roleRaw === 'shadow' ||
    roleRaw === 'background' ||
    roleRaw === 'custom'
      ? roleRaw
      : undefined;
  const label = asTrimmedString(record['label']) ?? undefined;
  const color = asTrimmedString(record['color']) ?? undefined;

  return {
    id: normalizedId,
    name: normalizedName,
    type,
    points,
    style: (record['style'] as Record<string, unknown>) ?? {},
    closed: typeof record['closed'] === 'boolean' ? record['closed'] : true,
    visible: typeof record['visible'] === 'boolean' ? record['visible'] : true,
    ...(label ? { label } : {}),
    role: role || 'custom',
    ...(color ? { color } : {}),
  };
};

const normalizeMaskShapes = (value: unknown): VectorShape[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index) => normalizeMaskShape(entry, index))
    .filter((entry): entry is VectorShape => Boolean(entry));
};

const getMaskStateLocalKey = (projectId: string): string | null => {
  const normalized = projectId.trim();
  if (!normalized) return null;
  return `${IMAGE_STUDIO_MASK_STATE_LOCAL_KEY_PREFIX}${sanitizeStudioProjectId(normalized)}`;
};

const parseMaskingProjectLocalState = (
  raw: string | null,
  expectedProjectId: string
): MaskingProjectLocalState | null => {
  if (!raw?.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const record = asRecord(parsed);
  if (!record) return null;

  const storedProjectId = asTrimmedString(record['projectId']) ?? '';
  const expected = expectedProjectId.trim();
  if (!storedProjectId || !expected) return null;
  if (
    storedProjectId !== expected &&
    sanitizeStudioProjectId(storedProjectId) !== sanitizeStudioProjectId(expected)
  ) {
    return null;
  }

  const selectedPointIndexRaw = record['selectedPointIndex'];
  const selectedPointIndex =
    typeof selectedPointIndexRaw === 'number' && Number.isFinite(selectedPointIndexRaw)
      ? Math.max(0, Math.floor(selectedPointIndexRaw))
      : null;

  return {
    version: 1,
    projectId: storedProjectId,
    savedAt: asTrimmedString(record['savedAt']) ?? '',
    tool: normalizeTool(record['tool']),
    maskShapes: normalizeMaskShapes(record['maskShapes']),
    activeMaskId: asTrimmedString(record['activeMaskId']),
    selectedPointIndex,
    maskInvert: Boolean(record['maskInvert']),
    maskFeather: clampInt(record['maskFeather'], 0, 100, 0),
    brushRadius: clampInt(record['brushRadius'], 1, 64, 8),
    maskGenMode: normalizeMaskGenMode(record['maskGenMode']),
    slotMaskDetectionSettings: normalizeMaskDetectionSettingsMap(
      record['slotMaskDetectionSettings']
    ),
  };
};

const loadMaskingProjectLocalState = (projectId: string): MaskingProjectLocalState | null => {
  if (typeof window === 'undefined') return null;
  const key = getMaskStateLocalKey(projectId);
  if (!key) return null;
  const raw = window.localStorage.getItem(key);
  return parseMaskingProjectLocalState(raw, projectId);
};

const saveMaskingProjectLocalState = (projectId: string, state: MaskingProjectLocalState): void => {
  if (typeof window === 'undefined') return;
  const key = getMaskStateLocalKey(projectId);
  if (!key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Best-effort local cache.
  }
};

// ── Mask Utilities ───────────────────────────────────────────────────────────

function extendBounds(bounds: PixelBounds | null, x: number, y: number): PixelBounds {
  if (!bounds) {
    return { minX: x, minY: y, maxX: x, maxY: y };
  }
  return {
    minX: Math.min(bounds.minX, x),
    minY: Math.min(bounds.minY, y),
    maxX: Math.max(bounds.maxX, x),
    maxY: Math.max(bounds.maxY, y),
  };
}

function getThresholdMaskBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  thresholdSensitivity: number
): PixelBounds | null {
  let bounds: PixelBounds | null = null;
  const normalized = Math.min(100, Math.max(0, thresholdSensitivity));
  const lumaCutoff = Math.round(252 - normalized * 1.2);
  const saturationCutoff = Math.round(18 - normalized * 0.16);

  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    const r = data[offset] ?? 0;
    const g = data[offset + 1] ?? 0;
    const b = data[offset + 2] ?? 0;
    const a = data[offset + 3] ?? 0;
    if (a < 8) continue;

    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const maxChannel = Math.max(r, g, b);
    const minChannel = Math.min(r, g, b);
    const saturation = maxChannel - minChannel;

    const isForeground = luma < lumaCutoff || saturation > saturationCutoff;
    if (!isForeground) continue;

    const x = index % width;
    const y = Math.floor(index / width);
    bounds = extendBounds(bounds, x, y);
  }

  return bounds;
}

function getEdgeMaskBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  edgeSensitivity: number
): PixelBounds | null {
  const grayscale = new Float32Array(width * height);
  const gAt = (index: number): number => grayscale[index] ?? 0;
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    const r = data[offset] ?? 0;
    const g = data[offset + 1] ?? 0;
    const b = data[offset + 2] ?? 0;
    const a = data[offset + 3] ?? 0;
    if (a < 8) {
      grayscale[index] = 255;
      continue;
    }
    grayscale[index] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  let bounds: PixelBounds | null = null;
  const normalized = Math.min(100, Math.max(0, edgeSensitivity));
  const edgeThreshold = Math.round(140 - normalized * 1.1);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x;
      const gx =
        -gAt(idx - width - 1) -
        2 * gAt(idx - 1) -
        gAt(idx + width - 1) +
        gAt(idx - width + 1) +
        2 * gAt(idx + 1) +
        gAt(idx + width + 1);
      const gy =
        gAt(idx - width - 1) +
        2 * gAt(idx - width) +
        gAt(idx - width + 1) -
        gAt(idx + width - 1) -
        2 * gAt(idx + width) -
        gAt(idx + width + 1);
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      if (magnitude < edgeThreshold) continue;
      bounds = extendBounds(bounds, x, y);
    }
  }

  return bounds;
}

function toExpandedRect(
  bounds: PixelBounds,
  width: number,
  height: number
): { x: number; y: number; w: number; h: number } {
  const contentWidth = Math.max(1, bounds.maxX - bounds.minX + 1);
  const contentHeight = Math.max(1, bounds.maxY - bounds.minY + 1);
  const padX = Math.max(2, Math.round(contentWidth * 0.03));
  const padY = Math.max(2, Math.round(contentHeight * 0.03));

  const x = Math.max(0, bounds.minX - padX);
  const y = Math.max(0, bounds.minY - padY);
  const maxX = Math.min(width - 1, bounds.maxX + padX);
  const maxY = Math.min(height - 1, bounds.maxY + padY);

  return {
    x,
    y,
    w: Math.max(1, maxX - x + 1),
    h: Math.max(1, maxY - y + 1),
  };
}

// ── State/Actions interfaces ─────────────────────────────────────────────────

export interface MaskingState {
  tool: VectorToolMode;
  maskShapes: VectorShape[];
  activeMaskId: string | null;
  selectedPointIndex: number | null;
  maskInvert: boolean;
  maskFeather: number;
  brushRadius: number;
  maskGenLoading: boolean;
  maskGenMode: MaskGenerationMode;
  maskThresholdSensitivity: number;
  maskEdgeSensitivity: number;
}

export interface MaskingActions {
  setTool: (t: VectorToolMode) => void;
  setMaskShapes: React.Dispatch<React.SetStateAction<VectorShape[]>>;
  setActiveMaskId: (id: string | null) => void;
  setSelectedPointIndex: (index: number | null) => void;
  setMaskInvert: (i: boolean) => void;
  setMaskFeather: (f: number) => void;
  setBrushRadius: (r: number) => void;
  setMaskGenMode: (m: MaskGenerationMode) => void;
  setMaskThresholdSensitivity: (value: number) => void;
  setMaskEdgeSensitivity: (value: number) => void;
  handleAiMaskGeneration: (mode?: MaskGenerationMode) => void;
}

// ── Contexts ─────────────────────────────────────────────────────────────────

const MaskingStateContext = createContext<MaskingState | null>(null);
const MaskingActionsContext = createContext<MaskingActions | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function MaskingProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const { projectId } = useProjectsState();
  const { workingSlot, selectedSlot } = useSlotsState();

  const [tool, setTool] = useState<VectorToolMode>('select');
  const [maskShapes, setMaskShapes] = useState<VectorShape[]>([]);
  const [activeMaskId, setActiveMaskId] = useState<string | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [maskInvert, setMaskInvert] = useState<boolean>(false);
  const [maskFeather, setMaskFeather] = useState<number>(0);
  const [brushRadius, setBrushRadius] = useState<number>(8);
  const [maskGenLoading, setMaskGenLoading] = useState<boolean>(false);
  const [maskGenMode, setMaskGenMode] = useState<MaskGenerationMode>('ai-polygon');
  const [slotMaskDetectionSettings, setSlotMaskDetectionSettings] = useState<
    Record<string, MaskDetectionSettings>
  >({});

  useEffect(() => {
    const normalizedProjectId = projectId.trim();
    if (!normalizedProjectId) {
      setTool('select');
      setMaskShapes([]);
      setActiveMaskId(null);
      setSelectedPointIndex(null);
      setMaskInvert(false);
      setMaskFeather(0);
      setBrushRadius(8);
      setMaskGenLoading(false);
      setMaskGenMode('ai-polygon');
      setSlotMaskDetectionSettings({});
      return;
    }

    const restored = loadMaskingProjectLocalState(normalizedProjectId);
    const restoredShapes = restored?.maskShapes ?? [];
    const restoredShapeIds = new Set(restoredShapes.map((shape) => shape.id));
    const restoredActiveMaskId =
      restored?.activeMaskId && restoredShapeIds.has(restored.activeMaskId)
        ? restored.activeMaskId
        : null;
    const restoredActiveShape = restoredActiveMaskId
      ? (restoredShapes.find((shape) => shape.id === restoredActiveMaskId) ?? null)
      : null;
    const restoredSelectedPointIndex =
      typeof restored?.selectedPointIndex === 'number' &&
      Number.isFinite(restored.selectedPointIndex) &&
      restored.selectedPointIndex >= 0 &&
      restoredActiveShape &&
      restored.selectedPointIndex < restoredActiveShape.points.length
        ? restored.selectedPointIndex
        : null;

    setTool(restored?.tool ?? 'select');
    setMaskShapes(restoredShapes);
    setActiveMaskId(restoredActiveMaskId);
    setSelectedPointIndex(restoredSelectedPointIndex);
    setMaskInvert(restored?.maskInvert ?? false);
    setMaskFeather(restored?.maskFeather ?? 0);
    setBrushRadius(restored?.brushRadius ?? 8);
    setMaskGenLoading(false);
    setMaskGenMode(restored?.maskGenMode ?? 'ai-polygon');
    setSlotMaskDetectionSettings(restored?.slotMaskDetectionSettings ?? {});
  }, [projectId]);

  useEffect(() => {
    const normalizedProjectId = projectId.trim();
    if (!normalizedProjectId) return;

    const activeShape = activeMaskId
      ? (maskShapes.find((shape) => shape.id === activeMaskId) ?? null)
      : null;
    const persistedActiveMaskId = activeShape ? activeShape.id : null;
    const persistedSelectedPointIndex =
      typeof selectedPointIndex === 'number' &&
      Number.isFinite(selectedPointIndex) &&
      selectedPointIndex >= 0 &&
      activeShape &&
      selectedPointIndex < activeShape.points.length
        ? selectedPointIndex
        : null;
    const persistedMaskFeather = Math.max(0, Math.min(100, Math.round(maskFeather)));
    const persistedBrushRadius = Math.max(1, Math.min(64, Math.round(brushRadius)));

    const timer = window.setTimeout(() => {
      saveMaskingProjectLocalState(normalizedProjectId, {
        version: 1,
        projectId: normalizedProjectId,
        savedAt: new Date().toISOString(),
        tool,
        maskShapes,
        activeMaskId: persistedActiveMaskId,
        selectedPointIndex: persistedSelectedPointIndex,
        maskInvert,
        maskFeather: persistedMaskFeather,
        brushRadius: persistedBrushRadius,
        maskGenMode,
        slotMaskDetectionSettings,
      });
    }, 220);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    projectId,
    tool,
    maskShapes,
    activeMaskId,
    selectedPointIndex,
    maskInvert,
    maskFeather,
    brushRadius,
    maskGenMode,
    slotMaskDetectionSettings,
  ]);

  const activeMaskDetectionKey = workingSlot?.id ?? selectedSlot?.id ?? '__global__';
  const maskDetectionSettings =
    slotMaskDetectionSettings[activeMaskDetectionKey] ?? DEFAULT_MASK_DETECTION_SETTINGS;
  const maskThresholdSensitivity = maskDetectionSettings.thresholdSensitivity;
  const maskEdgeSensitivity = maskDetectionSettings.edgeSensitivity;

  const setMaskThresholdSensitivity = useCallback(
    (value: number): void => {
      const clamped = Math.max(0, Math.min(100, Math.round(value)));
      setSlotMaskDetectionSettings((prev) => {
        const existing = prev[activeMaskDetectionKey] ?? DEFAULT_MASK_DETECTION_SETTINGS;
        return {
          ...prev,
          [activeMaskDetectionKey]: { ...existing, thresholdSensitivity: clamped },
        };
      });
    },
    [activeMaskDetectionKey]
  );

  const setMaskEdgeSensitivity = useCallback(
    (value: number): void => {
      const clamped = Math.max(0, Math.min(100, Math.round(value)));
      setSlotMaskDetectionSettings((prev) => {
        const existing = prev[activeMaskDetectionKey] ?? DEFAULT_MASK_DETECTION_SETTINGS;
        return { ...prev, [activeMaskDetectionKey]: { ...existing, edgeSensitivity: clamped } };
      });
    },
    [activeMaskDetectionKey]
  );

  const handleAiMaskGeneration = useCallback(
    (mode?: MaskGenerationMode) => {
      const effectiveMode = mode ?? maskGenMode;
      const filepath = workingSlot?.imageFile?.url;
      if (!filepath) {
        toast('Select a working slot with an image first.', { variant: 'info' });
        return;
      }
      setMaskGenLoading(true);

      const appendRectShape = (
        x: number,
        y: number,
        w: number,
        h: number,
        labelPrefix: string
      ): void => {
        const shapeId = `ai_${Date.now().toString(36)}`;
        const newShape: VectorShape = {
          id: shapeId,
          name: `${labelPrefix} ${maskShapes.length + 1}`,
          type: 'rect',
          points: [
            { x, y },
            { x: x + w, y: y + h },
          ],
          style: {},
          role: 'custom',
          closed: true,
          visible: true,
        };
        setMaskShapes((prev) => [...prev, newShape]);
        setActiveMaskId(shapeId);
      };

      if (effectiveMode === 'threshold' || effectiveMode === 'edges') {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
          try {
            const sourceWidth = image.naturalWidth || image.width || 1;
            const sourceHeight = image.naturalHeight || image.height || 1;
            const ratio = Math.min(1, 1024 / Math.max(sourceWidth, sourceHeight));
            const sampledWidth = Math.max(1, Math.round(sourceWidth * ratio));
            const sampledHeight = Math.max(1, Math.round(sourceHeight * ratio));

            const canvas = document.createElement('canvas');
            canvas.width = sampledWidth;
            canvas.height = sampledHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas context unavailable.');
            ctx.drawImage(image, 0, 0, sampledWidth, sampledHeight);
            const imageData = ctx.getImageData(0, 0, sampledWidth, sampledHeight);
            const bounds =
              effectiveMode === 'threshold'
                ? getThresholdMaskBounds(
                    imageData.data,
                    sampledWidth,
                    sampledHeight,
                    maskThresholdSensitivity
                  )
                : getEdgeMaskBounds(
                    imageData.data,
                    sampledWidth,
                    sampledHeight,
                    maskEdgeSensitivity
                  );
            if (!bounds) {
              toast('No clear mask area detected for this mode.', { variant: 'warning' });
              return;
            }

            const rect = toExpandedRect(bounds, sampledWidth, sampledHeight);
            const invRatio = ratio > 0 ? 1 / ratio : 1;
            const bx = Math.max(0, Math.round(rect.x * invRatio));
            const by = Math.max(0, Math.round(rect.y * invRatio));
            const bw = Math.max(1, Math.round(rect.w * invRatio));
            const bh = Math.max(1, Math.round(rect.h * invRatio));
            const normalizedX = sourceWidth > 0 ? bx / sourceWidth : 0;
            const normalizedY = sourceHeight > 0 ? by / sourceHeight : 0;
            const normalizedW = sourceWidth > 0 ? bw / sourceWidth : 1;
            const normalizedH = sourceHeight > 0 ? bh / sourceHeight : 1;
            appendRectShape(
              Math.max(0, Math.min(1, normalizedX)),
              Math.max(0, Math.min(1, normalizedY)),
              Math.max(1 / Math.max(sourceWidth, 1), Math.min(1, normalizedW)),
              Math.max(1 / Math.max(sourceHeight, 1), Math.min(1, normalizedH)),
              effectiveMode === 'threshold' ? 'Threshold BBox' : 'Edge BBox'
            );
            toast(
              effectiveMode === 'threshold' ? 'Threshold mask generated.' : 'Edge mask generated.',
              { variant: 'success' }
            );
          } catch (err: unknown) {
            toast(err instanceof Error ? err.message : 'Mask generation failed.', {
              variant: 'error',
            });
          } finally {
            setMaskGenLoading(false);
          }
        };
        image.onerror = () => {
          toast('Failed to load image for mask generation.', { variant: 'error' });
          setMaskGenLoading(false);
        };
        image.src = filepath;
        return;
      }

      const apiMode = effectiveMode === 'ai-polygon' ? 'polygon' : 'bbox';
      api
        .post<{
          polygon?: Array<{ x: number; y: number }>;
          bbox?: { x: number; y: number; w: number; h: number };
        }>('/api/image-studio/mask/ai', { imagePath: filepath, mode: apiMode })
        .then((result) => {
          if (apiMode === 'polygon' && result.polygon && result.polygon.length >= 3) {
            const newShape: VectorShape = {
              id: `ai_${Date.now().toString(36)}`,
              name: `AI Polygon ${maskShapes.length + 1}`,
              type: 'polygon',
              points: result.polygon.map((p) => ({ x: p.x, y: p.y })),
              style: {},
              role: 'custom',
              closed: true,
              visible: true,
            };
            setMaskShapes((prev) => [...prev, newShape]);
            toast('AI polygon mask generated.', { variant: 'success' });
          } else if (apiMode === 'bbox' && result.bbox) {
            const { x, y, w, h } = result.bbox;
            appendRectShape(x, y, w, h, 'AI BBox');
            toast('AI bounding box mask generated.', { variant: 'success' });
          } else {
            toast('AI did not return a valid mask.', { variant: 'error' });
          }
        })
        .catch((err: unknown) => {
          toast(err instanceof Error ? err.message : 'AI mask generation failed.', {
            variant: 'error',
          });
        })
        .finally(() => {
          setMaskGenLoading(false);
        });
    },
    [
      maskGenMode,
      workingSlot,
      maskShapes.length,
      setMaskShapes,
      setActiveMaskId,
      toast,
      maskThresholdSensitivity,
      maskEdgeSensitivity,
    ]
  );

  const state = useMemo<MaskingState>(
    () => ({
      tool,
      maskShapes,
      activeMaskId,
      selectedPointIndex,
      maskInvert,
      maskFeather,
      brushRadius,
      maskGenLoading,
      maskGenMode,
      maskThresholdSensitivity,
      maskEdgeSensitivity,
    }),
    [
      tool,
      maskShapes,
      activeMaskId,
      selectedPointIndex,
      maskInvert,
      maskFeather,
      brushRadius,
      maskGenLoading,
      maskGenMode,
      maskThresholdSensitivity,
      maskEdgeSensitivity,
    ]
  );

  const actions = useMemo<MaskingActions>(
    () => ({
      setTool,
      setMaskShapes,
      setActiveMaskId,
      setSelectedPointIndex,
      setMaskInvert,
      setMaskFeather,
      setBrushRadius,
      setMaskGenMode,
      setMaskThresholdSensitivity,
      setMaskEdgeSensitivity,
      handleAiMaskGeneration,
    }),
    [setMaskThresholdSensitivity, setMaskEdgeSensitivity, handleAiMaskGeneration]
  );

  return (
    <MaskingActionsContext.Provider value={actions}>
      <MaskingStateContext.Provider value={state}>{children}</MaskingStateContext.Provider>
    </MaskingActionsContext.Provider>
  );
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useMaskingState(): MaskingState {
  const ctx = useContext(MaskingStateContext);
  if (!ctx) throw new Error('useMaskingState must be used within a MaskingProvider');
  return ctx;
}

export function useMaskingActions(): MaskingActions {
  const ctx = useContext(MaskingActionsContext);
  if (!ctx) throw new Error('useMaskingActions must be used within a MaskingProvider');
  return ctx;
}

export function useMasking(): MaskingState & MaskingActions {
  return { ...useMaskingState(), ...useMaskingActions() };
}
