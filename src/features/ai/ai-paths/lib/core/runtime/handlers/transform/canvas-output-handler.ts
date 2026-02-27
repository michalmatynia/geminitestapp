import type { CanvasOutputConfig } from '@/shared/contracts/ai-paths-core';
import type { NodeHandler, NodeHandlerContext, RuntimePortValues } from '@/shared/contracts/ai-paths-runtime';
import { coerceInput, getValueAtMappingPath } from '../../../utils';

// ---------------------------------------------------------------------------
// Helpers (mirrors bounds-normalizer-handler utilities)
// ---------------------------------------------------------------------------

const toFinite = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const readField = (obj: unknown, customPath: string | undefined, defaultKey: string): number | null => {
  if (obj === null || obj === undefined || typeof obj !== 'object') return null;
  const key = customPath?.trim() || defaultKey;
  return toFinite(getValueAtMappingPath(obj, key));
};

const resolvePath = (value: unknown, path: string | undefined): unknown => {
  if (!path?.trim()) return value;
  return getValueAtMappingPath(value, path.trim());
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * canvas_output — Image Studio terminal node.
 *
 * Reads a bounds object from the `value` input port, normalises it to
 * { left, top, width, height }, and emits it at TWO locations in the
 * return value:
 *   1. The standard `value` output port — for composability with downstream nodes.
 *   2. A named top-level key (default `image_studio_bounds`) — Image Studio
 *      detects this key in run.result and skips manual field-mapping configuration.
 *
 * Optional `confidence` and `label` inputs (or dot-paths into `value`) are
 * included in both outputs when present.
 */
export const handleCanvasOutput: NodeHandler = ({
  node,
  nodeInputs,
  toast,
  reportAiPathsError,
}: NodeHandlerContext): RuntimePortValues => {
  try {
    const cfg: CanvasOutputConfig = {
      outputKey: 'image_studio_bounds',
      ...((node.config?.canvasOutput) ?? {}),
    };

    const outputKey = cfg.outputKey?.trim() || 'image_studio_bounds';

    const rawInput = coerceInput(nodeInputs['value']);
    if (rawInput === undefined || rawInput === null) return {};

    // Drill into nested bounds object via optional boundsPath
    const rawBounds = resolvePath(rawInput, cfg.boundsPath);

    // Extract the four required coordinate fields
    const left   = readField(rawBounds, cfg.leftField,   'left');
    const top    = readField(rawBounds, cfg.topField,    'top');
    const width  = readField(rawBounds, cfg.widthField,  'width');
    const height = readField(rawBounds, cfg.heightField, 'height');

    if (left === null || top === null || width === null || height === null) {
      toast(
        `Canvas Output "${node.title ?? node.id}": could not extract left/top/width/height from input.`,
        { variant: 'info' },
      );
      return {};
    }

    if (width <= 0 || height <= 0) {
      toast(
        `Canvas Output "${node.title ?? node.id}": bounds have non-positive dimensions (width=${width}, height=${height}).`,
        { variant: 'info' },
      );
      return {};
    }

    // Optional pass-through fields —
    // prefer dedicated input ports, fall back to dot-paths into the value input.
    const confidencePort = coerceInput(nodeInputs['confidence']);
    const confidence: number | null =
      confidencePort !== undefined && confidencePort !== null
        ? (toFinite(confidencePort) ?? null)
        : cfg.confidencePath
          ? (toFinite(resolvePath(rawInput, cfg.confidencePath)) ?? null)
          : null;

    const labelPort = coerceInput(nodeInputs['label']);
    const rawLabel: unknown =
      labelPort !== undefined && labelPort !== null
        ? labelPort
        : cfg.labelPath
          ? resolvePath(rawInput, cfg.labelPath)
          : null;
    const label: string | null =
      typeof rawLabel === 'string' && rawLabel.trim() ? rawLabel.trim() : null;

    const result = {
      left,
      top,
      width,
      height,
      ...(confidence !== null ? { confidence } : {}),
      ...(label !== null ? { label } : {}),
    };

    return {
      // Standard composable output port
      value: result,
      // Named key that Image Studio reads directly from run.result
      [outputKey]: result,
    };
  } catch (error) {
    reportAiPathsError(
      error,
      { service: 'ai-paths-runtime', nodeId: node.id, nodeType: node.type },
      `Node ${node.id} failed`,
    );
    return {};
  }
};
