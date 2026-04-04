import type { ProductPatchInput } from '@/shared/contracts/products';

export const buildProductsByIdServerTiming = (
  entries: Record<string, number | null | undefined>
): string =>
  Object.entries(entries)
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
    .map(([name, value]) => `${name};dur=${Math.round(value as number)}`)
    .join(', ');

export const attachProductsByIdTimingHeaders = (
  response: Response,
  entries: Record<string, number | null | undefined>
): void => {
  const value = buildProductsByIdServerTiming(entries);
  if (value) {
    response.headers.set('Server-Timing', value);
  }
};

export const isLikelyProductsByIdPayloadTooLarge = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();
  return (
    normalized.includes('exceeded') ||
    normalized.includes('too large') ||
    normalized.includes('body limit') ||
    normalized.includes('request entity too large')
  );
};

export const buildProductsByIdPayload = (formData: FormData): Record<string, unknown> => {
  const payload = Object.fromEntries(formData.entries());
  delete payload['images'];
  return payload;
};

export const buildProductsByIdPatchUpdateData = (data: {
  price?: number;
  stock?: number;
}): ProductPatchInput => {
  const updateData: ProductPatchInput = {};
  if (data.price !== undefined) updateData.price = data.price;
  if (data.stock !== undefined) updateData.stock = data.stock;
  return updateData;
};

export const buildProductsByIdMutationOptions = (
  userId: string | null | undefined
): {} | { userId: string } => (userId ? { userId } : {});
