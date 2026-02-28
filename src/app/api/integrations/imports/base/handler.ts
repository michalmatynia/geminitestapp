import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  decryptSecret,
  fetchBaseAllWarehouses,
  fetchBaseAllWarehousesDebug,
  fetchBaseInventories,
  fetchBaseInventoriesDebug,
  fetchBaseProductIds,
  fetchBaseProductDetails,
  fetchBaseWarehouses,
  fetchBaseWarehousesDebug,
  getIntegrationRepository,
  mapBaseProduct,
  extractBaseImageUrls,
  startBaseImportRunResponse,
} from '@/shared/lib/integrations/server';
import type { BaseProductRecord } from '@/shared/lib/integrations/server';
import {
  getCatalogRepository,
  getProductDataProvider,
  getProductRepository,
} from '@/features/products/server';
import type { ProductCreateInput, ProductWithImages } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

export const requestSchema = z.object({
  token: z.string().trim().min(1).optional(),
  action: z.enum(['inventories', 'warehouses', 'warehouses_debug', 'import', 'list']),
  connectionId: z.string().trim().min(1).optional(),
  inventoryId: z.string().trim().min(1).optional(),
  includeAllWarehouses: z.boolean().optional(),
  catalogId: z.string().trim().min(1).optional(),
  templateId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  searchName: z.string().trim().optional(),
  searchSku: z.string().trim().optional(),
  imageMode: z.enum(['links', 'download']).optional(),
  uniqueOnly: z.boolean().optional(),
  allowDuplicateSku: z.boolean().optional(), // Allow importing products with duplicate SKUs
  selectedIds: z.array(z.string().trim().min(1)).optional(),
  dryRun: z.boolean().optional(),
  mode: z.enum(['create_only', 'upsert_on_base_id', 'upsert_on_sku']).optional(),
  requestId: z.string().trim().min(1).optional(),
});

type MappedItem = {
  baseProductId: string | null;
  name: string;
  sku: string | null;
  exists: boolean;
  skuExists: boolean;
  description: string;
  price: number;
  stock: number;
  image: string | null;
};

const BASE_DETAILS_BATCH_SIZE = 100;
const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);

type PriceGroupLookup = {
  id: string;
  groupId?: string | null;
  currencyId?: string | null;
  currencyCode?: string | null;
  isDefault?: boolean;
};

const normalizeCurrencyCode = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const compact = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  return compact.length === 3 ? compact : null;
};

const addCurrencyCandidate = (target: Set<string>, value: unknown): void => {
  const code = normalizeCurrencyCode(value);
  if (code) target.add(code);
};

const resolvePriceGroupContext = async (
  provider: Awaited<ReturnType<typeof getProductDataProvider>>,
  preferredPriceGroupId?: string | null
): Promise<{ defaultPriceGroupId: string | null; preferredCurrencies: string[] }> => {
  const projectedFields = { id: 1, groupId: 1, currencyId: 1, currencyCode: 1 } as const;

  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const priceGroupCollection = mongo.collection<PriceGroupLookup>('price_groups');
    const byId = preferredPriceGroupId?.trim()
      ? await priceGroupCollection.findOne(
        { id: preferredPriceGroupId.trim() },
        { projection: projectedFields }
      )
      : null;
    const fallbackDefault = byId
      ? null
      : await priceGroupCollection.findOne({ isDefault: true }, { projection: projectedFields });
    const resolved = byId ?? fallbackDefault;
    if (!resolved?.id) {
      return { defaultPriceGroupId: null, preferredCurrencies: [] };
    }
    const preferredCurrencies = new Set<string>();
    addCurrencyCandidate(preferredCurrencies, resolved.currencyCode);
    addCurrencyCandidate(preferredCurrencies, resolved.groupId);
    addCurrencyCandidate(preferredCurrencies, resolved.currencyId);
    if (resolved.currencyId) {
      try {
        const currency = await mongo
          .collection<{ id?: string; code?: string }>('currencies')
          .findOne(
            {
              $or: [{ id: resolved.currencyId }, { code: resolved.currencyId }],
            },
            { projection: { code: 1, id: 1 } }
          );
        addCurrencyCandidate(preferredCurrencies, currency?.code);
      } catch {
        // Currency lookup is optional for import mapping.
      }
    }
    return {
      defaultPriceGroupId: resolved.id,
      preferredCurrencies: Array.from(preferredCurrencies),
    };
  }

  const byId = preferredPriceGroupId?.trim()
    ? await prisma.priceGroup.findUnique({
      where: { id: preferredPriceGroupId.trim() },
      select: {
        id: true,
        groupId: true,
        currencyId: true,
        currency: { select: { code: true } },
      },
    })
    : null;
  const fallbackDefault = byId
    ? null
    : await prisma.priceGroup.findFirst({
      where: { isDefault: true },
      select: {
        id: true,
        groupId: true,
        currencyId: true,
        currency: { select: { code: true } },
      },
    });
  const resolved = byId ?? fallbackDefault;
  if (!resolved?.id) {
    return { defaultPriceGroupId: null, preferredCurrencies: [] };
  }
  const preferredCurrencies = new Set<string>();
  addCurrencyCandidate(preferredCurrencies, resolved.currency?.code);
  addCurrencyCandidate(preferredCurrencies, resolved.groupId);
  addCurrencyCandidate(preferredCurrencies, resolved.currencyId);
  return {
    defaultPriceGroupId: resolved.id,
    preferredCurrencies: Array.from(preferredCurrencies),
  };
};

