import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getImageFileRepository } from '@/features/files/server';
import { getImportTemplate } from '@/features/integrations/services/import-template-repository';
import {
  fetchBaseAllWarehouses,
  fetchBaseAllWarehousesDebug,
  fetchBaseInventories,
  fetchBaseInventoriesDebug,
  fetchBaseWarehouses,
  fetchBaseWarehousesDebug,
  fetchBaseProducts,
  fetchBaseProductIds,
  fetchBaseProductDetails
} from '@/features/integrations/services/imports/base-client';
import type { BaseProductRecord } from '@/features/integrations/services/imports/base-client';
import { extractBaseImageUrls, mapBaseProduct } from '@/features/integrations/services/imports/base-mapper';
import { getIntegrationRepository } from '@/features/integrations/services/integration-repository';
import {
  findProductListingByProductAndConnectionAcrossProviders,
  getProductListingRepository,
} from '@/features/integrations/services/product-listing-repository';
import { getTagMappingRepository } from '@/features/integrations/services/tag-mapping-repository';
import { decryptSecret } from '@/features/integrations/utils/encryption';
import { getCatalogRepository } from '@/features/products/services/catalog-repository';
import { getProducerRepository } from '@/features/products/services/producer-repository';
import { getProductDataProvider } from '@/features/products/services/product-provider';
import { getProductRepository } from '@/features/products/services/product-repository';
import { getTagRepository } from '@/features/products/services/tag-repository';
import type { ProductWithImages } from '@/features/products/types/records';
import { validateProductCreate } from '@/features/products/validations';
import type { ProductCreateInput } from '@/features/products/validations/schemas';
import { badRequestError, externalServiceError, internalError, notFoundError, validationError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import type { ApiHandlerContext } from '@/shared/types/api/api';

export const runtime = 'nodejs';

const requestSchema = z.object({
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
  selectedIds: z.array(z.string().trim().min(1)).optional()
});

type BaseRecord = {
  id?: string | number;
  product_id?: string | number;
  base_product_id?: string | number;
  name?: string;
  [key: string]: unknown;
};

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
  const compact = value.trim().toUpperCase().replace(/[^A-Z]/g, '');
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
    const priceGroupCollection =
      mongo.collection<PriceGroupLookup>('price_groups');
    const byId =
      preferredPriceGroupId?.trim()
        ? await priceGroupCollection.findOne(
          { id: preferredPriceGroupId.trim() },
          { projection: projectedFields }
        )
        : null;
    const fallbackDefault = byId
      ? null
      : await priceGroupCollection.findOne(
        { isDefault: true },
        { projection: projectedFields }
      );
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
              $or: [
                { id: resolved.currencyId },
                { code: resolved.currencyId }
              ]
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
      preferredCurrencies: Array.from(preferredCurrencies)
    };
  }

  const byId =
    preferredPriceGroupId?.trim()
      ? await prisma.priceGroup.findUnique({
        where: { id: preferredPriceGroupId.trim() },
        select: {
          id: true,
          groupId: true,
          currencyId: true,
          currency: { select: { code: true } }
        }
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
        currency: { select: { code: true } }
      }
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
    preferredCurrencies: Array.from(preferredCurrencies)
  };
};

