import type {
  BoundsNormalizerConfig,
  BoundsNormalizerInputFormat,
} from '@/shared/contracts/ai-paths-core';
import type {
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';
import { coerceInput, getValueAtMappingPath } from '@/shared/lib/ai-paths/core/utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


// ---------------------------------------------------------------------------
// Normalised output type
// ---------------------------------------------------------------------------

type NormalisedBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
  confidence: number | null;
  label: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const toFinite = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Read a value via optional dot-path; falls back to reading key directly. */
const readField = (
  obj: unknown,
  customPath: string | undefined,
  defaultKey: string
): number | null => {
  if (obj === null || obj === undefined || typeof obj !== 'object') return null;
  const key = customPath?.trim() || defaultKey;
  return toFinite(getValueAtMappingPath(obj, key));
};

/** Traverse a dot-path into an unknown value. Returns undefined if unreachable. */
const resolvePath = (value: unknown, path: string | undefined): unknown => {
  if (!path?.trim()) return value;
  return getValueAtMappingPath(value, path.trim());
};

// ---------------------------------------------------------------------------
// Format converters
// ---------------------------------------------------------------------------

/**
 * pixels_tlwh — {left,top,width,height} (or custom field names) — pass-through.
 */
const fromPixelsTlwh = (
  raw: unknown,
  cfg: BoundsNormalizerConfig
): { left: number; top: number; width: number; height: number } | null => {
  const left = readField(raw, cfg.leftField, 'left');
  const top = readField(raw, cfg.topField, 'top');
  const width = readField(raw, cfg.widthField, 'width');
  const height = readField(raw, cfg.heightField, 'height');
  if (left === null || top === null || width === null || height === null) return null;
  if (width <= 0 || height <= 0) return null;
  return { left, top, width, height };
};

/**
 * pixels_tlbr — {x1,y1,x2,y2} (or custom field names).
 * Defaults: leftField→x1, topField→y1, widthField→x2, heightField→y2.
 */
const fromPixelsTlbr = (
  raw: unknown,
  cfg: BoundsNormalizerConfig
): { left: number; top: number; width: number; height: number } | null => {
  const x1 = readField(raw, cfg.leftField, 'x1');
  const y1 = readField(raw, cfg.topField, 'y1');
  const x2 = readField(raw, cfg.widthField, 'x2');
  const y2 = readField(raw, cfg.heightField, 'y2');
  if (x1 === null || y1 === null || x2 === null || y2 === null) return null;
  const width = x2 - x1;
  const height = y2 - y1;
  if (width <= 0 || height <= 0) return null;
  return { left: x1, top: y1, width, height };
};

const parseGeminiMillirelativeBounds = (
  raw: unknown
): { y1: number; x1: number; y2: number; x2: number } | null => {
  if (!Array.isArray(raw) || raw.length < 4) return null;
  const y1 = toFinite(raw[0]);
  const x1 = toFinite(raw[1]);
  const y2 = toFinite(raw[2]);
  const x2 = toFinite(raw[3]);
  if (y1 === null || x1 === null || y2 === null || x2 === null) return null;
  return { y1, x1, y2, x2 };
};

const toGeminiMillirelativePixels = (
  bounds: { y1: number; x1: number; y2: number; x2: number },
  imgW: number,
  imgH: number
): { left: number; top: number; width: number; height: number } => ({
  left: Math.round((bounds.x1 / 1000) * imgW),
  top: Math.round((bounds.y1 / 1000) * imgH),
  width: Math.round(((bounds.x2 - bounds.x1) / 1000) * imgW),
  height: Math.round(((bounds.y2 - bounds.y1) / 1000) * imgH),
});

/**
 * gemini_millirelative — array [y1,x1,y2,x2] on 0–1000 scale.
 * Requires image dimensions from context to convert to pixels.
 */
const fromGeminiMillirelative = (
  raw: unknown,
  imgW: number,
  imgH: number
): { left: number; top: number; width: number; height: number } | null => {
  const bounds = parseGeminiMillirelativeBounds(raw);
  if (!bounds) return null;
  const { left, top, width, height } = toGeminiMillirelativePixels(bounds, imgW, imgH);
  if (width <= 0 || height <= 0) return null;
  return { left, top, width, height };
};

/**
 * relative_xywh — array or object [cx,cy,w,h] normalised 0–1 (YOLO centre format).
 * Requires image dimensions.
 * If object, reads: cx/centerX, cy/centerY, w/width, h/height.
 */
const fromRelativeXywh = (
  raw: unknown,
  imgW: number,
  imgH: number,
  cfg: BoundsNormalizerConfig
): { left: number; top: number; width: number; height: number } | null => {
  let cx: number | null = null;
  let cy: number | null = null;
  let rw: number | null = null;
  let rh: number | null = null;

  if (Array.isArray(raw) && raw.length >= 4) {
    [cx, cy, rw, rh] = raw.map(toFinite) as [
      number | null,
      number | null,
      number | null,
      number | null,
    ];
  } else if (raw !== null && typeof raw === 'object') {
    cx =
      readField(raw, cfg.leftField, 'cx') ??
      readField(raw, undefined, 'centerX') ??
      readField(raw, undefined, 'x');
    cy =
      readField(raw, cfg.topField, 'cy') ??
      readField(raw, undefined, 'centerY') ??
      readField(raw, undefined, 'y');
    rw = readField(raw, cfg.widthField, 'w') ?? readField(raw, undefined, 'width');
    rh = readField(raw, cfg.heightField, 'h') ?? readField(raw, undefined, 'height');
  }
  if (cx === null || cy === null || rw === null || rh === null) return null;
  const width = Math.round(rw * imgW);
  const height = Math.round(rh * imgH);
  if (width <= 0 || height <= 0) return null;
  const left = Math.round(cx * imgW - width / 2);
  const top = Math.round(cy * imgH - height / 2);
  return { left, top, width, height };
};

/**
 * percentage_tlwh — {left,top,width,height} as 0–100 percent.
 * Requires image dimensions.
 */
const fromPercentageTlwh = (
  raw: unknown,
  imgW: number,
  imgH: number,
  cfg: BoundsNormalizerConfig
): { left: number; top: number; width: number; height: number } | null => {
  const left = readField(raw, cfg.leftField, 'left');
  const top = readField(raw, cfg.topField, 'top');
  const width = readField(raw, cfg.widthField, 'width');
  const height = readField(raw, cfg.heightField, 'height');
  if (left === null || top === null || width === null || height === null) return null;
  const pw = Math.round((width / 100) * imgW);
  const ph = Math.round((height / 100) * imgH);
  if (pw <= 0 || ph <= 0) return null;
  return {
    left: Math.round((left / 100) * imgW),
    top: Math.round((top / 100) * imgH),
    width: pw,
    height: ph,
  };
};

/**
 * auto — detect format by inspecting the raw value shape.
 */
const fromAuto = (
  raw: unknown,
  imgW: number | null,
  imgH: number | null,
  cfg: BoundsNormalizerConfig
): { left: number; top: number; width: number; height: number } | null => {
  // Array of 4 numbers → try Gemini millirelative first, then relative_xywh
  if (Array.isArray(raw) && raw.length === 4) {
    const vals = raw.map(toFinite);
    if (vals.every((v): v is number => v !== null)) {
      const max = Math.max(...vals);
      if (max > 1 && imgW && imgH) {
        // Gemini 0-1000 scale
        return fromGeminiMillirelative(raw, imgW, imgH);
      }
      if (max <= 1 && imgW && imgH) {
        // Relative YOLO
        return fromRelativeXywh(raw, imgW, imgH, cfg);
      }
    }
  }
  // Object — try pixels_tlwh then pixels_tlbr
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    const rec = raw as Record<string, unknown>;
    // Check for TLBR keys
    if ('x1' in rec || 'x2' in rec) return fromPixelsTlbr(raw, cfg);
    // Default TLWH
    return fromPixelsTlwh(raw, cfg);
  }
  return null;
};

