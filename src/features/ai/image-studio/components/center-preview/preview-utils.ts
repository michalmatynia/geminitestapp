import { logClientError } from '@/shared/utils/observability/client-error-logger';
export type VariantThumbnailInfo = {
  id: string;
  index: number;
  status: 'pending' | 'completed' | 'failed';
  imageSrc: string | null;
  output: {
    id: string;
    filepath: string;
    filename: string;
    size: number;
    width: number | null;
    height: number | null;
  } | null;
  slotId: string | null;
  model: string | null;
  timestamp: string | null;
  timestampLabel: string;
  timestampSearchText: string;
  tokenCostUsd: number | null;
  actualCostUsd: number | null;
  costEstimated: boolean;
};

const SPLIT_ZOOM_MIN = 0.5;
const SPLIT_ZOOM_MAX = 4;
export const SPLIT_ZOOM_STEP = 0.1;
export const SPLIT_WHEEL_ZOOM_SENSITIVITY = 0.0006;
export const SPLIT_WHEEL_MAX_DELTA = 0.04;
export const SPLIT_WHEEL_MIN_DELTA = 0.0015;

export const asObjectRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

export const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
};

export const formatBytes = (value: number | null): string => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 'n/a';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex === 0 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
};

export const formatUsd = (value: number | null): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'n/a';
  return `$${value.toFixed(4)}`;
};

export const formatTimestamp = (value: string | null): string => {
  if (!value) return 'n/a';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

export const buildTimestampSearchText = (value: string | null): string => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.toLowerCase();
  return `${value} ${parsed.toISOString()} ${parsed.toLocaleDateString()} ${parsed.toLocaleTimeString()} ${parsed.toLocaleString()}`.toLowerCase();
};

export const wait = async (ms: number): Promise<void> =>
  await new Promise((resolve) => setTimeout(resolve, ms));

export const normalizeImagePath = (value: string | null | undefined): string => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return parsed.pathname.replace(/\\/g, '/');
    } catch (error) {
      logClientError(error);
      return trimmed.replace(/\\/g, '/');
    }
  }
  return trimmed.split('?')[0]?.replace(/\\/g, '/') ?? '';
};

export const clampSplitZoom = (value: number): number => {
  return Math.min(SPLIT_ZOOM_MAX, Math.max(SPLIT_ZOOM_MIN, Number(value.toFixed(2))));
};
