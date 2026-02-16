import 'server-only';

import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import { getImageFileRepository } from '@/features/files/server';
import { resolveBaseConnectionToken } from '@/features/integrations/services/base-token-resolver';
import { getImportTemplate } from '@/features/integrations/services/import-template-repository';
import {
  fetchBaseProductDetails,
  fetchBaseProductIds,
  type BaseProductRecord,
} from '@/features/integrations/services/imports/base-client';
import {
  createBaseImportRun,
  getBaseImportRun,
  getBaseImportRunDetail,
  listBaseImportRunItems,
  listBaseImportRuns,
  putBaseImportRunItem,
  recomputeBaseImportRunStats,
  updateBaseImportRun,
  updateBaseImportRunItem,
  updateBaseImportRunStatus,
} from '@/features/integrations/services/imports/base-import-run-repository';
import { mapBaseProduct } from '@/features/integrations/services/imports/base-mapper';
import { getIntegrationRepository } from '@/features/integrations/services/integration-repository';
import {
  findProductListingByProductAndConnectionAcrossProviders,
  getProductListingRepository,
} from '@/features/integrations/services/product-listing-repository';
import { getTagMappingRepository } from '@/features/integrations/services/tag-mapping-repository';
import type {
  BaseImportErrorCode,
  BaseImportItemRecord,
  BaseImportItemStatus,
  BaseImportMode,
  BaseImportPreflight,
  BaseImportPreflightIssue,
  BaseImportRunDetailResponse,
  BaseImportRunParams,
  BaseImportRunRecord,
} from '@/features/integrations/types/base-import-runs';
import { getCatalogRepository } from '@/features/products/services/catalog-repository';
import { getProducerRepository } from '@/features/products/services/producer-repository';
import { getProductDataProvider } from '@/features/products/services/product-provider';
import { getProductRepository } from '@/features/products/services/product-repository';
import { getTagRepository } from '@/features/products/services/tag-repository';
import type { ProductRecord, ProductWithImages } from '@/features/products/types';
import {
  validateProductCreate,
  validateProductUpdate,
} from '@/features/products/validations';
import type {
  ProductCreateInput,
  ProductUpdateInput,
} from '@/features/products/validations/schemas';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

const BASE_DETAILS_BATCH_SIZE = 100;
const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);
const MAX_IMAGES_PER_PRODUCT = 15;

type PriceGroupLookup = {
  id: string;
  groupId?: string | null;
  currencyId?: string | null;
  currencyCode?: string | null;
  isDefault?: boolean;
};

type StartBaseImportRunInput = {
  connectionId?: string;
  inventoryId: string;
  catalogId: string;
  templateId?: string;
  limit?: number;
  imageMode: 'links' | 'download';
  uniqueOnly: boolean;
  allowDuplicateSku: boolean;
  selectedIds?: string[];
  dryRun?: boolean;
  mode?: BaseImportMode;
  requestId?: string;
};

type BaseConnectionContext = {
  baseIntegrationId: string | null;
  connectionId: string | null;
  token: string | null;
  issue: BaseImportPreflightIssue | null;
};

type ProductLookupMaps = {
  producerIdSet: Set<string>;
  producerNameToId: Map<string, string>;
  tagIdSet: Set<string>;
  tagNameToId: Map<string, string>;
  externalTagToInternalTagId: Map<string, string>;
};

type ImportDecision =
  | { type: 'create' }
  | { type: 'update'; target: ProductRecord }
  | { type: 'skip'; code: BaseImportErrorCode; message: string }
  | { type: 'fail'; code: BaseImportErrorCode; message: string };

type ProcessItemResult = {
  status: Exclude<BaseImportItemStatus, 'pending' | 'processing'>;
  action: BaseImportItemRecord['action'];
  importedProductId?: string | null;
  baseProductId?: string | null;
  sku?: string | null;
  errorCode?: BaseImportErrorCode | null;
  errorMessage?: string | null;
  payloadSnapshot?: ProductCreateInput | null;
};

type NormalizedMappedProduct = ProductCreateInput & {
  producerIds?: string[];
  tagIds?: string[];
};

const nowIso = (): string => new Date().toISOString();

const toStringId = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
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

const sanitizeSku = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

const guessMimeType = (url: string): string => {
  const lower = url.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/jpeg';
};

const extractFilename = (url: string, fallback: string): string => {
  try {
    const parsed = new URL(url);
    const base = path.basename(parsed.pathname);
    return base || fallback;
  } catch {
    return fallback;
  }
};

const isSkuConflictError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  return /sku/i.test(error.message) && /unique|duplicate|conflict/i.test(error.message);
};

const normalizeSelectedIds = (selectedIds: string[] | undefined): string[] =>
  Array.from(
    new Set(
      (selectedIds ?? [])
        .map((id: string) => id.trim())
        .filter((id: string) => id.length > 0)
    )
  );

const resolveMode = (mode: BaseImportMode | undefined): BaseImportMode =>
  mode ?? 'upsert_on_base_id';

const createRunIdempotencyKey = (
  params: BaseImportRunParams,
  ids: string[]
): string => {
  const hash = createHash('sha1');
  hash.update(
    JSON.stringify({
      connectionId: params.connectionId ?? null,
      inventoryId: params.inventoryId,
      catalogId: params.catalogId,
      templateId: params.templateId ?? null,
      imageMode: params.imageMode,
      uniqueOnly: params.uniqueOnly,
      allowDuplicateSku: params.allowDuplicateSku,
      dryRun: params.dryRun ?? false,
      mode: params.mode ?? 'upsert_on_base_id',
      requestId: params.requestId ?? null,
      ids,
    })
  );
  return hash.digest('hex');
};

