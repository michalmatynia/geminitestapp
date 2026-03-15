import { NextRequest, NextResponse } from 'next/server';

import type { BaseProductRecord } from '@/features/integrations/server';
import {
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
} from '@/features/integrations/server';
import { resolvePriceGroupContext } from '@/features/integrations/services/imports/base-import-service-context';
import { resolveBaseConnectionToken } from '@/features/integrations/server';
import {
  getCatalogRepository,
  getProductDataProvider,
  getProductRepository,
} from '@/features/products/server';
import type { ProductCreateInput, ProductWithImages } from '@/features/products/server';
import {
  baseImportInventoriesPayloadSchema,
  baseImportListPayloadSchema,
  baseImportWarehousesPayloadSchema,
  baseImportWarehousesDebugPayloadSchema,
  type BaseImportInventoriesResponse,
  type BaseImportListResponse,
  type BaseImportWarehousesResponse,
  type BaseImportWarehousesDebugResponse,
  type BaseWarehouse,
  type ImportListItem,
} from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


export const requestSchema = baseImportInventoriesPayloadSchema.or(
  baseImportWarehousesPayloadSchema
).or(baseImportWarehousesDebugPayloadSchema).or(baseImportListPayloadSchema);

type MappedItem = Omit<ImportListItem, 'baseProductId' | 'sku'> & {
  baseProductId: string | null;
  sku: string | null;
};

const BASE_DETAILS_BATCH_SIZE = 100;
const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);

const isImportListItem = (item: MappedItem): item is ImportListItem =>
  typeof item.baseProductId === 'string' &&
  item.baseProductId.trim().length > 0 &&
  typeof item.sku === 'string' &&
  item.sku.trim().length > 0;

export async function postBaseImportsHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const parsedBody = requestSchema.safeParse(ctx.body);
  if (!parsedBody.success) {
    throw badRequestError('Invalid imports/base request payload.');
  }
  const data = parsedBody.data;
  const action = data['action'];
  const integrationRepo = await getIntegrationRepository();
  const integrations = await integrationRepo.listIntegrations();
  const baseIntegration = integrations.find((integration: (typeof integrations)[number]) =>
    BASE_INTEGRATION_SLUGS.has((integration.slug ?? '').trim().toLowerCase())
  );
  const baseIntegrationId = baseIntegration?.id ?? null;

  const normalizedConnectionId = data.connectionId?.trim() || '';
  let token: string | null = null;

  if (!normalizedConnectionId) {
    throw badRequestError('Base.com connection is required.');
  }
  if (!baseIntegrationId) {
    throw badRequestError('Base.com integration is not configured.');
  }

  const resolvedBaseConnection = await integrationRepo.getConnectionByIdAndIntegration(
    normalizedConnectionId,
    baseIntegrationId
  );
  if (!resolvedBaseConnection) {
    throw badRequestError('Selected Base.com connection was not found.');
  }

  const tokenResolution = resolveBaseConnectionToken({
    baseApiToken: resolvedBaseConnection.baseApiToken,
  });
  token = tokenResolution.token;
  if (!token) {
    throw badRequestError(
      tokenResolution.error ??
        'Base.com API token is required. Password token fallback is disabled.'
    );
  }

  if (action === 'inventories') {
    const inventories = await fetchBaseInventories(token);
    const response: BaseImportInventoriesResponse = { inventories };
    return NextResponse.json(response);
  }

  if (action === 'warehouses') {
    const warehouses = await fetchBaseWarehouses(token, data.inventoryId);
    let allWarehouses: BaseWarehouse[] = [];
    if (data.includeAllWarehouses) {
      try {
        allWarehouses = await fetchBaseAllWarehouses(token);
      } catch (error) {
        void ErrorSystem.captureException(error);
        allWarehouses = [];
      }
    }
    const response: BaseImportWarehousesResponse = { warehouses, allWarehouses };
    return NextResponse.json(response);
  }

  if (action === 'warehouses_debug') {
    const inventoryResult = await fetchBaseWarehousesDebug(token, data.inventoryId);
    const inventoriesResult = await fetchBaseInventoriesDebug(token);
    let allResult: Awaited<ReturnType<typeof fetchBaseAllWarehousesDebug>> | null = null;
    if (data.includeAllWarehouses) {
      try {
        allResult = await fetchBaseAllWarehousesDebug(token);
      } catch (error) {
        void ErrorSystem.captureException(error);
        allResult = null;
      }
    }
    const response: BaseImportWarehousesDebugResponse = {
      warehouses: inventoryResult.warehouses,
      allWarehouses: allResult?.warehouses ?? [],
      inventories: inventoriesResult.inventories ?? [],
      raw: {
        inventory: inventoryResult,
        inventories: inventoriesResult,
        all: allResult,
      },
    };
    return NextResponse.json(response);
  }

  const inventoryId = data.inventoryId;
  const provider = await getProductDataProvider();

  if (action === 'list') {
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

    const mapRecordsToItems = (records: BaseProductRecord[]): ImportListItem[] =>
      records
        .map((record: BaseProductRecord): MappedItem => {
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
        .filter(isImportListItem);

    const fetchMappedItemsByIds = async (ids: string[]): Promise<ImportListItem[]> => {
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
        const response: BaseImportListResponse = {
          products: [],
          total: listItems.length,
          filtered: filteredItems.length,
          available: filteredItems.length,
          existing: listItems.filter((i: { id: string; exists: boolean }) => i.exists).length,
          skuDuplicates: 0,
          page,
          pageSize,
          totalPages: filteredItemsTotalPages,
        };
        return NextResponse.json(response);
      }

      const mappedList = await fetchMappedItemsByIds(
        pagedItems.map((item: { id: string; exists: boolean }) => item.id)
      );
      const skuDuplicateCount = mappedList.filter((item: ImportListItem) => item.skuExists).length;

      const response: BaseImportListResponse = {
        products: mappedList,
        total: listItems.length,
        filtered: filteredItems.length,
        available: filteredItems.length,
        existing: listItems.filter((item: { id: string; exists: boolean }) => item.exists).length,
        skuDuplicates: skuDuplicateCount,
        page,
        pageSize,
        totalPages: filteredItemsTotalPages,
      };
      return NextResponse.json(response);
    }

    const searchableIds = filteredItems.map((item: { id: string; exists: boolean }) => item.id);
    const mappedSearchScope = await fetchMappedItemsByIds(searchableIds);
    const hasExactSkuMatch =
      normalizedSku.length > 0 &&
      mappedSearchScope.some(
        (item: ImportListItem) => item.sku.toLowerCase() === normalizedSku
      );
    const searchedList = mappedSearchScope.filter((item: ImportListItem) => {
      const nameOk =
        normalizedName.length === 0 ? true : item.name.toLowerCase().includes(normalizedName);
      const skuValue = item.sku.toLowerCase();
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
    const skuDuplicateCount = pagedSearchedList.filter(
      (item: ImportListItem) => item.skuExists
    ).length;

    const response: BaseImportListResponse = {
      products: pagedSearchedList,
      total: listItems.length,
      filtered: searchedList.length,
      available: filteredItems.length,
      existing: listItems.filter((item: { id: string; exists: boolean }) => item.exists).length,
      skuDuplicates: skuDuplicateCount,
      page: normalizedPage,
      pageSize,
      totalPages: searchedTotalPages,
    };
    return NextResponse.json(response);
  }
  throw badRequestError(`Unsupported action: ${action}`);
}

export const POST_handler = postBaseImportsHandler;
