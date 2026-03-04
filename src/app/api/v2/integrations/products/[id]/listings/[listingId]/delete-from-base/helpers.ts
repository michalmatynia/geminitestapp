import { badRequestError } from '@/shared/errors/app-error';

export const resolveDeleteInventoryId = (
  requestedInventoryId: string | undefined,
  listingInventoryId: string | null | undefined
): string => {
  const explicitInventoryId = requestedInventoryId?.trim() ?? '';
  if (explicitInventoryId) return explicitInventoryId;
  const storedInventoryId = listingInventoryId?.trim() ?? '';
  if (storedInventoryId) return storedInventoryId;
  throw badRequestError(
    'Inventory ID is required for Base.com deletion. Default inventory fallback is disabled.'
  );
};