const resolvePriceGroupContext = async (
  provider: Awaited<ReturnType<typeof getProductDataProvider>>,
  preferredPriceGroupId?: string | null
): Promise<{ defaultPriceGroupId: string | null; preferredCurrencies: string[] }> => {
  const projectedFields = {
    id: 1,
    groupId: 1,
    currencyId: 1,
    currencyCode: 1,
  } as const;

  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const priceGroupCollection = mongo.collection<PriceGroupLookup>('price_groups');
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
                { code: resolved.currencyId },
              ],
            },
            { projection: { code: 1, id: 1 } }
          );
        addCurrencyCandidate(preferredCurrencies, currency?.code);
      } catch {
        // Currency lookup is optional during import.
      }
    }

    return {
      defaultPriceGroupId: resolved.id,
      preferredCurrencies: Array.from(preferredCurrencies),
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

const resolveBaseConnectionContext = async (
  requestedConnectionId: string | undefined
): Promise<BaseConnectionContext> => {
  const normalizedConnectionId = requestedConnectionId?.trim() || null;
  if (!normalizedConnectionId) {
    return {
      baseIntegrationId: null,
      connectionId: null,
      token: null,
      issue: {
        code: 'MISSING_CONNECTION',
        severity: 'error',
        message: 'Base.com connection is required.',
      },
    };
  }

  const integrationRepo = await getIntegrationRepository();
  const integrations = await integrationRepo.listIntegrations();
  const baseIntegration = integrations.find((integration) =>
    BASE_INTEGRATION_SLUGS.has((integration.slug ?? '').trim().toLowerCase())
  );

  if (!baseIntegration) {
    return {
      baseIntegrationId: null,
      connectionId: normalizedConnectionId,
      token: null,
      issue: {
        code: 'MISSING_CONNECTION',
        severity: 'error',
        message: 'Base.com integration is not configured.',
      },
    };
  }

  const connection = await integrationRepo.getConnectionByIdAndIntegration(
    normalizedConnectionId,
    baseIntegration.id
  );

  if (!connection) {
    return {
      baseIntegrationId: baseIntegration.id,
      connectionId: normalizedConnectionId,
      token: null,
      issue: {
        code: 'MISSING_CONNECTION',
        severity: 'error',
        message: 'Selected Base.com connection was not found.',
      },
    };
  }

  const tokenResolution = resolveBaseConnectionToken(connection);
  if (!tokenResolution.token) {
    return {
      baseIntegrationId: baseIntegration.id,
      connectionId: normalizedConnectionId,
      token: null,
      issue: {
        code: 'MISSING_CONNECTION',
        severity: 'error',
        message:
          tokenResolution.error ??
          'Base.com connection has no valid API token. Re-save the connection.',
      },
    };
  }

  return {
    baseIntegrationId: baseIntegration.id,
    connectionId: normalizedConnectionId,
    token: tokenResolution.token,
    issue: null,
  };
};

const resolveProducerAndTagLookups = async (
  connectionId: string
): Promise<ProductLookupMaps> => {
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
        const normalizedName =
          typeof producer.name === 'string'
            ? producer.name.trim().toLowerCase()
            : '';
        const normalizedId =
          typeof producer.id === 'string' ? producer.id.trim() : '';
        if (!normalizedName || !normalizedId) return null;
        return [normalizedName, normalizedId] as const;
      })
      .filter((entry): entry is readonly [string, string] => entry !== null)
  );

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
        const normalizedName =
          typeof tag.name === 'string' ? tag.name.trim().toLowerCase() : '';
        const normalizedId = typeof tag.id === 'string' ? tag.id.trim() : '';
        if (!normalizedName || !normalizedId) return null;
        return [normalizedName, normalizedId] as const;
      })
      .filter((entry): entry is readonly [string, string] => entry !== null)
  );

  const externalTagToInternalTagId = new Map<string, string>();
  try {
    const tagMappingRepo = getTagMappingRepository();
    const tagMappings = await tagMappingRepo.listByConnection(connectionId);
    tagMappings.forEach((mapping) => {
      if (!mapping.isActive) return;
      const externalId = mapping.externalTag?.externalId?.trim();
      const internalId = mapping.internalTagId?.trim();
      if (!externalId || !internalId) return;
      externalTagToInternalTagId.set(externalId, internalId);
      externalTagToInternalTagId.set(externalId.toLowerCase(), internalId);
    });
  } catch {
    // Optional mapping data.
  }

  return {
    producerIdSet,
    producerNameToId,
    tagIdSet,
    tagNameToId,
    externalTagToInternalTagId,
  };
};

const resolveProducerIds = (
  values: string[] | undefined,
  lookups: ProductLookupMaps
): string[] => {
  if (!Array.isArray(values) || values.length === 0) return [];
  const unique = new Set<string>();
  values.forEach((rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed) return;
    if (lookups.producerIdSet.has(trimmed)) {
      unique.add(trimmed);
      return;
    }
    const byName = lookups.producerNameToId.get(trimmed.toLowerCase());
    if (byName) unique.add(byName);
  });
  return Array.from(unique);
};

const resolveTagIds = (
  values: string[] | undefined,
  lookups: ProductLookupMaps
): string[] => {
  if (!Array.isArray(values) || values.length === 0) return [];
  const unique = new Set<string>();
  values.forEach((rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed) return;

    const mappedExternal =
      lookups.externalTagToInternalTagId.get(trimmed) ??
      lookups.externalTagToInternalTagId.get(trimmed.toLowerCase());
    if (mappedExternal) {
      unique.add(mappedExternal);
      return;
    }

    if (lookups.tagIdSet.has(trimmed)) {
      unique.add(trimmed);
      return;
    }

    const byName = lookups.tagNameToId.get(trimmed.toLowerCase());
    if (byName) unique.add(byName);
  });
  return Array.from(unique);
};

