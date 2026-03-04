import type { ProductWithImages } from '@/shared/contracts/products';

export type ProductNameKey = 'name_en' | 'name_pl' | 'name_de';

export const getProductNameValue = (
  product: ProductWithImages,
  key: ProductNameKey
): string | undefined => {
  const value = product[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
};

export const getProductDisplayName = (product: ProductWithImages): string =>
  getProductNameValue(product, 'name_en') ??
  getProductNameValue(product, 'name_pl') ??
  getProductNameValue(product, 'name_de') ??
  'Product';

export const getImageFilepath = (imageFile: unknown): string | undefined => {
  if (!imageFile || typeof imageFile !== 'object') return undefined;
  const filepath = (imageFile as { filepath?: unknown }).filepath;
  return typeof filepath === 'string' && filepath.trim().length > 0 ? filepath : undefined;
};

export const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

export const resolveProductCategoryId = (product: ProductWithImages): string => {
  const direct = toTrimmedString(product.categoryId);
  if (direct) return direct;
  return '';
};

export const normalizeMarketplaceStatus = (value: string): string => value.trim().toLowerCase();

export const SUCCESS_STATUSES = new Set(['active', 'success', 'completed', 'listed', 'ok']);
export const WARNING_STATUSES = new Set([
  'warning',
  'pending',
  'queued',
  'queued_relist',
  'processing',
  'in_progress',
  'running',
]);
export const FAILURE_STATUSES = new Set([
  'failed',
  'error',
  'removed',
  'needs_login',
  'auth_required',
]);

export const getStatusToneClass = (value: string): string => {
  const normalized = normalizeMarketplaceStatus(value);
  if (SUCCESS_STATUSES.has(normalized)) {
    return 'border-emerald-400/60 text-emerald-200 hover:border-emerald-300/70 hover:text-emerald-100';
  }
  if (WARNING_STATUSES.has(normalized)) {
    return 'border-amber-400/60 text-amber-200 hover:border-amber-300/70 hover:text-amber-100';
  }
  if (FAILURE_STATUSES.has(normalized)) {
    return 'border-rose-400/60 text-rose-200 hover:border-rose-300/70 hover:text-rose-100';
  }
  return 'border-gray-500/50 text-gray-300 hover:border-gray-400/60 hover:text-gray-200';
};

export const getMarketplaceButtonClass = (
  value: string,
  manageMode: boolean,
  marketplace: 'base' | 'tradera'
): string => {
  if (!manageMode) {
    return getStatusToneClass(value);
  }
  const normalized = normalizeMarketplaceStatus(value);
  if (SUCCESS_STATUSES.has(normalized)) {
    return 'border-emerald-400/70 bg-emerald-500/15 text-emerald-100 hover:border-emerald-300/80 hover:bg-emerald-500/25';
  }
  if (WARNING_STATUSES.has(normalized)) {
    return 'border-amber-400/70 bg-amber-500/15 text-amber-100 hover:border-amber-300/80 hover:bg-amber-500/25';
  }
  if (FAILURE_STATUSES.has(normalized)) {
    return 'border-rose-400/70 bg-rose-500/15 text-rose-100 hover:border-rose-300/80 hover:bg-rose-500/25';
  }
  if (marketplace === 'tradera') {
    return 'border-cyan-400/70 bg-cyan-500/15 text-cyan-100 hover:border-cyan-300/80 hover:bg-cyan-500/25';
  }
  return 'border-sky-400/70 bg-sky-500/15 text-sky-100 hover:border-sky-300/80 hover:bg-sky-500/25';
};
