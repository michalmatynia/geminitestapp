import { BaseProducer, BaseInventory, BaseTag } from '@/shared/contracts/integrations';

import { callBaseApi } from './core';
import {
  extractProducerList,
  dedupeProducers,
  extractTagList,
  dedupeTags,
} from '../base-client-parsers';
import { fetchBaseInventories } from './inventory';

import type { BaseInventoryScopeOptions } from './config';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


type FetchBaseProducersOptions = BaseInventoryScopeOptions;

export type { FetchBaseProducersOptions };

export async function fetchBaseProducers(
  token: string,
  options?: FetchBaseProducersOptions
): Promise<BaseProducer[]> {
  let lastError: Error | null = null;
  const preferredInventoryId =
    typeof options?.inventoryId === 'string' ? options.inventoryId.trim() : '';

  const singlePassCalls: Array<{ method: string; parameters: Record<string, unknown> }> = [];
  if (preferredInventoryId && preferredInventoryId !== '0') {
    singlePassCalls.push({
      method: 'getInventoryManufacturers',
      parameters: { inventory_id: preferredInventoryId },
    });
    singlePassCalls.push({
      method: 'getManufacturers',
      parameters: { inventory_id: preferredInventoryId },
    });
  }
  singlePassCalls.push(
    { method: 'getInventoryManufacturers', parameters: {} },
    { method: 'getManufacturers', parameters: {} },
    { method: 'getProducers', parameters: {} }
  );

  for (const call of singlePassCalls) {
    try {
      const payload = await callBaseApi(token, call.method, call.parameters);
      const producers = extractProducerList(payload);
      if (producers.length > 0) {
        return dedupeProducers(producers);
      }
    } catch (error: unknown) {
      logClientError(error);
      lastError = error instanceof Error ? error : new Error('Base API error.');
    }
  }

  const aggregated: BaseProducer[] = [];
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

  const visitedInventoryIds = new Set<string>();
  if (preferredInventoryId && preferredInventoryId !== '0') {
    visitedInventoryIds.add(preferredInventoryId);
  }

  for (const inventoryId of inventoryIds) {
    if (visitedInventoryIds.has(inventoryId)) continue;
    visitedInventoryIds.add(inventoryId);
    try {
      const payload = await callBaseApi(token, 'getInventoryManufacturers', {
        inventory_id: inventoryId,
      });
      const producers = extractProducerList(payload);
      if (producers.length > 0) {
        aggregated.push(...producers);
      }
    } catch (error: unknown) {
      logClientError(error);
      lastError = error instanceof Error ? error : new Error('Base API error.');
    }
  }

  if (aggregated.length > 0) {
    return dedupeProducers(aggregated);
  }

  if (lastError) throw lastError;
  return [];
}

type FetchBaseTagsOptions = BaseInventoryScopeOptions;

export type { FetchBaseTagsOptions };

export async function fetchBaseTags(
  token: string,
  options?: FetchBaseTagsOptions
): Promise<BaseTag[]> {
  let lastError: Error | null = null;
  const preferredInventoryId =
    typeof options?.inventoryId === 'string' ? options.inventoryId.trim() : '';

  const singlePassCalls: Array<{ method: string; parameters: Record<string, unknown> }> = [];
  if (preferredInventoryId && preferredInventoryId !== '0') {
    singlePassCalls.push(
      { method: 'getInventoryTags', parameters: { inventory_id: preferredInventoryId } },
      { method: 'getTags', parameters: { inventory_id: preferredInventoryId } }
    );
  }
  singlePassCalls.push(
    { method: 'getInventoryTags', parameters: {} },
    { method: 'getTags', parameters: {} },
    { method: 'getLabels', parameters: {} }
  );

  for (const call of singlePassCalls) {
    try {
      const payload = await callBaseApi(token, call.method, call.parameters);
      const tags = extractTagList(payload);
      if (tags.length > 0) {
        return dedupeTags(tags);
      }
    } catch (error: unknown) {
      logClientError(error);
      lastError = error instanceof Error ? error : new Error('Base API error.');
    }
  }

  const aggregated: BaseTag[] = [];
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

  const visitedInventoryIds = new Set<string>();
  if (preferredInventoryId && preferredInventoryId !== '0') {
    visitedInventoryIds.add(preferredInventoryId);
  }

  for (const inventoryId of inventoryIds) {
    if (visitedInventoryIds.has(inventoryId)) continue;
    visitedInventoryIds.add(inventoryId);
    try {
      const payload = await callBaseApi(token, 'getInventoryTags', {
        inventory_id: inventoryId,
      });
      const tags = extractTagList(payload);
      if (tags.length > 0) {
        aggregated.push(...tags);
      }
    } catch (error: unknown) {
      logClientError(error);
      lastError = error instanceof Error ? error : new Error('Base API error.');
    }
  }

  if (aggregated.length > 0) {
    return dedupeTags(aggregated);
  }

  if (lastError) throw lastError;
  return [];
}