const buildSummaryMessage = (
  stats: BaseImportRunRecord['stats'],
  dryRun: boolean
): string => {
  const prefix = dryRun ? 'Dry-run completed' : 'Import completed';
  return `${prefix}: ${stats.imported} imported, ${stats.updated} updated, ${stats.skipped} skipped, ${stats.failed} failed.`;
};

const mapErrorCode = (error: unknown): BaseImportErrorCode => {
  if (!(error instanceof Error)) return 'UNEXPECTED_ERROR';
  const message = error.message.toLowerCase();

  if (message.includes('validation')) return 'VALIDATION_ERROR';
  if (message.includes('duplicate') && message.includes('sku')) return 'DUPLICATE_SKU';
  if (message.includes('sku') && message.includes('unique')) return 'DUPLICATE_SKU';
  if (message.includes('base') && message.includes('fetch')) return 'BASE_FETCH_ERROR';
  if (message.includes('missing') && message.includes('base')) return 'MISSING_BASE_ID';
  if (message.includes('missing') && message.includes('sku')) return 'MISSING_SKU';
  if (message.includes('catalog')) return 'MISSING_CATALOG';
  if (message.includes('price group')) return 'MISSING_PRICE_GROUP';
  if (message.includes('link')) return 'LINKING_ERROR';
  if (message.includes('conflict')) return 'CONFLICT';

  return 'UNEXPECTED_ERROR';
};

const fetchDetailsMap = async (
  token: string,
  inventoryId: string,
  ids: string[]
): Promise<Map<string, BaseProductRecord>> => {
  const map = new Map<string, BaseProductRecord>();
  for (let index = 0; index < ids.length; index += BASE_DETAILS_BATCH_SIZE) {
    const batch = ids.slice(index, index + BASE_DETAILS_BATCH_SIZE);
    if (batch.length === 0) continue;
    const records = await fetchBaseProductDetails(token, inventoryId, batch);
    records.forEach((record: BaseProductRecord) => {
      const recordId =
        toStringId(record['base_product_id']) ??
        toStringId(record['product_id']) ??
        toStringId(record['id']);
      if (recordId) {
        map.set(recordId, record);
      }
    });
  }
  return map;
};