// ---------------------------------------------------------------------------
// Image dimension resolution
// ---------------------------------------------------------------------------

const resolveImageDims = (
  context: unknown,
  cfg: BoundsNormalizerConfig
): { imgW: number | null; imgH: number | null } => {
  if (context === null || context === undefined || typeof context !== 'object') {
    return { imgW: null, imgH: null };
  }
  const wPath = cfg.imageWidthPath?.trim() || 'imageWidth';
  const hPath = cfg.imageHeightPath?.trim() || 'imageHeight';
  const imgW = toFinite(getValueAtMappingPath(context, wPath));
  const imgH = toFinite(getValueAtMappingPath(context, hPath));
  return { imgW, imgH };
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handleBoundsNormalizer: NodeHandler = ({
  node,
  nodeInputs,
  toast,
  reportAiPathsError,
}: NodeHandlerContext): RuntimePortValues => {
  try {
    const cfg: BoundsNormalizerConfig = {
      inputFormat: 'pixels_tlwh',
      ...(node.config?.boundsNormalizer ?? {}),
    };

    const rawInput = coerceInput(nodeInputs['value']);
    const contextInput = coerceInput(nodeInputs['context']);

    if (rawInput === undefined || rawInput === null) return {};

    // Drill into the bounds sub-object if boundsPath is configured
    const rawBounds = resolvePath(rawInput, cfg.boundsPath);

    // Resolve image dimensions from context (needed for relative/percentage formats)
    const { imgW, imgH } = resolveImageDims(contextInput, cfg);

    const format: BoundsNormalizerInputFormat = cfg.inputFormat ?? 'pixels_tlwh';

    let converted: { left: number; top: number; width: number; height: number } | null = null;

    switch (format) {
      case 'pixels_tlwh':
        converted = fromPixelsTlwh(rawBounds, cfg);
        break;
      case 'pixels_tlbr':
        converted = fromPixelsTlbr(rawBounds, cfg);
        break;
      case 'gemini_millirelative':
        if (imgW && imgH) {
          converted = fromGeminiMillirelative(rawBounds, imgW, imgH);
        } else {
          toast(
            `Bounds Normaliser "${node.title ?? node.id}": image dimensions not available for gemini_millirelative format.`,
            { variant: 'info' }
          );
        }
        break;
      case 'relative_xywh':
        if (imgW && imgH) {
          converted = fromRelativeXywh(rawBounds, imgW, imgH, cfg);
        } else {
          toast(
            `Bounds Normaliser "${node.title ?? node.id}": image dimensions not available for relative_xywh format.`,
            { variant: 'info' }
          );
        }
        break;
      case 'percentage_tlwh':
        if (imgW && imgH) {
          converted = fromPercentageTlwh(rawBounds, imgW, imgH, cfg);
        } else {
          toast(
            `Bounds Normaliser "${node.title ?? node.id}": image dimensions not available for percentage_tlwh format.`,
            { variant: 'info' }
          );
        }
        break;
      case 'auto':
        converted = fromAuto(rawBounds, imgW, imgH, cfg);
        break;
    }

    if (!converted) {
      toast(
        `Bounds Normaliser "${node.title ?? node.id}": could not extract bounds from input using format "${format}".`,
        { variant: 'info' }
      );
      return {};
    }

    // Extract optional pass-through fields
    const confidence: number | null = cfg.confidencePath
      ? toFinite(resolvePath(rawInput, cfg.confidencePath))
      : null;
    const label: unknown = cfg.labelPath ? resolvePath(rawInput, cfg.labelPath) : null;
    const labelStr: string | null = typeof label === 'string' && label.trim() ? label.trim() : null;

    const result: NormalisedBounds = {
      ...converted,
      confidence,
      label: labelStr,
    };

    return { value: result };
  } catch (error) {
    logClientError(error);
    reportAiPathsError(
      error,
      { service: 'ai-paths-runtime', nodeId: node.id, nodeType: node.type },
      `Node ${node.id} failed`
    );
    return {};
  }
};
