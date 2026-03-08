'use client';

import { sanitizeStudioProjectId } from '@/features/ai/image-studio/utils/project-session';
import type { VectorShape, VectorToolMode } from '@/shared/lib/vector-drawing';

export type MaskGenerationMode = 'ai-polygon' | 'ai-bbox' | 'threshold' | 'edges';

type PixelBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type MaskDetectionSettings = {
  thresholdSensitivity: number;
  edgeSensitivity: number;
};

export const DEFAULT_MASK_DETECTION_SETTINGS: MaskDetectionSettings = {
  thresholdSensitivity: 55,
  edgeSensitivity: 55,
};

const IMAGE_STUDIO_MASK_STATE_LOCAL_KEY_PREFIX = 'image_studio_mask_state_';

export type MaskingProjectLocalState = {
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
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
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
  if (!record) {
    return {};
  }

  const next: Record<string, MaskDetectionSettings> = {};
  Object.entries(record).forEach(([key, candidate]) => {
    const normalizedKey = key.trim();
    if (!normalizedKey) {
      return;
    }
    const entry = asRecord(candidate);
    if (!entry) {
      return;
    }
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
  if (!record) {
    return null;
  }

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
      if (!pointRecord) {
        return null;
      }
      const x =
        typeof pointRecord['x'] === 'number' && Number.isFinite(pointRecord['x'])
          ? pointRecord['x']
          : null;
      const y =
        typeof pointRecord['y'] === 'number' && Number.isFinite(pointRecord['y'])
          ? pointRecord['y']
          : null;
      if (x === null || y === null) {
        return null;
      }
      return { x, y };
    })
    .filter((point): point is { x: number; y: number } => Boolean(point));

  if (points.length === 0) {
    return null;
  }

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
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry, index) => normalizeMaskShape(entry, index))
    .filter((entry): entry is VectorShape => Boolean(entry));
};

const getMaskStateLocalKey = (projectId: string): string | null => {
  const normalized = projectId.trim();
  if (!normalized) {
    return null;
  }
  return `${IMAGE_STUDIO_MASK_STATE_LOCAL_KEY_PREFIX}${sanitizeStudioProjectId(normalized)}`;
};

const parseMaskingProjectLocalState = (
  raw: string | null,
  expectedProjectId: string
): MaskingProjectLocalState | null => {
  if (!raw?.trim()) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const record = asRecord(parsed);
  if (!record) {
    return null;
  }

  const storedProjectId = asTrimmedString(record['projectId']) ?? '';
  const expected = expectedProjectId.trim();
  if (!storedProjectId || !expected) {
    return null;
  }
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

export const loadMaskingProjectLocalState = (
  projectId: string
): MaskingProjectLocalState | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const key = getMaskStateLocalKey(projectId);
  if (!key) {
    return null;
  }
  const raw = window.localStorage.getItem(key);
  return parseMaskingProjectLocalState(raw, projectId);
};

export const saveMaskingProjectLocalState = (
  projectId: string,
  state: MaskingProjectLocalState
): void => {
  if (typeof window === 'undefined') {
    return;
  }
  const key = getMaskStateLocalKey(projectId);
  if (!key) {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Best-effort local cache.
  }
};

const extendBounds = (bounds: PixelBounds | null, x: number, y: number): PixelBounds => {
  if (!bounds) {
    return { minX: x, minY: y, maxX: x, maxY: y };
  }
  return {
    minX: Math.min(bounds.minX, x),
    minY: Math.min(bounds.minY, y),
    maxX: Math.max(bounds.maxX, x),
    maxY: Math.max(bounds.maxY, y),
  };
};

export const getThresholdMaskBounds = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  thresholdSensitivity: number
): PixelBounds | null => {
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
    if (a < 8) {
      continue;
    }

    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const maxChannel = Math.max(r, g, b);
    const minChannel = Math.min(r, g, b);
    const saturation = maxChannel - minChannel;

    const isForeground = luma < lumaCutoff || saturation > saturationCutoff;
    if (!isForeground) {
      continue;
    }

    const x = index % width;
    const y = Math.floor(index / width);
    bounds = extendBounds(bounds, x, y);
  }

  return bounds;
};

export const getEdgeMaskBounds = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  edgeSensitivity: number
): PixelBounds | null => {
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
      if (magnitude < edgeThreshold) {
        continue;
      }
      bounds = extendBounds(bounds, x, y);
    }
  }

  return bounds;
};

export const toExpandedRect = (
  bounds: PixelBounds,
  width: number,
  height: number
): { x: number; y: number; w: number; h: number } => {
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
};
