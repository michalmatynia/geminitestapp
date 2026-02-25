import { ApiError } from '@/shared/lib/api-client';
import { type MaskShapeForExport } from './GenerationToolbarImageUtils';

export const UPSCALE_REQUEST_TIMEOUT_MS = 60_000;
export const UPSCALE_MAX_OUTPUT_SIDE = 32_768;
export const CROP_REQUEST_TIMEOUT_MS = 60_000;
export const CENTER_REQUEST_TIMEOUT_MS = 60_000;
export const AUTOSCALER_REQUEST_TIMEOUT_MS = 60_000;
export const CENTER_LAYOUT_MIN_PADDING_PERCENT = 0;
export const CENTER_LAYOUT_MAX_PADDING_PERCENT = 40;
export const CENTER_LAYOUT_DEFAULT_PADDING_PERCENT = 8;
export const CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD = 16;
export const CENTER_LAYOUT_MIN_WHITE_THRESHOLD = 1;
export const CENTER_LAYOUT_MAX_WHITE_THRESHOLD = 80;
export const CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD = 10;
export const CENTER_LAYOUT_MIN_CHROMA_THRESHOLD = 0;
export const CENTER_LAYOUT_MAX_CHROMA_THRESHOLD = 80;

export const normalizeCenterPaddingPercent = (value: string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return CENTER_LAYOUT_DEFAULT_PADDING_PERCENT;
  return Math.max(
    CENTER_LAYOUT_MIN_PADDING_PERCENT,
    Math.min(CENTER_LAYOUT_MAX_PADDING_PERCENT, Number(parsed.toFixed(2)))
  );
};

export const normalizeCenterThreshold = (
  value: string,
  min: number,
  max: number,
  fallback: number
): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
};

export const formatLayoutPercent = (value: number): string =>
  String(Number(value.toFixed(2)));

export const shouldFallbackToServerAutoScaler = (error: unknown): boolean => {
  if (!(error instanceof ApiError) || error.status !== 400) return false;
  return /invalid request payload|invalid auto scaler payload|invalid autoscaler payload/i.test(
    error.message
  );
};

export const describeSchemaValidationIssue = (issues: unknown[]): string => {
  const firstIssue = issues[0] as { path: Array<string | number>; message: string } | undefined;
  if (!firstIssue) return 'Payload is invalid.';
  const path = firstIssue.path.length > 0
    ? firstIssue.path.map((part) => String(part)).join('.')
    : 'payload';
  return `${path}: ${firstIssue.message}`;
};

export const normalizeMaskShapeForExport = (shape: unknown): MaskShapeForExport | null => {
  if (!shape || typeof shape !== 'object') return null;
  const candidate = shape as Record<string, unknown>;
  const id = typeof candidate['id'] === 'string' ? candidate['id'].trim() : '';
  if (!id) return null;

  const rawType = candidate['type'];
  if (typeof rawType !== 'string') return null;
  const type = rawType === 'circle' ? 'ellipse' : rawType;
  if (!type) return null;

  const points = Array.isArray(candidate['points'])
    ? candidate['points']
      .map((point) => {
        if (!point || typeof point !== 'object') return null;
        const pointRecord = point as Record<string, unknown>;
        const x = pointRecord['x'];
        const y = pointRecord['y'];
        if (typeof x !== 'number' || !Number.isFinite(x)) return null;
        if (typeof y !== 'number' || !Number.isFinite(y)) return null;
        return { x, y };
      })
      .filter((point): point is { x: number; y: number } => Boolean(point))
    : [];
  if (points.length === 0) return null;

  const closed = typeof candidate['closed'] === 'boolean' ? candidate['closed'] : true;
  const visible = typeof candidate['visible'] === 'boolean' ? candidate['visible'] : true;

  return {
    id,
    type: type as MaskShapeForExport['type'],
    points,
    closed,
    visible,
  };
};
