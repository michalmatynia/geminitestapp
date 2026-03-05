export const DEFAULT_BASE_API_URL = 'https://api.baselinker.com/connector.php';
export const DEFAULT_BASE_API_TIMEOUT_MS = 12000;
export const DEFAULT_BASE_API_PRODUCT_WRITE_TIMEOUT_MS = 30000;
export const DEFAULT_BASE_API_IMAGE_TIMEOUT_MS = 90000;
export const DEFAULT_BASE_API_LARGE_PAYLOAD_BYTES = 250_000;

export type BaseInventoryScopeOptions = {
  inventoryId?: string | null;
};

export const toPositiveIntOrFallback = (raw: string | undefined, fallback: number): number => {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

export const BASE_API_TIMEOUT_MS = toPositiveIntOrFallback(
  process.env['BASE_API_TIMEOUT_MS'],
  DEFAULT_BASE_API_TIMEOUT_MS
);
export const BASE_API_PRODUCT_WRITE_TIMEOUT_MS = toPositiveIntOrFallback(
  process.env['BASE_API_PRODUCT_WRITE_TIMEOUT_MS'],
  DEFAULT_BASE_API_PRODUCT_WRITE_TIMEOUT_MS
);
export const BASE_API_IMAGE_TIMEOUT_MS = toPositiveIntOrFallback(
  process.env['BASE_API_IMAGE_TIMEOUT_MS'],
  DEFAULT_BASE_API_IMAGE_TIMEOUT_MS
);
export const BASE_API_LARGE_PAYLOAD_BYTES = toPositiveIntOrFallback(
  process.env['BASE_API_LARGE_PAYLOAD_BYTES'],
  DEFAULT_BASE_API_LARGE_PAYLOAD_BYTES
);

export const buildBaseApiUrl = (): string => {
  const raw = process.env['BASE_API_URL'] || DEFAULT_BASE_API_URL;
  if (raw.includes('connector.php')) return raw;
  return `${raw.replace(/\/$/, '')}/connector.php`;
};