const downloadImage = async (
  url: string,
  sku: string,
  index: number
): Promise<Awaited<ReturnType<Awaited<ReturnType<typeof getImageFileRepository>>['createImageFile']>>> => {
  const imageRepository = await getImageFileRepository();
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image (${response.status})`);
  }

  const contentType = response.headers.get('content-type') || guessMimeType(url);
  const buffer = Buffer.from(await response.arrayBuffer());
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
    size: buffer.length,
  });
};

const createLinkedImage = async (
  url: string,
  index: number
): Promise<Awaited<ReturnType<Awaited<ReturnType<typeof getImageFileRepository>>['createImageFile']>>> => {
  const imageRepository = await getImageFileRepository();
  const filename = extractFilename(url, `base-image-${index}.jpg`);
  return imageRepository.createImageFile({
    filename,
    filepath: url,
    mimetype: guessMimeType(url),
    size: 0,
  });
};

const linkImportedProductToBaseListing = async (input: {
  product: ProductWithImages | ProductRecord;
  baseIntegrationId: string;
  connectionId: string;
  inventoryId: string;
  baseProductId: string | null | undefined;
}): Promise<void> => {
  const normalizedBaseProductId = input.baseProductId?.trim() || '';
  if (!normalizedBaseProductId) return;

  const existingListing =
    await findProductListingByProductAndConnectionAcrossProviders(
      input.product.id,
      input.connectionId
    );

  if (existingListing) {
    if (existingListing.listing.externalListingId !== normalizedBaseProductId) {
      await existingListing.repository.updateListingExternalId(
        existingListing.listing.id,
        normalizedBaseProductId
      );
    }
    if ((existingListing.listing.inventoryId ?? null) !== input.inventoryId) {
      await existingListing.repository.updateListingInventoryId(
        existingListing.listing.id,
        input.inventoryId
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
    productId: input.product.id,
    integrationId: input.baseIntegrationId,
    connectionId: input.connectionId,
    status: 'active',
    externalListingId: normalizedBaseProductId,
    inventoryId: input.inventoryId,
    marketplaceData: { source: 'base-import' },
  });
  await listingRepository.updateListingStatus(createdListing.id, 'active');
};

const resolveUniqueSku = async (
  productRepository: Awaited<ReturnType<typeof getProductRepository>>,
  baseProductId: string | null,
  fallbackSeed: string
): Promise<string> => {
  const normalizedSeed = sanitizeSku(fallbackSeed) || 'BASE';
  const candidates: string[] = [];
  if (baseProductId) {
    candidates.push(`BASE-${sanitizeSku(baseProductId)}`);
  }
  candidates.push(normalizedSeed);

  const base = candidates[0] ?? 'BASE';
  for (let index = 0; index < 1000; index += 1) {
    const candidate = index === 0 ? base : `${base}-${index}`;
    const existing = await productRepository.getProductBySku(candidate);
    if (!existing) return candidate;
  }
  return `BASE-${Date.now()}`;
};

const decideImportAction = (input: {
  mode: BaseImportMode;
  allowDuplicateSku: boolean;
  mappedBaseProductId: string | null;
  mappedSku: string | null;
  existingByBaseId: ProductRecord | null;
  existingBySku: ProductRecord | null;
}): ImportDecision => {
  const {
    mode,
    allowDuplicateSku,
    mappedBaseProductId,
    mappedSku,
    existingByBaseId,
    existingBySku,
  } = input;

  if (mode === 'create_only') {
    if (existingByBaseId) {
      return {
        type: 'skip',
        code: 'CONFLICT',
        message: `Product with Base ID ${mappedBaseProductId ?? 'unknown'} already exists.`,
      };
    }
    if (existingBySku && !allowDuplicateSku) {
      return {
        type: 'skip',
        code: 'DUPLICATE_SKU',
        message: `SKU ${mappedSku ?? 'unknown'} already exists.`,
      };
    }
    return { type: 'create' };
  }

  if (mode === 'upsert_on_base_id') {
    if (!mappedBaseProductId) {
      return {
        type: 'fail',
        code: 'MISSING_BASE_ID',
        message: 'Missing Base product ID for upsert_on_base_id mode.',
      };
    }

    if (existingByBaseId) {
      if (
        existingBySku &&
        existingBySku.id !== existingByBaseId.id &&
        !allowDuplicateSku
      ) {
        return {
          type: 'skip',
          code: 'CONFLICT',
          message: `SKU ${mappedSku ?? 'unknown'} belongs to a different product.`,
        };
      }
      return { type: 'update', target: existingByBaseId };
    }

    if (existingBySku && !allowDuplicateSku) {
      return {
        type: 'skip',
        code: 'DUPLICATE_SKU',
        message: `SKU ${mappedSku ?? 'unknown'} already exists.`,
      };
    }

    return { type: 'create' };
  }

  if (!mappedSku) {
    return {
      type: 'fail',
      code: 'MISSING_SKU',
      message: 'Missing SKU for upsert_on_sku mode.',
    };
  }

  if (existingBySku) {
    if (existingByBaseId && existingByBaseId.id !== existingBySku.id) {
      return {
        type: 'skip',
        code: 'CONFLICT',
        message: 'Base ID and SKU refer to different existing products.',
      };
    }
    return { type: 'update', target: existingBySku };
  }

  if (existingByBaseId && !allowDuplicateSku) {
    return {
      type: 'skip',
      code: 'CONFLICT',
      message: 'Base ID already exists on another product.',
    };
  }

  return { type: 'create' };
};

const markRunItem = async (
  runId: string,
  item: BaseImportItemRecord,
  patch: Partial<BaseImportItemRecord>
): Promise<void> => {
  await updateBaseImportRunItem(runId, item.itemId, patch);
  await recomputeBaseImportRunStats(runId);
};

const pickMappedSku = (mapped: NormalizedMappedProduct): string | null => {
  const rawSku = typeof mapped.sku === 'string' ? mapped.sku.trim() : '';
  return rawSku.length > 0 ? rawSku : null;
};

const normalizeMappedProduct = (record: BaseProductRecord, mappings: Array<{ sourceKey: string; targetField: string }>, preferredCurrencies: string[]): NormalizedMappedProduct => {
  const mapped = mapBaseProduct(record, mappings, {
    preferredPriceCurrencies: preferredCurrencies,
  }) as NormalizedMappedProduct;

  const sku = pickMappedSku(mapped);
  mapped.sku = sku ?? '';
  return mapped;
};

const importSingleItem = async (input: {
  run: BaseImportRunRecord;
  item: BaseImportItemRecord;
  raw: BaseProductRecord;
  baseIntegrationId: string;
  connectionId: string;
  token: string;
  targetCatalogId: string;
  defaultPriceGroupId: string;
  preferredPriceCurrencies: string[];
  lookups: ProductLookupMaps;
  templateMappings: Array<{ sourceKey: string; targetField: string }>;
  productRepository: Awaited<ReturnType<typeof getProductRepository>>;
  imageMode: 'links' | 'download';
  dryRun: boolean;
  inventoryId: string;
  mode: BaseImportMode;
  allowDuplicateSku: boolean;
}): Promise<ProcessItemResult> => {
  const mapped = normalizeMappedProduct(
    input.raw,
    input.templateMappings,
    input.preferredPriceCurrencies
  );
  const mappedProducerIds = resolveProducerIds(mapped.producerIds, input.lookups);
  const mappedTagIds = resolveTagIds(mapped.tagIds, input.lookups);
  const imageUrls = (mapped.imageLinks ?? []).slice(0, MAX_IMAGES_PER_PRODUCT);

  const mappedBaseProductId =
    mapped.baseProductId?.trim() ||
    toStringId(input.raw['base_product_id']) ||
    toStringId(input.raw['product_id']) ||
    toStringId(input.raw['id']);
  const mappedSku = pickMappedSku(mapped);

  const existingByBaseId = mappedBaseProductId
    ? await input.productRepository.findProductByBaseId(mappedBaseProductId)
    : null;
  const existingBySku = mappedSku
    ? await input.productRepository.getProductBySku(mappedSku)
    : null;

  const decision = decideImportAction({
    mode: input.mode,
    allowDuplicateSku: input.allowDuplicateSku,
    mappedBaseProductId,
    mappedSku,
    existingByBaseId,
    existingBySku,
  });

  if (decision.type === 'skip') {
    return {
      status: 'skipped',
      action: input.dryRun ? 'dry_run' : 'skipped',
      baseProductId: mappedBaseProductId,
      sku: mappedSku,
      errorCode: decision.code,
      errorMessage: decision.message,
      payloadSnapshot: mapped,
    };
  }

  if (decision.type === 'fail') {
    return {
      status: 'failed',
      action: 'failed',
      baseProductId: mappedBaseProductId,
      sku: mappedSku,
      errorCode: decision.code,
      errorMessage: decision.message,
      payloadSnapshot: mapped,
    };
  }

  if (decision.type === 'update') {
    const updateData: ProductUpdateInput = {
      baseProductId: mappedBaseProductId ?? decision.target.baseProductId ?? null,
      defaultPriceGroupId: input.defaultPriceGroupId,
      sku: mappedSku ?? undefined,
      name_en: mapped.name_en,
      name_pl: mapped.name_pl,
      name_de: mapped.name_de,
      description_en: mapped.description_en,
      description_pl: mapped.description_pl,
      description_de: mapped.description_de,
      price: mapped.price,
      stock: mapped.stock,
      weight: mapped.weight,
      sizeLength: mapped.sizeLength,
      sizeWidth: mapped.sizeWidth,
      length: mapped.length,
      imageLinks: imageUrls,
    };

    if (mappedSku && !input.allowDuplicateSku && mappedSku !== decision.target.sku) {
      const skuOwner = await input.productRepository.getProductBySku(mappedSku);
      if (skuOwner && skuOwner.id !== decision.target.id) {
        return {
          status: 'skipped',
          action: input.dryRun ? 'dry_run' : 'skipped',
          baseProductId: mappedBaseProductId,
          sku: mappedSku,
          errorCode: 'DUPLICATE_SKU',
          errorMessage: `SKU ${mappedSku} already belongs to another product.`,
          payloadSnapshot: mapped,
        };
      }
    }

    const validationResult = await validateProductUpdate(updateData);
    if (!validationResult.success) {
      return {
        status: 'failed',
        action: 'failed',
        baseProductId: mappedBaseProductId,
        sku: mappedSku,
        errorCode: 'VALIDATION_ERROR',
        errorMessage: `Validation failed for ${mappedSku ?? mappedBaseProductId ?? input.item.itemId}.`,
        payloadSnapshot: mapped,
      };
    }

    if (input.dryRun) {
      return {
        status: 'updated',
        action: 'dry_run',
        importedProductId: decision.target.id,
        baseProductId: mappedBaseProductId,
        sku: mappedSku,
        payloadSnapshot: mapped,
      };
    }

    const updated = await input.productRepository.updateProduct(
      decision.target.id,
      validationResult.data
    );

    if (!updated) {
      throw new Error(`Failed to update product ${decision.target.id}`);
    }

    await input.productRepository.replaceProductCatalogs(updated.id, [
      input.targetCatalogId,
    ]);
    if (mappedProducerIds.length > 0) {
      await input.productRepository.replaceProductProducers(updated.id, mappedProducerIds);
    }
    if (mappedTagIds.length > 0) {
      await input.productRepository.replaceProductTags(updated.id, mappedTagIds);
    }

    if (imageUrls.length > 0) {
      const imageFileIds: string[] = [];
      for (let index = 0; index < imageUrls.length; index += 1) {
        const url = imageUrls[index];
        if (!url) continue;
        const file =
          input.imageMode === 'download'
            ? await downloadImage(url, mappedSku ?? updated.id, index + 1)
            : await createLinkedImage(url, index + 1);
        imageFileIds.push(file.id);
      }
      if (imageFileIds.length > 0) {
        await input.productRepository.replaceProductImages(updated.id, imageFileIds);
      }
    }

    await linkImportedProductToBaseListing({
      product: updated,
      baseIntegrationId: input.baseIntegrationId,
      connectionId: input.connectionId,
      inventoryId: input.inventoryId,
      baseProductId: mappedBaseProductId,
    });

    return {
      status: 'updated',
      action: 'updated',
      importedProductId: updated.id,
      baseProductId: mappedBaseProductId,
      sku: mappedSku,
      payloadSnapshot: mapped,
    };
  }

  let skuForCreate = mappedSku;
  if (!skuForCreate) {
    return {
      status: 'failed',
      action: 'failed',
      baseProductId: mappedBaseProductId,
      sku: mappedSku,
      errorCode: 'MISSING_SKU',
      errorMessage: 'Cannot create product without SKU.',
      payloadSnapshot: mapped,
    };
  }

  if (existingBySku && input.allowDuplicateSku) {
    skuForCreate = await resolveUniqueSku(
      input.productRepository,
      mappedBaseProductId,
      `BASE-${mappedBaseProductId ?? skuForCreate}`
    );
  }

  const createData: ProductCreateInput = {
    ...mapped,
    sku: skuForCreate,
    baseProductId: mappedBaseProductId ?? undefined,
    defaultPriceGroupId: input.defaultPriceGroupId,
    imageLinks: imageUrls,
  };

  const validationResult = await validateProductCreate(createData);
  if (!validationResult.success) {
    return {
      status: 'failed',
      action: 'failed',
      baseProductId: mappedBaseProductId,
      sku: skuForCreate,
      errorCode: 'VALIDATION_ERROR',
      errorMessage: `Validation failed for ${skuForCreate}.`,
      payloadSnapshot: mapped,
    };
  }

  if (input.dryRun) {
    return {
      status: 'imported',
      action: 'dry_run',
      baseProductId: mappedBaseProductId,
      sku: skuForCreate,
      payloadSnapshot: mapped,
    };
  }

  let created: ProductRecord | null = null;
  try {
    created = await input.productRepository.createProduct(validationResult.data);
  } catch (error: unknown) {
    if (isSkuConflictError(error) && input.allowDuplicateSku) {
      const fallbackSku = await resolveUniqueSku(
        input.productRepository,
        mappedBaseProductId,
        `BASE-${mappedBaseProductId ?? skuForCreate}`
      );
      const fallbackValidation = await validateProductCreate({
        ...createData,
        sku: fallbackSku,
      });
      if (!fallbackValidation.success) {
        throw new Error(`Validation failed for fallback SKU ${fallbackSku}`);
      }
      created = await input.productRepository.createProduct(fallbackValidation.data);
      skuForCreate = fallbackSku;
    } else {
      throw error;
    }
  }

  if (!created) {
    throw new Error('Failed to create product.');
  }

  await input.productRepository.replaceProductCatalogs(created.id, [
    input.targetCatalogId,
  ]);
  if (mappedProducerIds.length > 0) {
    await input.productRepository.replaceProductProducers(created.id, mappedProducerIds);
  }
  if (mappedTagIds.length > 0) {
    await input.productRepository.replaceProductTags(created.id, mappedTagIds);
  }

  if (imageUrls.length > 0) {
    const imageFileIds: string[] = [];
    for (let index = 0; index < imageUrls.length; index += 1) {
      const url = imageUrls[index];
      if (!url) continue;
      const file =
        input.imageMode === 'download'
          ? await downloadImage(url, skuForCreate, index + 1)
          : await createLinkedImage(url, index + 1);
      imageFileIds.push(file.id);
    }
    if (imageFileIds.length > 0) {
      await input.productRepository.addProductImages(created.id, imageFileIds);
    }
  }

  await linkImportedProductToBaseListing({
    product: created,
    baseIntegrationId: input.baseIntegrationId,
    connectionId: input.connectionId,
    inventoryId: input.inventoryId,
    baseProductId: mappedBaseProductId,
  });

  return {
    status: 'imported',
    action: 'imported',
    importedProductId: created.id,
    baseProductId: mappedBaseProductId,
    sku: skuForCreate,
    payloadSnapshot: mapped,
  };
};

const buildPreflight = async (
  input: StartBaseImportRunInput,
  connection: BaseConnectionContext
): Promise<{ preflight: BaseImportPreflight; catalogExists: boolean; hasPriceGroup: boolean }> => {
  const issues: BaseImportPreflightIssue[] = [];
  const checkedAt = nowIso();

  if (!input.inventoryId?.trim()) {
    issues.push({
      code: 'PRECHECK_FAILED',
      severity: 'error',
      message: 'Inventory ID is required.',
    });
  }

  if (connection.issue) {
    issues.push(connection.issue);
  }

  const catalogRepository = await getCatalogRepository();
  const catalogs = await catalogRepository.listCatalogs();
  const targetCatalog = catalogs.find((catalog) => catalog.id === input.catalogId);
  if (!targetCatalog) {
    issues.push({
      code: 'MISSING_CATALOG',
      severity: 'error',
      message: 'Selected catalog does not exist.',
    });
  }

  let hasPriceGroup = false;
  if (targetCatalog) {
    const provider = await getProductDataProvider();
    const pricingContext = await resolvePriceGroupContext(
      provider,
      targetCatalog.defaultPriceGroupId
    );
    hasPriceGroup = Boolean(pricingContext.defaultPriceGroupId);
    if (!hasPriceGroup) {
      issues.push({
        code: 'MISSING_PRICE_GROUP',
        severity: 'error',
        message: 'Catalog default price group is not configured.',
      });
    }
  }

  if (Array.isArray(input.selectedIds) && normalizeSelectedIds(input.selectedIds).length === 0) {
    issues.push({
      code: 'PRECHECK_FAILED',
      severity: 'error',
      message: 'Select at least one Base product before importing.',
    });
  }

  return {
    preflight: {
      ok: issues.every((issue) => issue.severity !== 'error'),
      issues,
      checkedAt,
    },
    catalogExists: Boolean(targetCatalog),
    hasPriceGroup,
  };
};

const resolveRunItems = async (input: {
  token: string;
  inventoryId: string;
  selectedIds?: string[];
  limit?: number;
  uniqueOnly: boolean;
}): Promise<string[]> => {
  const selected = normalizeSelectedIds(input.selectedIds);
  let ids =
    selected.length > 0
      ? selected
      : await fetchBaseProductIds(input.token, input.inventoryId);

  if (selected.length === 0 && typeof input.limit === 'number' && input.limit > 0) {
    ids = ids.slice(0, input.limit);
  }

  if (!input.uniqueOnly || ids.length === 0) {
    return ids;
  }

  const productRepository = await getProductRepository();
  const existingProducts = await productRepository.getProducts({ page: 1, pageSize: 10_000 });
  const existingBaseIds = new Set(
    existingProducts
      .map((product: ProductWithImages) => product.baseProductId?.trim())
      .filter((value: string | undefined): value is string => Boolean(value))
  );

  return ids.filter((id: string) => !existingBaseIds.has(id));
};

export const prepareBaseImportRun = async (
  input: StartBaseImportRunInput
): Promise<BaseImportRunRecord> => {
  const normalizedConnectionId = input.connectionId?.trim() || '';
  const normalizedTemplateId = input.templateId?.trim() || '';
  const normalizedRequestId = input.requestId?.trim() || '';
  const normalizedSelectedIds = normalizeSelectedIds(input.selectedIds);
  const normalizedLimit =
    typeof input.limit === 'number' && Number.isFinite(input.limit)
      ? Math.max(1, Math.floor(input.limit))
      : null;

  const normalizedParams: BaseImportRunParams = {
    inventoryId: input.inventoryId.trim(),
    catalogId: input.catalogId.trim(),
    imageMode: input.imageMode,
    uniqueOnly: input.uniqueOnly,
    allowDuplicateSku: input.allowDuplicateSku,
    dryRun: input.dryRun ?? false,
    mode: resolveMode(input.mode),
    ...(normalizedConnectionId ? { connectionId: normalizedConnectionId } : {}),
    ...(normalizedTemplateId ? { templateId: normalizedTemplateId } : {}),
    ...(normalizedLimit !== null ? { limit: normalizedLimit } : {}),
    ...(normalizedSelectedIds.length > 0
      ? { selectedIds: normalizedSelectedIds }
      : {}),
    ...(normalizedRequestId ? { requestId: normalizedRequestId } : {}),
  };

  const connection = await resolveBaseConnectionContext(normalizedParams.connectionId);
  const preflightResult = await buildPreflight(input, connection);

  if (!preflightResult.preflight.ok || !connection.token) {
    return createBaseImportRun({
      params: normalizedParams,
      preflight: preflightResult.preflight,
      summaryMessage: 'Preflight failed. Resolve errors and retry import.',
      totalItems: 0,
    });
  }

  const ids = await resolveRunItems({
    token: connection.token,
    inventoryId: normalizedParams.inventoryId,
    uniqueOnly: normalizedParams.uniqueOnly,
    ...(normalizedParams.selectedIds
      ? { selectedIds: normalizedParams.selectedIds }
      : {}),
    ...(typeof normalizedParams.limit === 'number'
      ? { limit: normalizedParams.limit }
      : {}),
  });

  const idempotencyKey = createRunIdempotencyKey(normalizedParams, ids);

  const recentRuns = await listBaseImportRuns(100);
  const existing = recentRuns.find((run) => {
    if (run.idempotencyKey !== idempotencyKey) return false;
    if (run.status === 'failed' || run.status === 'canceled') return false;
    const createdAtMs = new Date(run.createdAt).getTime();
    if (!Number.isFinite(createdAtMs)) return false;
    return Date.now() - createdAtMs < 30 * 60_000;
  });

  if (existing) {
    return existing;
  }

  const run = await createBaseImportRun({
    params: normalizedParams,
    preflight: preflightResult.preflight,
    idempotencyKey,
    totalItems: ids.length,
    summaryMessage:
      ids.length === 0
        ? 'No products matched current import filters.'
        : `Queued ${ids.length} products for import.`,
  });

  if (ids.length === 0) {
    return updateBaseImportRunStatus(run.id, 'completed', {
      stats: {
        total: 0,
        pending: 0,
        processing: 0,
        imported: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
      },
      summaryMessage: 'No products matched current import filters.',
      finishedAt: nowIso(),
    });
  }

  const createdAt = nowIso();
  for (const itemId of ids) {
    await putBaseImportRunItem({
      runId: run.id,
      itemId,
      baseProductId: itemId,
      sku: null,
      status: 'pending',
      attempt: 0,
      idempotencyKey: `${run.id}:${itemId}`,
      action: 'pending',
      errorCode: null,
      errorMessage: null,
      importedProductId: null,
      payloadSnapshot: null,
      createdAt,
      updatedAt: createdAt,
      startedAt: null,
      finishedAt: null,
    });
  }

  return recomputeBaseImportRunStats(run.id);
};

const failRemainingItems = async (input: {
  runId: string;
  allowedStatuses: Set<BaseImportItemStatus>;
  code: BaseImportErrorCode;
  message: string;
}): Promise<void> => {
  const items = await listBaseImportRunItems(input.runId);
  const now = nowIso();
  for (const item of items) {
    if (!input.allowedStatuses.has(item.status)) continue;
    await updateBaseImportRunItem(input.runId, item.itemId, {
      status: 'failed',
      action: 'failed',
      errorCode: input.code,
      errorMessage: input.message,
      finishedAt: now,
    });
  }
  await recomputeBaseImportRunStats(input.runId);
};

export const processBaseImportRun = async (
  runId: string,
  options?: {
    allowedStatuses?: BaseImportItemStatus[];
    jobId?: string;
  }
): Promise<BaseImportRunRecord> => {
  const run = await getBaseImportRun(runId);
  if (!run) {
    throw notFoundError('Base import run not found.', { runId });
  }

  const allowedStatuses = new Set<BaseImportItemStatus>(
    options?.allowedStatuses && options.allowedStatuses.length > 0
      ? options.allowedStatuses
      : ['pending']
  );

  const allItems = await listBaseImportRunItems(runId);
  const items = allItems.filter((item) => allowedStatuses.has(item.status));

  if (items.length === 0) {
    const refreshed = await recomputeBaseImportRunStats(runId);
    const alreadyFinished =
      refreshed.status === 'completed' ||
      refreshed.status === 'failed' ||
      refreshed.status === 'canceled';
    if (alreadyFinished) return refreshed;

    return updateBaseImportRunStatus(runId, 'completed', {
      summaryMessage: buildSummaryMessage(refreshed.stats, Boolean(run.params.dryRun)),
    });
  }

  await updateBaseImportRunStatus(runId, 'running', {
    queueJobId: options?.jobId ?? run.queueJobId ?? null,
    summaryMessage: `Processing ${items.length} product(s).`,
  });

  const connection = await resolveBaseConnectionContext(run.params.connectionId);
  if (!connection.token || !connection.connectionId || !connection.baseIntegrationId) {
    await failRemainingItems({
      runId,
      allowedStatuses,
      code: 'MISSING_CONNECTION',
      message:
        connection.issue?.message ??
        'Base.com connection or token is missing.',
    });
    return updateBaseImportRunStatus(runId, 'failed', {
      summaryMessage: 'Import failed: Base.com connection is not available.',
    });
  }

  const catalogRepository = await getCatalogRepository();
  const catalogs = await catalogRepository.listCatalogs();
  const targetCatalog = catalogs.find((catalog) => catalog.id === run.params.catalogId);
  if (!targetCatalog) {
    await failRemainingItems({
      runId,
      allowedStatuses,
      code: 'MISSING_CATALOG',
      message: 'Selected catalog no longer exists.',
    });
    return updateBaseImportRunStatus(runId, 'failed', {
      summaryMessage: 'Import failed: selected catalog no longer exists.',
    });
  }

  const provider = await getProductDataProvider();
  const pricingContext = await resolvePriceGroupContext(
    provider,
    targetCatalog.defaultPriceGroupId
  );
  if (!pricingContext.defaultPriceGroupId) {
    await failRemainingItems({
      runId,
      allowedStatuses,
      code: 'MISSING_PRICE_GROUP',
      message: 'Catalog default price group is missing.',
    });
    return updateBaseImportRunStatus(runId, 'failed', {
      summaryMessage: 'Import failed: configure catalog default price group.',
    });
  }

  const template = run.params.templateId
    ? await getImportTemplate(run.params.templateId)
    : null;

  const lookups = await resolveProducerAndTagLookups(connection.connectionId);
  const detailsMap = await fetchDetailsMap(
    connection.token,
    run.params.inventoryId,
    items.map((item) => item.itemId)
  );

  const productRepository = await getProductRepository();
  const templateMappings = Array.isArray(template?.mappings) ? template.mappings : [];

  for (const item of items) {
    await markRunItem(runId, item, {
      status: 'processing',
      action: 'processing',
      attempt: item.attempt + 1,
      startedAt: nowIso(),
      errorCode: null,
      errorMessage: null,
    });

    const raw = detailsMap.get(item.itemId);
    if (!raw) {
      await markRunItem(runId, item, {
        status: 'failed',
        action: 'failed',
        errorCode: 'NOT_FOUND',
        errorMessage: `Base product ${item.itemId} not found.`,
        finishedAt: nowIso(),
      });
      continue;
    }

    try {
      const result = await importSingleItem({
        run,
        item,
        raw,
        baseIntegrationId: connection.baseIntegrationId,
        connectionId: connection.connectionId,
        token: connection.token,
        targetCatalogId: targetCatalog.id,
        defaultPriceGroupId: pricingContext.defaultPriceGroupId,
        preferredPriceCurrencies: pricingContext.preferredCurrencies,
        lookups,
        templateMappings,
        productRepository,
        imageMode: run.params.imageMode,
        dryRun: Boolean(run.params.dryRun),
        inventoryId: run.params.inventoryId,
        mode: resolveMode(run.params.mode),
        allowDuplicateSku: run.params.allowDuplicateSku,
      });

      await markRunItem(runId, item, {
        status: result.status,
        action: result.action,
        baseProductId: result.baseProductId ?? null,
        sku: result.sku ?? null,
        importedProductId: result.importedProductId ?? null,
        payloadSnapshot: result.payloadSnapshot ?? null,
        errorCode: result.errorCode ?? null,
        errorMessage: result.errorMessage ?? null,
        finishedAt: nowIso(),
      });
    } catch (error: unknown) {
      await markRunItem(runId, item, {
        status: 'failed',
        action: 'failed',
        errorCode: mapErrorCode(error),
        errorMessage:
          error instanceof Error
            ? error.message
            : 'Unexpected import error.',
        finishedAt: nowIso(),
      });
    }
  }

  const refreshed = await recomputeBaseImportRunStats(runId);
  const hasPending = (await listBaseImportRunItems(runId)).some(
    (item) => item.status === 'pending' || item.status === 'processing'
  );

  if (hasPending) {
    return updateBaseImportRunStatus(runId, 'failed', {
      summaryMessage: 'Import ended with unprocessed items. Resume to retry.',
      stats: refreshed.stats,
    });
  }

  const onlyFailures =
    refreshed.stats.failed > 0 &&
    refreshed.stats.imported === 0 &&
    refreshed.stats.updated === 0;

  return updateBaseImportRunStatus(runId, onlyFailures ? 'failed' : 'completed', {
    stats: refreshed.stats,
    summaryMessage: buildSummaryMessage(refreshed.stats, Boolean(run.params.dryRun)),
  });
};

export const resumeBaseImportRun = async (
  runId: string,
  statuses: BaseImportItemStatus[] = ['failed', 'pending']
): Promise<BaseImportRunRecord> => {
  const run = await getBaseImportRun(runId);
  if (!run) {
    throw notFoundError('Base import run not found.', { runId });
  }

  const allowed = new Set<BaseImportItemStatus>(statuses);
  const items = await listBaseImportRunItems(runId);
  const resumeCount = items.filter((item) => allowed.has(item.status)).length;

  if (resumeCount === 0) {
    throw badRequestError('No items match selected resume statuses.');
  }

  return updateBaseImportRun(runId, {
    status: 'queued',
    finishedAt: null,
    summaryMessage: `Resume queued for ${resumeCount} product(s).`,
  });
};

export const getBaseImportRunDetailOrThrow = async (
  runId: string
): Promise<BaseImportRunDetailResponse> => {
  const detail = await getBaseImportRunDetail(runId);
  if (!detail) {
    throw notFoundError('Base import run not found.', { runId });
  }
  return detail;
};

export const updateBaseImportRunQueueJob = async (
  runId: string,
  queueJobId: string | null
): Promise<BaseImportRunRecord> => {
  return updateBaseImportRun(runId, {
    queueJobId,
  });
};

export const toStartResponse = (
  run: BaseImportRunRecord
): {
  runId: string;
  status: BaseImportRunRecord['status'];
  preflight: BaseImportRunRecord['preflight'];
  queueJobId?: string | null;
  summaryMessage?: string | null;
} => ({
  runId: run.id,
  status: run.status,
  preflight: run.preflight,
  queueJobId: run.queueJobId ?? null,
  summaryMessage: run.summaryMessage ?? null,
});
