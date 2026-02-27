import type {
  ImageStudioCenterDetectionMode,
  ImageStudioCenterShadowPolicy,
} from '@/features/ai/image-studio/contracts/center';

import type { ImageStudioAnalysisSharedLayout } from './analysis-bridge';
import { sanitizeStudioProjectId } from './project-session';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONFIG_LOCAL_KEY_PREFIX = 'image_studio_ai_paths_object_analysis_config_';
const AI_PATHS_INDEX_KEY = 'ai_paths_index';
const AI_PATHS_CONFIG_PREFIX = 'ai_paths_config_';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AiPathsObjectAnalysisAutoApplyTarget =
  | 'none'
  | 'object_layout'
  | 'auto_scaler'
  | 'both';

export type AiPathsObjectAnalysisFieldMapping = {
  /**
   * Dot-notation paths into run.result for object bounding box.
   * Example: "objectBounds.left" or just "left".
   */
  boundsLeft?: string | undefined;
  boundsTop?: string | undefined;
  boundsWidth?: string | undefined;
  boundsHeight?: string | undefined;
  /**
   * Alternative: use object centre coordinates instead of bounds.
   * Requires source image dimensions to be available.
   */
  centerX?: string | undefined;
  centerY?: string | undefined;
  /** Optional confidence score field (0–1). */
  confidence?: string | undefined;
};

export type AiPathsObjectAnalysisConfig = {
  pathId: string;
  triggerNodeId?: string | undefined;
  triggerEvent?: string | undefined;
  fieldMapping: AiPathsObjectAnalysisFieldMapping;
  /** Reposition the canvas image preview so the object centre aligns with canvas centre. */
  applyPreviewOffset: boolean;
  /** Which image-studio tools to feed results into. */
  autoApplyTarget: AiPathsObjectAnalysisAutoApplyTarget;
  /** If true, auto-run the object-layout / auto-scaler tool after applying settings. */
  runAfterApply: boolean;
};

