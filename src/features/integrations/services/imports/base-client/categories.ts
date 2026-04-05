import { BaseCategory } from '@/shared/contracts/integrations/listings';
import { BaseInventory } from '@/shared/contracts/integrations/base-com';

import { callBaseApi, callBaseApiRaw, BaseApiRawResult } from './core';
import { dedupeCategories, fetchBaseCategoriesFromPayload } from '../base-client-parsers';
import { fetchBaseInventories } from './inventory';

import type { BaseInventoryScopeOptions } from './config';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export const hasCategoryHierarchy = (categories: BaseCategory[]): boolean =>
  categories.some((category: BaseCategory): boolean => Boolean(category.parentId));

export const scoreCategories = (
  categories: BaseCategory[]
): { total: number; withParent: number } => {
  const withParent = categories.reduce(
    (count: number, category: BaseCategory): number => count + (category.parentId ? 1 : 0),
    0
  );
  return {
    total: categories.length,
    withParent,
  };
};

export const isBetterCategoryCandidate = (
  candidate: BaseCategory[],
  currentBest: BaseCategory[]
): boolean => {
  const candidateScore = scoreCategories(candidate);
  const bestScore = scoreCategories(currentBest);
  if (candidateScore.withParent !== bestScore.withParent) {
    return candidateScore.withParent > bestScore.withParent;
  }
  return candidateScore.total > bestScore.total;
};

export async function fetchBaseCategories(
  token: string,
  options?: BaseInventoryScopeOptions
): Promise<BaseCategory[]> {
  let lastError: Error | null = null;
  let bestCategories: BaseCategory[] = [];
  const preferredInventoryId =
    typeof options?.inventoryId === 'string' ? options.inventoryId.trim() : '';

  const singlePassInventoryIds: string[] = [];
  if (preferredInventoryId && preferredInventoryId !== '0') {
    singlePassInventoryIds.push(preferredInventoryId);
  }

  const considerCandidate = (categories: BaseCategory[]): void => {
    const deduped = dedupeCategories(categories);
    if (deduped.length === 0) return;
    if (bestCategories.length === 0 || isBetterCategoryCandidate(deduped, bestCategories)) {
      bestCategories = deduped;
    }
  };

  try {
    const payload = await callBaseApi(token, 'getInventoryCategories', {});
    const categories = fetchBaseCategoriesFromPayload(payload);
    considerCandidate(categories);
  } catch (error: unknown) {
    logClientError(error);
    lastError = error instanceof Error ? error : new Error('Base API error.');
  }

  for (const inventoryId of singlePassInventoryIds) {
    try {
      const payload = await callBaseApi(token, 'getInventoryCategories', {
        inventory_id: inventoryId,
      });
      const categories = fetchBaseCategoriesFromPayload(payload);
      considerCandidate(categories);
    } catch (error: unknown) {
      logClientError(error);
      lastError = error instanceof Error ? error : new Error('Base API error.');
    }
  }

  if (hasCategoryHierarchy(bestCategories)) {
    return bestCategories;
  }

  const aggregated: BaseCategory[] = [];
  let inventoryIds: string[] = [];
  try {
    const inventories = await fetchBaseInventories(token);
    inventoryIds = inventories
      .map((inventory: BaseInventory): string => inventory.id)
      .filter((id: string): boolean => Boolean(id?.trim()));
  } catch (error: unknown) {
    logClientError(error);
    lastError = error instanceof Error ? error : new Error('Base API error.');
  }

  const seenInventoryIds = new Set<string>(singlePassInventoryIds);
  for (const inventoryId of inventoryIds) {
    if (seenInventoryIds.has(inventoryId)) continue;
    seenInventoryIds.add(inventoryId);
    try {
      const payload = await callBaseApi(token, 'getInventoryCategories', {
        inventory_id: inventoryId,
      });
      const categories = fetchBaseCategoriesFromPayload(payload);
      if (categories.length > 0) {
        aggregated.push(...categories);
      }
    } catch (error: unknown) {
      logClientError(error);
      lastError = error instanceof Error ? error : new Error('Base API error.');
    }
  }

  considerCandidate(aggregated);
  if (bestCategories.length > 0) return bestCategories;

  if (lastError) throw lastError;
  return [];
}

export async function fetchBaseCategoriesDebug(token: string): Promise<
  BaseApiRawResult & {
    categories: BaseCategory[];
    method: string;
    parameters: Record<string, unknown>;
  }
> {
  const method = 'getInventoryCategories';
  const parameters = {};
  const result = await callBaseApiRaw(token, method, parameters);
  const categories = result.payload ? fetchBaseCategoriesFromPayload(result.payload) : [];
  return {
    ...result,
    method,
    parameters,
    categories,
  };
}