export async function postBaseImportsHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const data = ctx.body as z.infer<typeof requestSchema>;
  const integrationRepo = await getIntegrationRepository();
  const integrations = await integrationRepo.listIntegrations();
  const baseIntegration = integrations.find((integration: (typeof integrations)[number]) =>
    BASE_INTEGRATION_SLUGS.has((integration.slug ?? '').trim().toLowerCase())
  );
  const baseIntegrationId = baseIntegration?.id ?? null;

  if (data.action === 'import') {
    if (!data.inventoryId) {
      throw badRequestError('Inventory ID is required.');
    }
    if (!data.catalogId) {
      throw badRequestError('Catalog ID is required.');
    }

    const response = await startBaseImportRunResponse({
      inventoryId: data.inventoryId,
      catalogId: data.catalogId,
      imageMode: data.imageMode ?? 'links',
      uniqueOnly: data.uniqueOnly ?? true,
      allowDuplicateSku: data.allowDuplicateSku ?? false,
      ...(data.connectionId ? { connectionId: data.connectionId } : {}),
      ...(data.templateId ? { templateId: data.templateId } : {}),
      ...(typeof data.limit === 'number' ? { limit: data.limit } : {}),
      ...(Array.isArray(data.selectedIds) ? { selectedIds: data.selectedIds } : {}),
      ...(typeof data.dryRun === 'boolean' ? { dryRun: data.dryRun } : {}),
      ...(data.mode ? { mode: data.mode } : {}),
      ...(data.requestId ? { requestId: data.requestId } : {}),
    });
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }

  const resolvedBaseConnectionId = data.connectionId?.trim() || null;
  let resolvedBaseConnection: {
    id: string;
    baseApiToken?: string | null | undefined;
    password?: string | null | undefined;
  } | null = null;
  if (baseIntegrationId && resolvedBaseConnectionId) {
    resolvedBaseConnection = await integrationRepo.getConnectionByIdAndIntegration(
      resolvedBaseConnectionId,
      baseIntegrationId
    );
    if (!resolvedBaseConnection) {
      // resolvedBaseConnectionId = null; // Unused
    }
  }

  let token = data.token;

  if (!token) {
    if (baseIntegrationId) {
      if (!resolvedBaseConnection) {
        const connections = await integrationRepo.listConnections(baseIntegrationId);
        resolvedBaseConnection =
          connections.find(
            (connection: (typeof connections)[number]) =>
              connection.baseApiToken || connection.password
          ) ?? null;
        // resolvedBaseConnectionId = resolvedBaseConnection?.id ?? null; // Unused
      }
      if (resolvedBaseConnection) {
        try {
          if (resolvedBaseConnection.baseApiToken) {
            token = decryptSecret(resolvedBaseConnection.baseApiToken);
          } else if (resolvedBaseConnection.password) {
            token = decryptSecret(resolvedBaseConnection.password);
          }
        } catch {
          // Ignore decryption errors, will fail later if token is still missing
        }
      }
    }
  }

  if (!token) {
    throw badRequestError('Base.com API token is required (or connect integration).');
  }

  if (data.action === 'inventories') {
    const inventories = await fetchBaseInventories(token);
    return NextResponse.json({ inventories });
  }

  if (data.action === 'warehouses') {
    if (!data.inventoryId) {
      throw badRequestError('Inventory ID is required.');
    }
    const warehouses = await fetchBaseWarehouses(token, data.inventoryId);
    let allWarehouses: { id: string; name: string }[] = [];
    if (data.includeAllWarehouses) {
      try {
        allWarehouses = await fetchBaseAllWarehouses(token);
      } catch {
        allWarehouses = [];
      }
    }
    return NextResponse.json({ warehouses, allWarehouses });
  }

  if (data.action === 'warehouses_debug') {
    if (!data.inventoryId) {
      throw badRequestError('Inventory ID is required.');
    }
    const inventoryResult = await fetchBaseWarehousesDebug(token, data.inventoryId);
    const inventoriesResult = await fetchBaseInventoriesDebug(token);
    let allResult: Awaited<ReturnType<typeof fetchBaseAllWarehousesDebug>> | null = null;
    if (data.includeAllWarehouses) {
      try {
        allResult = await fetchBaseAllWarehousesDebug(token);
      } catch {
        allResult = null;
      }
    }
    return NextResponse.json({
      warehouses: inventoryResult.warehouses,
      allWarehouses: allResult?.warehouses ?? [],
      inventories: inventoriesResult.inventories ?? [],
      raw: {
        inventory: inventoryResult,
        inventories: inventoriesResult,
        all: allResult,
      },
    });
  }

  if (!data.inventoryId) {
    throw badRequestError('Inventory ID is required.');
  }
  const inventoryId = data.inventoryId;
  const provider = await getProductDataProvider();

  if (data.action === 'list') {
    const catalogRepository = await getCatalogRepository();
    const catalogs = await catalogRepository.listCatalogs();
    const defaultCatalog = catalogs.find((catalog: (typeof catalogs)[number]) => catalog.isDefault);
    const targetCatalog = data.catalogId
      ? (catalogs.find((catalog: (typeof catalogs)[number]) => catalog.id === data.catalogId) ??
        defaultCatalog)
      : defaultCatalog;
    const { preferredCurrencies: listPreferredCurrencies } = await resolvePriceGroupContext(
      provider,
      targetCatalog?.defaultPriceGroupId ?? null
    );

    const allBaseIds = await fetchBaseProductIds(token, inventoryId);

    // Get existing products using repository to check for baseProductIds and SKUs
    const productRepository = await getProductRepository();
    const allProducts = await productRepository.getProducts({
      pageSize: 10000, // Get all products
      page: 1,
    });
    const existingIds = new Set(
      allProducts
        .map((product: ProductWithImages) => product.baseProductId)
        .filter((id): id is string => typeof id === 'string')
    );
    const existingSkus = new Set(
      allProducts
        .map((product: ProductWithImages) => product.sku)
        .filter((sku): sku is string => typeof sku === 'string' && sku.trim() !== '')
    );

    const listItems = allBaseIds.map((id: string) => ({
      id,
      exists: existingIds.has(id),
    }));
    const filteredItems = data.uniqueOnly
      ? listItems.filter((item: { id: string; exists: boolean }) => !item.exists)
      : listItems;

    const pageSize = data.pageSize ?? data.limit ?? 50;
    const page = data.page ?? 1;
    const normalizedName = (data.searchName ?? '').trim().toLowerCase();
    const normalizedSku = (data.searchSku ?? '').trim().toLowerCase();
    const hasSearchFilter = normalizedName.length > 0 || normalizedSku.length > 0;
    const filteredItemsTotalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

    const toStringId = (value: unknown): string | null => {
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
      return null;
    };

    const mapRecordsToItems = (records: BaseProductRecord[]): MappedItem[] =>
      records
        .map((record: BaseProductRecord) => {
          const mapped: ProductCreateInput = mapBaseProduct(record, [], {
            preferredPriceCurrencies: listPreferredCurrencies,
          });
          const images = extractBaseImageUrls(record);
          const baseProductId =
            mapped.baseProductId ??
            toStringId(record['base_product_id']) ??
            toStringId(record['product_id']) ??
            toStringId(record['id']);

          // Prioritize EN, then PL, then DE, then raw name
          const name =
            mapped.name_en ??
            mapped.name_pl ??
            mapped.name_de ??
            (typeof record['name'] === 'string' ? record['name'] : 'Unnamed');

          const description =
            mapped.description_en ?? mapped.description_pl ?? mapped.description_de ?? '';

          const sku = mapped.sku ?? null;
          const skuExists = sku ? existingSkus.has(sku) : false;

          return {
            baseProductId: baseProductId ?? null,
            name,
            sku,
            exists: baseProductId ? existingIds.has(baseProductId) : false,
            skuExists,
            description: description.slice(0, 100),
            price: mapped.price ?? 0,
            stock: mapped.stock ?? 0,
            image: images[0] ?? null,
          };
        })
        .filter((item: MappedItem) => Boolean(item.baseProductId && item.sku));

    const fetchMappedItemsByIds = async (ids: string[]): Promise<MappedItem[]> => {
      if (ids.length === 0) return [];
      const records: BaseProductRecord[] = [];
      for (let index = 0; index < ids.length; index += BASE_DETAILS_BATCH_SIZE) {
        const batch = ids.slice(index, index + BASE_DETAILS_BATCH_SIZE);
        if (batch.length === 0) continue;
        const batchProducts = await fetchBaseProductDetails(token, inventoryId, batch);
        records.push(...batchProducts);
      }
      return mapRecordsToItems(records);
    };

    if (!hasSearchFilter) {
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pagedItems = filteredItems.slice(startIndex, endIndex);

      if (pagedItems.length === 0) {
        return NextResponse.json({
          products: [],
          total: listItems.length,
          filtered: filteredItems.length,
          available: filteredItems.length,
          existing: listItems.filter((i: { id: string; exists: boolean }) => i.exists).length,
          skuDuplicates: 0,
          page,
          pageSize,
          totalPages: filteredItemsTotalPages,
        });
      }

      const mappedList = await fetchMappedItemsByIds(
        pagedItems.map((item: { id: string; exists: boolean }) => item.id)
      );
      const skuDuplicateCount = mappedList.filter((item: MappedItem) => item.skuExists).length;

      return NextResponse.json({
        products: mappedList,
        total: listItems.length,
        filtered: filteredItems.length,
        available: filteredItems.length,
        existing: listItems.filter((item: { id: string; exists: boolean }) => item.exists).length,
        skuDuplicates: skuDuplicateCount,
        page,
        pageSize,
        totalPages: filteredItemsTotalPages,
      });
    }

    const searchableIds = filteredItems.map((item: { id: string; exists: boolean }) => item.id);
    const mappedSearchScope = await fetchMappedItemsByIds(searchableIds);
    const hasExactSkuMatch =
      normalizedSku.length > 0 &&
      mappedSearchScope.some(
        (item: MappedItem) => (item.sku ?? '').toLowerCase() === normalizedSku
      );
    const searchedList = mappedSearchScope.filter((item: MappedItem) => {
      const nameOk =
        normalizedName.length === 0 ? true : item.name.toLowerCase().includes(normalizedName);
      const skuValue = (item.sku ?? '').toLowerCase();
      const skuOk =
        normalizedSku.length === 0
          ? true
          : hasExactSkuMatch
            ? skuValue === normalizedSku
            : skuValue.includes(normalizedSku);
      return nameOk && skuOk;
    });
    const searchedTotalPages = Math.max(1, Math.ceil(searchedList.length / pageSize));
    const normalizedPage = Math.min(Math.max(page, 1), searchedTotalPages);
    const startIndex = (normalizedPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pagedSearchedList = searchedList.slice(startIndex, endIndex);
    const skuDuplicateCount = pagedSearchedList.filter((item: MappedItem) => item.skuExists).length;

    return NextResponse.json({
      products: pagedSearchedList,
      total: listItems.length,
      filtered: searchedList.length,
      available: filteredItems.length,
      existing: listItems.filter((item: { id: string; exists: boolean }) => item.exists).length,
      skuDuplicates: skuDuplicateCount,
      page: normalizedPage,
      pageSize,
      totalPages: searchedTotalPages,
    });
  }
  throw badRequestError(`Unsupported action: ${data.action}`);
}