export type ExtractedObjectBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type AiPathMeta = {
  id: string;
  name: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const toFiniteNumber = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const isValidAutoApplyTarget = (v: unknown): v is AiPathsObjectAnalysisAutoApplyTarget =>
  v === 'none' || v === 'object_layout' || v === 'auto_scaler' || v === 'both';

/**
 * Traverse a dot-notation path in an unknown object.
 * Example: getValueAtPath(obj, "analysis.bounds.left") → obj.analysis.bounds.left
 */
export const getValueAtPath = (obj: unknown, path: string): unknown => {
  const trimmed = path.trim();
  if (!trimmed) return undefined;
  const parts = trimmed.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

// ---------------------------------------------------------------------------
// Field extraction
// ---------------------------------------------------------------------------

/**
 * Extract object bounding box from a completed AI path run result
 * using the user-configured field mapping.
 *
 * Tries bounds fields (boundsLeft/Top/Width/Height) first,
 * then falls back to centre fields (centerX/centerY).
 */
export const extractObjectBoundsFromRunResult = (
  result: Record<string, unknown> | null | undefined,
  fieldMapping: AiPathsObjectAnalysisFieldMapping,
  sourceImageWidth?: number | null | undefined,
  sourceImageHeight?: number | null | undefined,
): ExtractedObjectBounds | null => {
  if (!result) return null;

  // ---------------------------------------------------------------------------
  // Fast-path: canvas_output node emits a named top-level key into run.result.
  // If that key is present with all four numeric fields, use it directly —
  // no manual field-mapping required.
  // ---------------------------------------------------------------------------
  const CANVAS_OUTPUT_KEYS = ['image_studio_bounds'] as const;
  for (const key of CANVAS_OUTPUT_KEYS) {
    const candidate = result[key];
    if (candidate !== null && candidate !== undefined && typeof candidate === 'object' && !Array.isArray(candidate)) {
      const rec = candidate as Record<string, unknown>;
      const left   = toFiniteNumber(rec['left']);
      const top    = toFiniteNumber(rec['top']);
      const width  = toFiniteNumber(rec['width']);
      const height = toFiniteNumber(rec['height']);
      if (left !== null && top !== null && width !== null && height !== null && width > 0 && height > 0) {
        return { left, top, width, height };
      }
    }
  }

  // Try full bounds
  const leftPath = fieldMapping.boundsLeft?.trim() ?? '';
  const topPath = fieldMapping.boundsTop?.trim() ?? '';
  const widthPath = fieldMapping.boundsWidth?.trim() ?? '';
  const heightPath = fieldMapping.boundsHeight?.trim() ?? '';

  if (leftPath && topPath && widthPath && heightPath) {
    const left = toFiniteNumber(getValueAtPath(result, leftPath));
    const top = toFiniteNumber(getValueAtPath(result, topPath));
    const width = toFiniteNumber(getValueAtPath(result, widthPath));
    const height = toFiniteNumber(getValueAtPath(result, heightPath));
    if (
      left !== null && top !== null &&
      width !== null && height !== null &&
      width > 0 && height > 0
    ) {
      return { left, top, width, height };
    }
  }

  // Try centre coordinates — synthesise a 1-pixel bounds at the centre
  const cxPath = fieldMapping.centerX?.trim() ?? '';
  const cyPath = fieldMapping.centerY?.trim() ?? '';
  if (cxPath && cyPath) {
    const cx = toFiniteNumber(getValueAtPath(result, cxPath));
    const cy = toFiniteNumber(getValueAtPath(result, cyPath));
    if (cx !== null && cy !== null) {
      // Without width/height we cannot compute padding, so use a 1-px stub.
      // Canvas offset computation only needs the centre, so this is sufficient
      // for the preview repositioning use case.
      const w = (sourceImageWidth !== null && sourceImageWidth !== undefined && sourceImageWidth > 0)
        ? sourceImageWidth
        : 1;
      const h = (sourceImageHeight !== null && sourceImageHeight !== undefined && sourceImageHeight > 0)
        ? sourceImageHeight
        : 1;
      return { left: cx - w / 2, top: cy - h / 2, width: w, height: h };
    }
  }

  return null;
};

/**
 * Extract confidence score from run result (0–1, or null if not found).
 */
export const extractConfidenceFromRunResult = (
  result: Record<string, unknown> | null | undefined,
  fieldMapping: AiPathsObjectAnalysisFieldMapping,
): number | null => {
  if (!result) return null;
  const path = fieldMapping.confidence?.trim() ?? '';
  if (!path) return null;
  const raw = toFiniteNumber(getValueAtPath(result, path));
  if (raw === null) return null;
  return Math.max(0, Math.min(1, raw));
};

// ---------------------------------------------------------------------------
// Canvas offset computation
// ---------------------------------------------------------------------------

/**
 * Compute the canvas image offset needed to centre the detected object
 * at the canvas centre guide lines.
 *
 * @param bounds        - Object bounding box in source image pixel space
 * @param frame         - Where the image is currently painted on the canvas (canvas pixel space)
 * @param sourceWidth   - Source image natural width in pixels
 * @param sourceHeight  - Source image natural height in pixels
 * @param canvasWidth   - Project canvas width in pixels
 * @param canvasHeight  - Project canvas height in pixels
 * @param currentOffset - The current canvasImageOffset value
 */
export const computeCanvasOffsetFromObjectBounds = (
  bounds: ExtractedObjectBounds,
  frame: { x: number; y: number; width: number; height: number },
  sourceWidth: number,
  sourceHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  currentOffset: { x: number; y: number },
): { x: number; y: number } => {
  if (
    sourceWidth <= 0 || sourceHeight <= 0 ||
    frame.width <= 0 || frame.height <= 0 ||
    canvasWidth <= 0 || canvasHeight <= 0
  ) {
    return currentOffset;
  }

  // Scale from source image pixels → canvas display pixels
  const displayScaleX = frame.width / sourceWidth;
  const displayScaleY = frame.height / sourceHeight;

  // Object centre in canvas pixel space (frame position already reflects current offset)
  const objectCenterCanvasX = frame.x + (bounds.left + bounds.width / 2) * displayScaleX;
  const objectCenterCanvasY = frame.y + (bounds.top + bounds.height / 2) * displayScaleY;

  // Delta needed to bring object centre to canvas centre
  const deltaX = canvasWidth / 2 - objectCenterCanvasX;
  const deltaY = canvasHeight / 2 - objectCenterCanvasY;

  return {
    x: currentOffset.x + deltaX,
    y: currentOffset.y + deltaY,
  };
};

// ---------------------------------------------------------------------------
// Shared layout builder
// ---------------------------------------------------------------------------

/**
 * Build a default ImageStudioAnalysisSharedLayout for apply intent.
 * Uses sensible defaults — the user can fine-tune in the tools after applying.
 */
export const buildDefaultSharedLayout = (overrides?: {
  detection?: ImageStudioCenterDetectionMode | undefined;
  shadowPolicy?: ImageStudioCenterShadowPolicy | undefined;
  whiteThreshold?: number | undefined;
  chromaThreshold?: number | undefined;
  paddingPercent?: number | undefined;
}): ImageStudioAnalysisSharedLayout => ({
  paddingPercent: overrides?.paddingPercent ?? 8,
  paddingXPercent: overrides?.paddingPercent ?? 8,
  paddingYPercent: overrides?.paddingPercent ?? 8,
  splitAxes: false,
  fillMissingCanvasWhite: false,
  targetCanvasWidth: null,
  targetCanvasHeight: null,
  whiteThreshold: overrides?.whiteThreshold ?? 18,
  chromaThreshold: overrides?.chromaThreshold ?? 10,
  shadowPolicy: overrides?.shadowPolicy ?? 'auto',
  detection: overrides?.detection ?? 'auto',
});

// ---------------------------------------------------------------------------
// Path index parsing (used in the hook to populate the dropdown)
// ---------------------------------------------------------------------------

export const parseAiPathMetasFromSettings = (
  settings: Array<{ key: string; value: string }>,
): AiPathMeta[] => {
  if (!Array.isArray(settings)) return [];
  const indexItem = settings.find((s) => s.key === AI_PATHS_INDEX_KEY);
  if (!indexItem) return [];
  try {
    const index = JSON.parse(indexItem.value) as unknown;
    if (!Array.isArray(index)) return [];
    return index
      .filter(
        (item): item is Record<string, unknown> =>
          item !== null &&
          typeof item === 'object' &&
          typeof (item as Record<string, unknown>)['id'] === 'string' &&
          typeof (item as Record<string, unknown>)['name'] === 'string',
      )
      .map((item) => ({ id: item['id'] as string, name: item['name'] as string }));
  } catch {
    return [];
  }
};

export const parseAiPathNodesAndEdgesFromSettings = (
  settings: Array<{ key: string; value: string }>,
  pathId: string,
): { nodes: unknown[]; edges: unknown[] } | null => {
  if (!Array.isArray(settings) || !pathId) return null;
  const configItem = settings.find((s) => s.key === `${AI_PATHS_CONFIG_PREFIX}${pathId}`);
  if (!configItem) return null;
  try {
    const config = JSON.parse(configItem.value) as unknown;
    if (!config || typeof config !== 'object') return null;
    const obj = config as Record<string, unknown>;
    const nodes = Array.isArray(obj['nodes']) ? obj['nodes'] : [];
    const edges = Array.isArray(obj['edges']) ? obj['edges'] : [];
    return { nodes, edges };
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: AiPathsObjectAnalysisConfig = {
  pathId: '',
  fieldMapping: {},
  applyPreviewOffset: true,
  autoApplyTarget: 'both',
  runAfterApply: false,
};

export const loadAiPathsObjectAnalysisConfig = (
  projectId: string,
): AiPathsObjectAnalysisConfig => {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  const key = CONFIG_LOCAL_KEY_PREFIX + sanitizeStudioProjectId(projectId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return DEFAULT_CONFIG;
    const obj = parsed as Record<string, unknown>;
    const fieldMapping: AiPathsObjectAnalysisFieldMapping =
      obj['fieldMapping'] !== null && typeof obj['fieldMapping'] === 'object'
        ? (obj['fieldMapping'] as AiPathsObjectAnalysisFieldMapping)
        : {};
    return {
      pathId: typeof obj['pathId'] === 'string' ? obj['pathId'] : '',
      triggerNodeId:
        typeof obj['triggerNodeId'] === 'string' && obj['triggerNodeId']
          ? obj['triggerNodeId']
          : undefined,
      triggerEvent:
        typeof obj['triggerEvent'] === 'string' && obj['triggerEvent']
          ? obj['triggerEvent']
          : undefined,
      fieldMapping,
      applyPreviewOffset: obj['applyPreviewOffset'] !== false,
      autoApplyTarget: isValidAutoApplyTarget(obj['autoApplyTarget'])
        ? obj['autoApplyTarget']
        : 'both',
      runAfterApply: obj['runAfterApply'] === true,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
};

export const saveAiPathsObjectAnalysisConfig = (
  projectId: string,
  config: AiPathsObjectAnalysisConfig,
): void => {
  if (typeof window === 'undefined') return;
  const key = CONFIG_LOCAL_KEY_PREFIX + sanitizeStudioProjectId(projectId);
  try {
    localStorage.setItem(key, JSON.stringify(config));
  } catch {
    // ignore quota errors
  }
};
