import { callBaseApi } from './core';
import { extractProductIds } from '../base-client-parsers';

const BASE_LIST_PAGE_SIZE = 1000;
const INVENTORY_PRODUCTS_LIST_METHOD = 'getInventoryProductsList';

type ProductListCandidate = {
  method: string;
  paramKey: string;
};

type ProductIdAccumulator = {
  ids: string[];
  seenIds: Set<string>;
  addedAny: boolean;
  limitReached: boolean;
};

const normalizeProductListLimit = (limit?: number): number | null => {
  if (typeof limit !== 'number' || !Number.isFinite(limit) || limit <= 0) {
    return null;
  }
  return Math.max(1, Math.floor(limit));
};

const appendUniquePageIds = (
  pageIds: string[],
  currentIds: string[],
  currentSeenIds: Set<string>,
  limit: number | null
): ProductIdAccumulator => {
  const ids = [...currentIds];
  const seenIds = new Set(currentSeenIds);
  let addedAny = false;
  let limitReached = false;

  for (const id of pageIds) {
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    ids.push(id);
    addedAny = true;

    if (limit !== null && ids.length >= limit) {
      limitReached = true;
      break;
    }
  }

  return {
    ids,
    seenIds,
    addedAny,
    limitReached,
  };
};

const fetchProductIdPage = async (
  token: string,
  inventoryId: string,
  candidate: ProductListCandidate,
  page?: number
): Promise<string[]> => {
  const payload = await callBaseApi(token, candidate.method, {
    [candidate.paramKey]: inventoryId,
    ...(candidate.method === INVENTORY_PRODUCTS_LIST_METHOD ? { include_variants: true } : {}),
    ...(page !== undefined ? { page } : {}),
  });
  return extractProductIds(payload);
};

const shouldStopPaging = (
  pageIds: string[],
  accumulator: ProductIdAccumulator
): boolean =>
  pageIds.length === 0 ||
  accumulator.addedAny === false ||
  accumulator.limitReached ||
  pageIds.length < BASE_LIST_PAGE_SIZE;

const fetchRemainingProductIdPages = async (input: {
  token: string;
  inventoryId: string;
  candidate: ProductListCandidate;
  page: number;
  ids: string[];
  seenIds: Set<string>;
  limit: number | null;
}): Promise<string[]> => {
  const pageIds = await fetchProductIdPage(
    input.token,
    input.inventoryId,
    input.candidate,
    input.page
  );
  const nextAccumulator = appendUniquePageIds(pageIds, input.ids, input.seenIds, input.limit);

  if (shouldStopPaging(pageIds, nextAccumulator)) {
    return nextAccumulator.ids;
  }

  return fetchRemainingProductIdPages({
    ...input,
    page: input.page + 1,
    ids: nextAccumulator.ids,
    seenIds: nextAccumulator.seenIds,
  });
};

export const fetchPagedBaseProductIds = async (
  token: string,
  inventoryId: string,
  candidate: ProductListCandidate,
  limit?: number
): Promise<string[]> => {
  const normalizedLimit = normalizeProductListLimit(limit);
  const firstPageIds = await fetchProductIdPage(token, inventoryId, candidate);
  const firstAccumulator = appendUniquePageIds(
    firstPageIds,
    [],
    new Set<string>(),
    normalizedLimit
  );

  if (shouldStopPaging(firstPageIds, firstAccumulator)) {
    return firstAccumulator.ids;
  }

  return fetchRemainingProductIdPages({
    token,
    inventoryId,
    candidate,
    page: 2,
    ids: firstAccumulator.ids,
    seenIds: firstAccumulator.seenIds,
    limit: normalizedLimit,
  });
};