async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const data = ctx.body as z.infer<typeof requestSchema>;
  const integrationRepo = await getIntegrationRepository();
  const integrations = await integrationRepo.listIntegrations();
  const baseIntegration = integrations.find((integration) =>
    BASE_INTEGRATION_SLUGS.has((integration.slug ?? '').trim().toLowerCase())
  );
  const baseIntegrationId = baseIntegration?.id ?? null;
  let resolvedBaseConnectionId = data.connectionId?.trim() || null;
  let resolvedBaseConnection: {
    id: string;
    baseApiToken?: string | null;
    password?: string | null;
  } | null = null;
  if (baseIntegrationId && resolvedBaseConnectionId) {
    resolvedBaseConnection =
      await integrationRepo.getConnectionByIdAndIntegration(
        resolvedBaseConnectionId,
        baseIntegrationId
      );
    if (!resolvedBaseConnection) {
      resolvedBaseConnectionId = null;
    }
  }

  let token = data.token;

  if (!token) {
    if (baseIntegrationId) {
      if (!resolvedBaseConnection) {
        const connections = await integrationRepo.listConnections(
          baseIntegrationId
        );
        resolvedBaseConnection = connections.find(
          (connection) => connection.baseApiToken || connection.password
        ) ?? null;
        resolvedBaseConnectionId = resolvedBaseConnection?.id ?? null;
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
    const inventoryResult = await fetchBaseWarehousesDebug(
      token,
      data.inventoryId
    );
    const inventoriesResult = await fetchBaseInventoriesDebug(token);
    let allResult: Awaited<ReturnType<typeof fetchBaseAllWarehousesDebug>> | null =
      null;
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
        all: allResult
      }
    });
  }

  if (!data.inventoryId) {
    throw badRequestError('Inventory ID is required.');
  }
  const inventoryId = data.inventoryId;
  const provider = await getProductDataProvider();
  const linkImportedProductToBaseListing = async (
    product: ProductWithImages | null,
    baseProductId: string | null | undefined
  ): Promise<void> => {
    const normalizedBaseProductId = baseProductId?.trim() || '';
    if (!product?.id || !normalizedBaseProductId) return;
    if (!baseIntegrationId || !resolvedBaseConnectionId) return;

    const existingListing =
      await findProductListingByProductAndConnectionAcrossProviders(
        product.id,
        resolvedBaseConnectionId
      );
    if (existingListing) {
      if (existingListing.listing.externalListingId !== normalizedBaseProductId) {
        await existingListing.repository.updateListingExternalId(
          existingListing.listing.id,
          normalizedBaseProductId
        );
      }
      if ((existingListing.listing.inventoryId ?? null) !== inventoryId) {
        await existingListing.repository.updateListingInventoryId(
          existingListing.listing.id,
          inventoryId
        );
      }
      if (existingListing.listing.status !== 'active') {
        await existingListing.repository.updateListingStatus(
          existingListing.listing.id,
          'active'
        );
      }
      return;
    }

    const listingRepository = await getProductListingRepository();
    const createdListing = await listingRepository.createListing({
      productId: product.id,
      integrationId: baseIntegrationId,
      connectionId: resolvedBaseConnectionId,
      status: 'active',
      externalListingId: normalizedBaseProductId,
      inventoryId,
      marketplaceData: {
        source: 'base-import',
      },
    });
    await listingRepository.updateListingStatus(createdListing.id, 'active');
  };

  if (data.action === 'list') {
    const catalogRepository = await getCatalogRepository();
    const catalogs = await catalogRepository.listCatalogs();
    const defaultCatalog = catalogs.find((catalog) => catalog.isDefault);
    const targetCatalog = data.catalogId
      ? catalogs.find((catalog) => catalog.id === data.catalogId) ?? defaultCatalog
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
      page: 1
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
      exists: existingIds.has(id)
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
          mapped.description_en ??
          mapped.description_pl ??
          mapped.description_de ??
          '';

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
            image: images[0] ?? null
          };
        })
        .filter((item) => Boolean(item.baseProductId && item.sku));

    const fetchMappedItemsByIds = async (ids: string[]): Promise<MappedItem[]> => {
      if (ids.length === 0) return [];
      const records: BaseProductRecord[] = [];
      for (let index = 0; index < ids.length; index += BASE_DETAILS_BATCH_SIZE) {
        const batch = ids.slice(index, index + BASE_DETAILS_BATCH_SIZE);
        if (batch.length === 0) continue;
        const batchProducts = await fetchBaseProductDetails(
          token,
          inventoryId,
          batch
        );
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
          totalPages: filteredItemsTotalPages
        });
      }

      const mappedList = await fetchMappedItemsByIds(
        pagedItems.map((item: { id: string; exists: boolean }) => item.id)
      );
      const skuDuplicateCount = mappedList.filter((item) => item.skuExists).length;

      return NextResponse.json({
        products: mappedList,
        total: listItems.length,
        filtered: filteredItems.length,
        available: filteredItems.length,
        existing: listItems.filter((item: { id: string; exists: boolean }) => item.exists).length,
        skuDuplicates: skuDuplicateCount,
        page,
        pageSize,
        totalPages: filteredItemsTotalPages
      });
    }

    const searchableIds = filteredItems.map((item: { id: string; exists: boolean }) => item.id);
    const mappedSearchScope = await fetchMappedItemsByIds(searchableIds);
    const hasExactSkuMatch =
      normalizedSku.length > 0 &&
      mappedSearchScope.some(
        (item) => (item.sku ?? '').toLowerCase() === normalizedSku
      );
    const searchedList = mappedSearchScope.filter((item: MappedItem) => {
      const nameOk =
        normalizedName.length === 0
          ? true
          : item.name.toLowerCase().includes(normalizedName);
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
    const skuDuplicateCount = pagedSearchedList.filter((item) => item.skuExists).length;

    return NextResponse.json({
      products: pagedSearchedList,
      total: listItems.length,
      filtered: searchedList.length,
      available: filteredItems.length,
      existing: listItems.filter((item: { id: string; exists: boolean }) => item.exists).length,
      skuDuplicates: skuDuplicateCount,
      page: normalizedPage,
      pageSize,
      totalPages: searchedTotalPages
    });
  }

  const selectedIds = (data.selectedIds ?? [])
    .map((id: string) => id.trim())
    .filter(Boolean);
  const normalizedSelectedIds = Array.from(new Set(selectedIds));
  const hasSelectionPayload = Array.isArray(data.selectedIds);
  if (hasSelectionPayload && normalizedSelectedIds.length === 0) {
    throw badRequestError('Select at least one product from the import list before importing.');
  }
  const idsToFetch = normalizedSelectedIds;
  const [products, catalogRepository, productRepository, imageRepository] =
    await Promise.all([
      idsToFetch.length > 0
        ? fetchBaseProductDetails(token, inventoryId, idsToFetch)
        : fetchBaseProducts(token, inventoryId, data.limit),
      getCatalogRepository(),
      getProductRepository(),
      getImageFileRepository()
    ]);

  let productsToImport = products;
  let existingSkus: Set<string> | null = null;
  const allowDuplicateSku = data.allowDuplicateSku ?? false;

  // Pre-fetch existing products for filtering
  if (data.uniqueOnly || !allowDuplicateSku) {
    const allProducts = await productRepository.getProducts({
      pageSize: 10000,
      page: 1
    });

    if (data.uniqueOnly) {
      const existingIds = new Set(
        allProducts
          .map((product: ProductWithImages) => product.baseProductId)
          .filter((id): id is string => typeof id === 'string')
      );

      const toStringId = (value: unknown): string | null => {
        if (typeof value === 'string' && value.trim()) return value.trim();
        if (typeof value === 'number' && Number.isFinite(value)) {
          return String(value);
        }
        return null;
      };

      productsToImport = products.filter((record) => {
        const baseProductId =
          toStringId((record as BaseRecord)['base_product_id']) ??
          toStringId((record as BaseRecord)['product_id']) ??
          toStringId((record as BaseRecord)['id']);
        return baseProductId ? !existingIds.has(baseProductId) : true;
      });
    }

    if (!allowDuplicateSku) {
      existingSkus = new Set(
        allProducts
          .map((product: ProductWithImages) => product.sku)
          .filter((sku): sku is string => typeof sku === 'string' && sku.trim() !== '')
      );
    }
  }

  const template = data.templateId
    ? await getImportTemplate(data.templateId)
    : null;
  if (data.templateId && !template) {
    throw notFoundError('Import template not found.');
  }

  const catalogs = await catalogRepository.listCatalogs();
  const defaultCatalog = catalogs.find((catalog) => catalog.isDefault);
  const targetCatalog = data.catalogId
    ? catalogs.find((catalog) => catalog.id === data.catalogId)
    : defaultCatalog;
  if (!targetCatalog) {
    throw notFoundError('Selected catalog not found.');
  }

  const pricingContext = await resolvePriceGroupContext(
    provider,
    targetCatalog.defaultPriceGroupId
  );
  if (!pricingContext.defaultPriceGroupId) {
    throw badRequestError('Default price group is required before importing products.');
  }
  const preferredPriceCurrencies = pricingContext.preferredCurrencies;

  const producerRepository = await getProducerRepository();
  const producers = await producerRepository.listProducers({});
  const producerIdSet = new Set(
    producers
      .map((producer: { id: string }) => producer.id?.trim())
      .filter((producerId: string | undefined): producerId is string => Boolean(producerId))
  );
  const producerNameToId = new Map(
    producers
      .map((producer: { id: string; name: string }) => {
        const normalizedName = typeof producer.name === 'string' ? producer.name.trim().toLowerCase() : '';
        const normalizedId = typeof producer.id === 'string' ? producer.id.trim() : '';
        if (!normalizedName || !normalizedId) return null;
        return [normalizedName, normalizedId] as const;
      })
      .filter((entry): entry is readonly [string, string] => entry !== null)
  );

  const resolveProducerIds = (values: string[] | undefined): string[] => {
    if (!Array.isArray(values) || values.length === 0) return [];
    const unique = new Set<string>();
    values.forEach((rawValue: string) => {
      const trimmed = rawValue.trim();
      if (!trimmed) return;
      if (producerIdSet.has(trimmed)) {
        unique.add(trimmed);
        return;
      }
      const byName = producerNameToId.get(trimmed.toLowerCase());
      if (byName) {
        unique.add(byName);
      }
    });
    return Array.from(unique);
  };

  const tagRepository = await getTagRepository();
  const tags = await tagRepository.listTags({});
  const tagIdSet = new Set(
    tags
      .map((tag: { id: string }) => tag.id?.trim())
      .filter((tagId: string | undefined): tagId is string => Boolean(tagId))
  );
  const tagNameToId = new Map(
    tags
      .map((tag: { id: string; name: string }) => {
        const normalizedName = typeof tag.name === 'string' ? tag.name.trim().toLowerCase() : '';
        const normalizedId = typeof tag.id === 'string' ? tag.id.trim() : '';
        if (!normalizedName || !normalizedId) return null;
        return [normalizedName, normalizedId] as const;
      })
      .filter((entry): entry is readonly [string, string] => entry !== null)
  );

  const externalTagToInternalTagId = new Map<string, string>();
  if (data.connectionId) {
    try {
      const tagMappingRepo = getTagMappingRepository();
      const tagMappings = await tagMappingRepo.listByConnection(data.connectionId);
      tagMappings.forEach((mapping) => {
        if (!mapping.isActive) return;
        const externalId = mapping.externalTag?.externalId?.trim();
        const internalId = mapping.internalTagId?.trim();
        if (!externalId || !internalId) return;
        externalTagToInternalTagId.set(externalId, internalId);
        externalTagToInternalTagId.set(externalId.toLowerCase(), internalId);
      });
    } catch {
      // Tag mappings are optional for imports; fallback to internal id/name resolution.
    }
  }

  const resolveTagIds = (values: string[] | undefined): string[] => {
    if (!Array.isArray(values) || values.length === 0) return [];
    const unique = new Set<string>();
    values.forEach((rawValue: string) => {
      const trimmed = rawValue.trim();
      if (!trimmed) return;
      const mappedExternal =
        externalTagToInternalTagId.get(trimmed) ??
        externalTagToInternalTagId.get(trimmed.toLowerCase());
      if (mappedExternal) {
        unique.add(mappedExternal);
        return;
      }
      if (tagIdSet.has(trimmed)) {
        unique.add(trimmed);
        return;
      }
      const byName = tagNameToId.get(trimmed.toLowerCase());
      if (byName) {
        unique.add(byName);
      }
    });
    return Array.from(unique);
  };

  let imported = 0;
  let failed = 0;
  let skipped = 0; // Skipped due to duplicate SKU
  const errors: string[] = [];

  const isSkuConflict = (error: unknown) => {
    if (!(error instanceof Error)) return false;
    return /sku/i.test(error.message) && /unique|duplicate/i.test(error.message);
  };

  const imageMode = data.imageMode ?? 'links';
  const maxImages = 15;

  const sanitizeSku = (value: string) =>
    value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

  const guessMimeType = (url: string) => {
    const lower = url.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    return 'image/jpeg';
  };

  const extractFilename = (url: string, fallback: string) => {
    try {
      const parsed = new URL(url);
      const base = path.basename(parsed.pathname);
      return base || fallback;
    } catch {
      return fallback;
    }
  };

  const downloadImage = async (url: string, sku: string, index: number) => {
    const res = await fetch(url);
    if (!res.ok) {
      throw externalServiceError(`Failed to download image (${res.status})`, { url, status: res.status });
    }    const contentType = res.headers.get('content-type') || guessMimeType(url);
    const buffer = Buffer.from(await res.arrayBuffer());
    const folderName = sku ? sanitizeSku(sku) : 'temp';
    const filename = `${Date.now()}-${index}-${extractFilename(url, 'image.jpg')}`;
    const diskDir = path.join(process.cwd(), 'public', 'uploads', 'products', folderName);
    const publicPath = `/uploads/products/${folderName}/${filename}`;
    await fs.mkdir(diskDir, { recursive: true });
    await fs.writeFile(path.join(diskDir, filename), buffer);
    return imageRepository.createImageFile({
      filename,
      filepath: publicPath,
      mimetype: contentType,
      size: buffer.length
    });
  };

  for (const raw of productsToImport) {
    try {
      const mapped = mapBaseProduct(raw, template?.mappings ?? [], {
        preferredPriceCurrencies,
      }) as ProductCreateInput & {
        producerIds?: string[];
        tagIds?: string[];
      };
      const mappedProducerIds = resolveProducerIds(mapped.producerIds);
      const mappedTagIds = resolveTagIds(mapped.tagIds);

      // Check for duplicate SKU if not allowed
      if (existingSkus && mapped.sku && existingSkus.has(mapped.sku)) {
        skipped += 1;
        if (errors.length < 10) {
          errors.push(`Skipped: SKU "${mapped.sku}" already exists`);
        }
        continue;
      }

      // mapped.imageLinks already contains base images + mapped overrides
      const imageUrls = (mapped.imageLinks ?? []).slice(0, maxImages);
      const validationResult = await validateProductCreate({
        ...mapped,
        defaultPriceGroupId: pricingContext.defaultPriceGroupId,
        imageLinks: imageUrls
      });
      
      if (!validationResult.success) {
        throw validationError(`Validation failed for product ${mapped.sku}`, { errors: validationResult.errors, sku: mapped.sku });
      }
      
      const payload = validationResult.data;
      const created = (await productRepository.createProduct(payload)) as unknown as ProductWithImages | null;
      if (!created && payload.sku) {
        throw internalError('Failed to create product.');
      }

      // Track newly added SKU to prevent duplicates within this import batch
      if (existingSkus && payload.sku) {
        existingSkus.add(payload.sku);
      }
      if (created) {
        await productRepository.replaceProductCatalogs(created.id, [
          targetCatalog.id
        ]);
        if (mappedProducerIds.length > 0) {
          await productRepository.replaceProductProducers(created.id, mappedProducerIds);
        }
        if (mappedTagIds.length > 0) {
          await productRepository.replaceProductTags(created.id, mappedTagIds);
        }
      }

      if (imageUrls.length > 0) {
        const imageFileIds: string[] = [];
        for (let i = 0; i < imageUrls.length; i += 1) {
          const url = imageUrls[i];
          if (!url) continue;
          try {
            if (imageMode === 'download') {
              const file = await downloadImage(url, payload.sku ?? (created?.id || 'unknown'), i + 1);
              imageFileIds.push(file.id);
            } else {
              const filename = extractFilename(url, `base-image-${i + 1}.jpg`);
              const file = await imageRepository.createImageFile({
                filename,
                filepath: url,
                mimetype: guessMimeType(url),
                size: 0
              });
              imageFileIds.push(file.id);
            }
          } catch (imageError) {
            const message =
              imageError instanceof Error
                ? imageError.message
                : 'Failed to import image.';
            if (errors.length < 10) {
              errors.push(message);
            }
          }
        }
        if (imageFileIds.length > 0 && created) {
          await productRepository.addProductImages(created.id, imageFileIds);
        }
      }
      if (created) {
        try {
          await linkImportedProductToBaseListing(
            created,
            payload.baseProductId ?? mapped.baseProductId
          );
        } catch (linkError) {
          const skuLabel = payload.sku ?? mapped.sku ?? created.id;
          const linkErrorMessage = linkError instanceof Error
            ? linkError.message
            : 'Failed to link imported product to Base.com listing.';
          if (errors.length < 10) {
            errors.push(`Imported ${skuLabel}, but failed to link Base.com listing: ${linkErrorMessage}`);
          }
        }
      }

      imported += 1;
    } catch (error: unknown) {
      let currentError = error;
      if (isSkuConflict(currentError)) {
        try {
          const mapped = mapBaseProduct(raw, template?.mappings ?? [], {
            preferredPriceCurrencies,
          }) as ProductCreateInput & {
            producerIds?: string[];
            tagIds?: string[];
          };
          const mappedProducerIds = resolveProducerIds(mapped.producerIds);
          const mappedTagIds = resolveTagIds(mapped.tagIds);
          const imageUrls = (mapped.imageLinks ?? []).slice(0, maxImages);
          const fallbackSku = mapped.baseProductId
            ? `BASE-${mapped.baseProductId}`
            : undefined;
          const validationResult = await validateProductCreate({
            ...mapped,
            sku: fallbackSku,
            defaultPriceGroupId: pricingContext.defaultPriceGroupId,
            imageLinks: imageUrls
          });
          
          if (!validationResult.success) {
            throw validationError('Validation failed for fallback product', { errors: validationResult.errors });
          }
          
          const payload = validationResult.data;
          const created = (await productRepository.createProduct(payload)) as unknown as ProductWithImages | null;
          if (created) {
            await productRepository.replaceProductCatalogs(created.id, [
              targetCatalog.id
            ]);
            if (mappedProducerIds.length > 0) {
              await productRepository.replaceProductProducers(created.id, mappedProducerIds);
            }
            if (mappedTagIds.length > 0) {
              await productRepository.replaceProductTags(created.id, mappedTagIds);
            }
          }

          if (imageUrls.length > 0) {
            const imageFileIds: string[] = [];
            for (let i = 0; i < imageUrls.length; i += 1) {
              const url = imageUrls[i];
              if (!url) continue;
              try {
                if (imageMode === 'download') {
                  const file = await downloadImage(
                    url,
                    payload.sku ?? (created?.id || 'unknown'),
                    i + 1
                  );
                  imageFileIds.push(file.id);
                } else {
                  const filename = extractFilename(url, `base-image-${i + 1}.jpg`);
                  const file = await imageRepository.createImageFile({
                    filename,
                    filepath: url,
                    mimetype: guessMimeType(url),
                    size: 0
                  });
                  imageFileIds.push(file.id);
                }
              } catch (imageError) {
                const message =
                  imageError instanceof Error
                    ? imageError.message
                    : 'Failed to import image.';
                if (errors.length < 10) {
                  errors.push(message);
                }
              }
            }
            if (imageFileIds.length > 0 && created) {
              await productRepository.addProductImages(created.id, imageFileIds);
            }
          }
          if (created) {
            try {
              await linkImportedProductToBaseListing(
                created,
                payload.baseProductId ?? mapped.baseProductId
              );
            } catch (linkError) {
              const skuLabel = payload.sku ?? mapped.sku ?? created.id;
              const linkErrorMessage = linkError instanceof Error
                ? linkError.message
                : 'Failed to link imported product to Base.com listing.';
              if (errors.length < 10) {
                errors.push(`Imported ${skuLabel}, but failed to link Base.com listing: ${linkErrorMessage}`);
              }
            }
          }

          imported += 1;
          continue;
        } catch (fallbackError) {
          currentError = fallbackError;
        }
      }
      failed += 1;
      const message =
        currentError instanceof Error ? currentError.message : 'Failed to import product.';
      if (errors.length < 10) {
        errors.push(message);
      }
    }
  }

  return NextResponse.json({
    imported,
    failed,
    skipped, // Products skipped due to duplicate SKU
    errors,
    total: productsToImport.length
  });
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { 
    source: 'products.imports.base.POST', 
    requireCsrf: false,
    parseJsonBody: true,
    bodySchema: requestSchema
  });
