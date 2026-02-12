export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { auth } from '@/features/auth/server';
import { getIntegrationRepository } from '@/features/integrations/server';
import { getProductListingRepository } from '@/features/integrations/server';
import { findProductListingByIdAcrossProviders } from '@/features/integrations/server';
import { findProductListingByProductAndConnectionAcrossProviders } from '@/features/integrations/server';
import { getCategoryMappingRepository } from '@/features/integrations/server';
import { getProducerMappingRepository } from '@/features/integrations/server';
import { getTagMappingRepository } from '@/features/integrations/server';
import {
  getExportActiveTemplateId,
  getExportWarehouseId
} from '@/features/integrations/server';
import {
  getExportDefaultInventoryId,
  getExportStockFallbackEnabled,
  listExportTemplates
} from '@/features/integrations/server';
import {
  buildBaseProductData,
  collectProductImageDiagnostics,
  exportProductImagesToBase,
  exportProductToBase,
  getProductImagesAsBase64,
  normalizeStockKey,
  type ImageBase64Mode,
  type ImageExportDiagnostics,
  type ImageTransformOptions
} from '@/features/integrations/server';
import { checkBaseSkuExists, fetchBaseWarehouses } from '@/features/integrations/server';
import { decryptSecret } from '@/features/integrations/server';
import { LogCapture } from '@/features/integrations/server';
import { ErrorSystem } from '@/features/observability/server';
import { parseJsonBody } from '@/features/products/server';
import { getProducerRepository } from '@/features/products/server';
import { getProductRepository } from '@/features/products/server';
import { getTagRepository } from '@/features/products/server';
import {
  badRequestError,
  conflictError,
  externalServiceError,
  notFoundError
} from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const exportSchema = z.object({
  connectionId: z.string().min(1),
  inventoryId: z.string().min(1),
  templateId: z.string().optional(),
  allowDuplicateSku: z.boolean().optional(), // Allow exporting even if SKU exists in Base.com
  exportImagesAsBase64: z.boolean().optional(), // Export images as base64 data blobs instead of URLs
  imageBase64Mode: z.enum(['base-only', 'full-data-uri']).optional(),
  imagesOnly: z.boolean().optional(),
  listingId: z.string().optional(),
  externalListingId: z.string().optional(),
  imageTransform: z
    .object({
      forceJpeg: z.boolean().optional(),
      maxDimension: z.number().int().positive().optional(),
      jpegQuality: z.number().int().min(10).max(100).optional()
    })
    .optional()
});

const normalizeSearchText = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const isBaseImageError = (message: string | undefined) => {
  if (!message) return false;
  const normalized = normalizeSearchText(message.toLowerCase());
  return (
    normalized.includes('zdjec') ||
    normalized.includes('image') ||
    normalized.includes('photo')
  );
};

const buildImageDiagnosticsLogger = (
  context: Record<string, unknown>
): ImageExportDiagnostics => ({
  log: (message, data) => {
    void ErrorSystem.logWarning(`[export-to-base][images] ${message}`, {
      ...context,
      ...(data ?? {})
    });
  }
});

const logImageDiagnostics = async ({
  product,
  imageBaseUrl,
  includeBase64,
  base64Mode,
  transform,
  context
}: {
  product: Parameters<typeof collectProductImageDiagnostics>[0];
  imageBaseUrl: string | null;
  includeBase64: boolean;
  base64Mode: ImageBase64Mode;
  transform?: ImageTransformOptions | null;
  context: Record<string, unknown>;
}) => {
  const urlDiagnostics = collectProductImageDiagnostics(product, imageBaseUrl);
  void ErrorSystem.logWarning('[export-to-base][images] Image candidates', {
    ...context,
    images: urlDiagnostics
  });

  if (!includeBase64) return;

  try {
    const diagnostics = buildImageDiagnosticsLogger(context);
    await getProductImagesAsBase64(product, {
      diagnostics,
      outputMode: base64Mode,
      transform: transform ?? null
    });
  } catch (error) {
    void ErrorSystem.logWarning('[export-to-base][images] Failed to gather base64 diagnostics', {
      ...context,
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

const CATEGORY_TEMPLATE_PRODUCT_FIELDS = new Set([
  'categoryid',
  'category_id',
  'category',
]);

const PRODUCER_ID_TEMPLATE_FIELDS = new Set([
  'producer',
  'producers',
  'producername',
  'producer_name',
  'producernames',
  'producer_names',
  'producerid',
  'producer_id',
  'producerids',
  'producer_ids',
  'manufacturer',
  'manufacturerid',
  'manufacturer_id',
  'manufacturerids',
  'manufacturer_ids',
]);

const TAG_ID_TEMPLATE_FIELDS = new Set([
  'tagid',
  'tag_id',
  'tagids',
  'tag_ids',
]);

const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const toTemplateFieldKey = (value: string): string =>
  value.trim().toLowerCase().replace(/[\s_-]+/g, '');

const matchesTemplateField = (value: string, fields: Set<string>): boolean => {
  const normalized = value.trim().toLowerCase();
  if (fields.has(normalized)) return true;
  const compact = toTemplateFieldKey(normalized);
  return fields.has(compact);
};

const isMissingExternalEntity = (
  entityName: unknown,
  entityKind: 'category' | 'producer'
): boolean => {
  const normalized = toTrimmedString(entityName).toLowerCase();
  return normalized.startsWith(`[missing external ${entityKind}:`);
};

const toTimeMs = (value: unknown): number => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const getProducerRefId = (value: unknown): string => {
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  return (
    toTrimmedString(record['producerId']) ||
    toTrimmedString(record['producer_id']) ||
    toTrimmedString(record['id']) ||
    toTrimmedString(record['value'])
  );
};

const BASE_EXPORT_RUN_PATH_ID = 'integration-base-export';
const BASE_EXPORT_RUN_PATH_NAME = 'Base.com Export Jobs';
const BASE_EXPORT_SOURCE = 'integration_base_export';
const EXPORT_REQUEST_LOCK_TTL_MS = 2 * 60_000;
const inFlightExportRequests = new Map<string, number>();

const clearExpiredExportRequestLocks = (): void => {
  const now = Date.now();
  for (const [key, createdAt] of inFlightExportRequests.entries()) {
    if (now - createdAt > EXPORT_REQUEST_LOCK_TTL_MS) {
      inFlightExportRequests.delete(key);
    }
  }
};

/**
 * POST /api/integrations/products/[id]/export-to-base
 * Exports a product to Base.com using optional template
 */
async function POST_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const logCapture = new LogCapture();
  logCapture.start();
  const runRepository = await getPathRunRepository();
  let runId: string | null = null;
  let requestLockKey: string | null = null;
  let runMeta: Record<string, unknown> = {
    source: BASE_EXPORT_SOURCE,
    sourceInfo: {
      tab: 'products',
      location: 'product-listing',
      action: 'export_to_base',
    },
    executionMode: 'server',
    runMode: 'api',
    integration: 'base.com',
  };

  try {
    const { id: productId } = params;
    const parsed = await parseJsonBody(_req, exportSchema, {
      logPrefix: 'export-to-base'
    });
    if (!parsed.ok) {
      logCapture.stop();
      return parsed.response;
    }
    const data = parsed.data;
    const requestId =
      _req.headers.get('idempotency-key') ??
      _req.headers.get('x-idempotency-key') ??
      _req.headers.get('x-request-id') ??
      undefined;
    const imagesOnly = data.imagesOnly ?? false;
    const forwardedHost =
      _req.headers.get('x-forwarded-host') ?? _req.headers.get('host');
    const forwardedProto =
      _req.headers.get('x-forwarded-proto') ?? 'http';
    const imageBaseUrl = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : new URL(_req.url).origin;
    const defaultInventoryId = await getExportDefaultInventoryId();
    const resolvedInventoryId = defaultInventoryId || data.inventoryId;
    const normalizedRequestId = requestId?.trim() ?? '';
    if (normalizedRequestId) {
      clearExpiredExportRequestLocks();
      const lockKey = [
        productId,
        data.connectionId,
        resolvedInventoryId,
        imagesOnly ? 'images' : 'full',
        normalizedRequestId,
      ].join(':');
      if (inFlightExportRequests.has(lockKey)) {
        logCapture.stop();
        const logs = logCapture.getLogs();
        return NextResponse.json({
          success: true,
          message: 'Export already in progress',
          idempotent: true,
          inProgress: true,
          runId: null,
          logs,
        });
      }
      inFlightExportRequests.set(lockKey, Date.now());
      requestLockKey = lockKey;
    }
    const session = await auth().catch(() => null);
    const userId = session?.user?.id ?? null;
    runMeta = {
      ...runMeta,
      sourceInfo: {
        tab: 'products',
        location: 'product-listing',
        action: 'export_to_base',
        productId,
        connectionId: data.connectionId,
        inventoryId: resolvedInventoryId,
        imagesOnly,
      },
      templateId: data.templateId ?? null,
      imagesOnly,
    };
    try {
      const createdRun = await runRepository.createRun({
        userId,
        pathId: BASE_EXPORT_RUN_PATH_ID,
        pathName: BASE_EXPORT_RUN_PATH_NAME,
        triggerEvent: 'export_to_base',
        triggerNodeId: `product:${productId}`,
        entityId: productId,
        entityType: 'product',
        meta: runMeta,
        maxAttempts: 1,
        retryCount: 0,
      });
      runId = createdRun.id;
      await runRepository.updateRun(runId, {
        status: 'running',
        startedAt: new Date(),
        meta: runMeta,
      });
      await runRepository.createRunEvent({
        runId,
        level: 'info',
        message: 'Export to Base.com started.',
        metadata: {
          productId,
          connectionId: data.connectionId,
          inventoryId: resolvedInventoryId,
          imagesOnly,
        },
      });
    } catch {
      // Keep export flow resilient if runtime-run logging fails.
    }

    await ErrorSystem.logInfo('[export-to-base] Starting export', {
      productId,
      connectionId: data.connectionId,
      inventoryId: resolvedInventoryId,
      requestedInventoryId: data.inventoryId,
      defaultInventoryId,
      templateId: data.templateId || 'none',
      imagesOnly
    });

    // Get product
    const productRepo = await getProductRepository();
    const product = await productRepo.getProductById(productId);
    if (!product) {
      throw notFoundError('Product not found', { productId });
    }

    await ErrorSystem.logInfo('[export-to-base] Product loaded', {
      productId,
      sku: product.sku,
      name: product.name_en || product.name_pl || 'unnamed'
    });

    let imageDiagnosticsContext = {
      productId,
      sku: product.sku,
      inventoryId: resolvedInventoryId,
      connectionId: data.connectionId
    };

    // Get connection to retrieve API token
    const integrationRepo = await getIntegrationRepository();
    const connection = await integrationRepo.getConnectionById(
      data.connectionId
    );
    if (!connection) {
      throw notFoundError('Connection not found', {
        connectionId: data.connectionId
      });
    }

    await ErrorSystem.logInfo('[export-to-base] Connection loaded', {
      connectionId: data.connectionId,
      connectionName: connection.name,
      hasToken: Boolean(connection.baseApiToken || connection.password)
    });

    // Get Base.com token from connection
    let token: string | null = null;
    try {
      if (connection.baseApiToken) {
        token = decryptSecret(connection.baseApiToken);
      } else if (connection.password) {
        token = decryptSecret(connection.password);
      }
    } catch (_error) {
      throw badRequestError(
        'Failed to decrypt Base.com API token. Please re-save the connection token.',
        {
          connectionId: data.connectionId,
          connectionName: connection.name
        }
      );
    }

    if (!token) {
      throw badRequestError(
        'Base.com API token not found in connection. Please configure the API token in the connection settings.',
        {
          connectionId: data.connectionId,
          connectionName: connection.name
        }
      );
    }

    // Get template mappings (explicit template first, then active export template fallback)
    let mappings: { sourceKey: string; targetField: string }[] = [];
    let resolvedTemplateId: string | null = null;
    const requestedTemplateId = toTrimmedString(data.templateId);
    const hasImageOverrides = Boolean(data.imageBase64Mode || data.imageTransform);
    let exportImagesAsBase64 = imagesOnly
      ? true
      : data.exportImagesAsBase64 ?? hasImageOverrides;
    let imageBase64Mode: ImageBase64Mode = data.imageBase64Mode ?? 'base-only';
    let imageTransform: ImageTransformOptions | null = null;
    if (data.imageTransform) {
      imageTransform = {};
      if (data.imageTransform.forceJpeg !== undefined)
        imageTransform.forceJpeg = data.imageTransform.forceJpeg;
      if (data.imageTransform.maxDimension !== undefined)
        imageTransform.maxDimension = data.imageTransform.maxDimension;
      if (data.imageTransform.jpegQuality !== undefined)
        imageTransform.jpegQuality = data.imageTransform.jpegQuality;
    }
    if (!imagesOnly) {
      const fallbackTemplateId = requestedTemplateId
        ? ''
        : toTrimmedString(await getExportActiveTemplateId());
      const templateIdToUse = requestedTemplateId || fallbackTemplateId;
      if (templateIdToUse) {
        const templates = await listExportTemplates();
        const template = templates.find((entry) => entry.id === templateIdToUse);
        if (!template) {
          if (requestedTemplateId) {
            throw badRequestError(
              `Export template "${requestedTemplateId}" was not found. Select an existing template and retry.`
            );
          }
          await ErrorSystem.logWarning(
            '[export-to-base] Active export template not found; continuing without template mappings.',
            {
              productId,
              connectionId: data.connectionId,
              templateId: templateIdToUse,
            }
          );
        } else {
          mappings = template.mappings;
          resolvedTemplateId = template.id;
          // Use template's exportImagesAsBase64 setting if not explicitly overridden
          if (
            !hasImageOverrides &&
            data.exportImagesAsBase64 === undefined &&
            template.exportImagesAsBase64 !== undefined
          ) {
            exportImagesAsBase64 = template.exportImagesAsBase64;
          }
        }
      }
    }

    const productProducerIds = !imagesOnly
      ? Array.from(
        new Set(
          (product.producers ?? [])
            .map((producer) => getProducerRefId(producer))
            .filter((producerId): producerId is string => Boolean(producerId))
        )
      )
      : [];
    const productTagIds = !imagesOnly
      ? Array.from(
        new Set(
          (product.tags ?? [])
            .map((tag) => tag.tagId?.trim())
            .filter((tagId): tagId is string => Boolean(tagId))
        )
      )
      : [];
    let producerNameById: Record<string, string> | null = null;
    let producerExternalIdByInternalId: Record<string, string> | null = null;
    let tagNameById: Record<string, string> | null = null;
    let tagExternalIdByInternalId: Record<string, string> | null = null;
    if (!imagesOnly && productProducerIds.length > 0) {
      try {
        const producerRepository = await getProducerRepository();
        const resolvedProducers = await Promise.all(
          productProducerIds.map(async (producerId: string) => {
            try {
              return await producerRepository.getProducerById(producerId);
            } catch {
              return null;
            }
          })
        );
        const mappedEntries = resolvedProducers
          .map((producer) => {
            const id = typeof producer?.id === 'string' ? producer.id.trim() : '';
            const name =
              typeof producer?.name === 'string' ? producer.name.trim() : '';
            if (!id || !name) return null;
            return [id, name] as const;
          })
          .filter(
            (entry): entry is readonly [string, string] => entry !== null
          );
        if (mappedEntries.length > 0) {
          producerNameById = Object.fromEntries([
            ...mappedEntries,
            ...mappedEntries.map(([id, name]) => [id.toLowerCase(), name] as const),
          ]);
        }
      } catch (error) {
        await ErrorSystem.logWarning(
          '[export-to-base] Failed to resolve producer names for export',
          {
            productId,
            producerCount: productProducerIds.length,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      }

      try {
        const producerMappingRepo = getProducerMappingRepository();
        const producerMappings =
          await producerMappingRepo.listByInternalProducerIds(
            data.connectionId,
            productProducerIds
          );
        const mappedEntries = producerMappings
          .map((mapping) => {
            const internalProducerId =
              typeof mapping.internalProducerId === 'string'
                ? mapping.internalProducerId.trim()
                : '';
            const externalProducerId =
              typeof mapping.externalProducer?.externalId === 'string'
                ? mapping.externalProducer.externalId.trim()
                : '';
            const missingExternalProducer = isMissingExternalEntity(
              mapping.externalProducer?.name,
              'producer'
            );
            if (!internalProducerId || !externalProducerId || missingExternalProducer) return null;
            return [internalProducerId, externalProducerId] as const;
          })
          .filter(
            (entry): entry is readonly [string, string] => entry !== null
          );
        if (mappedEntries.length > 0) {
          producerExternalIdByInternalId = Object.fromEntries([
            ...mappedEntries,
            ...mappedEntries.map(([id, externalId]) => [id.toLowerCase(), externalId] as const),
          ]);
        }
      } catch (error) {
        await ErrorSystem.logWarning(
          '[export-to-base] Failed to resolve producer mappings for export',
          {
            productId,
            producerCount: productProducerIds.length,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      }
    }

    if (!imagesOnly && productTagIds.length > 0) {
      try {
        const tagRepository = await getTagRepository();
        const resolvedTags = await Promise.all(
          productTagIds.map(async (tagId: string) => {
            try {
              return await tagRepository.getTagById(tagId);
            } catch {
              return null;
            }
          })
        );
        const mappedEntries = resolvedTags
          .map((tag) => {
            const id = typeof tag?.id === 'string' ? tag.id.trim() : '';
            const name = typeof tag?.name === 'string' ? tag.name.trim() : '';
            if (!id || !name) return null;
            return [id, name] as const;
          })
          .filter((entry): entry is readonly [string, string] => entry !== null);
        if (mappedEntries.length > 0) {
          tagNameById = Object.fromEntries([
            ...mappedEntries,
            ...mappedEntries.map(([id, name]) => [id.toLowerCase(), name] as const),
          ]);
        }
      } catch (error) {
        await ErrorSystem.logWarning(
          '[export-to-base] Failed to resolve tag names for export',
          {
            productId,
            tagCount: productTagIds.length,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      }

      try {
        const tagMappingRepo = getTagMappingRepository();
        const tagMappings = await tagMappingRepo.listByInternalTagIds(
          data.connectionId,
          productTagIds
        );
        const mappedEntries = tagMappings
          .map((mapping) => {
            const internalTagId =
              typeof mapping.internalTagId === 'string'
                ? mapping.internalTagId.trim()
                : '';
            const externalTagId =
              typeof mapping.externalTag?.externalId === 'string'
                ? mapping.externalTag.externalId.trim()
                : '';
            if (!internalTagId || !externalTagId) return null;
            return [internalTagId, externalTagId] as const;
          })
          .filter((entry): entry is readonly [string, string] => entry !== null);
        if (mappedEntries.length > 0) {
          tagExternalIdByInternalId = Object.fromEntries([
            ...mappedEntries,
            ...mappedEntries.map(([id, externalId]) => [id.toLowerCase(), externalId] as const),
          ]);
        }
      } catch (error) {
        await ErrorSystem.logWarning(
          '[export-to-base] Failed to resolve tag mappings for export',
          {
            productId,
            tagCount: productTagIds.length,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      }
    }

    let exportProduct = product;
    if (!imagesOnly) {
      const hasProducerIdTemplateMapping = mappings.some((mapping) => {
        const sourceKey = mapping['sourceKey'];
        const targetField = mapping['targetField'];
        return (
          matchesTemplateField(sourceKey, PRODUCER_ID_TEMPLATE_FIELDS) ||
          matchesTemplateField(targetField, PRODUCER_ID_TEMPLATE_FIELDS)
        );
      });
      if (hasProducerIdTemplateMapping && productProducerIds.length > 0) {
        const missingProducerIds = productProducerIds.filter((producerId: string) => {
          const direct = producerExternalIdByInternalId?.[producerId];
          const lowered = producerExternalIdByInternalId?.[producerId.toLowerCase()];
          return !direct && !lowered;
        });
        if (missingProducerIds.length > 0) {
          const missingProducerNames = missingProducerIds.map((producerId: string) => {
            const direct = producerNameById?.[producerId];
            const lowered = producerNameById?.[producerId.toLowerCase()];
            return direct ?? lowered ?? producerId;
          });
          throw badRequestError(
            `No Base.com producer mapping found for: ${missingProducerNames.join(', ')}. Map producers in Producer Mapper first.`
          );
        }
      }

      const hasTagIdTemplateMapping = mappings.some((mapping) => {
        const sourceKey = mapping['sourceKey'];
        const targetField = mapping['targetField'];
        return (
          matchesTemplateField(sourceKey, TAG_ID_TEMPLATE_FIELDS) ||
          matchesTemplateField(targetField, TAG_ID_TEMPLATE_FIELDS)
        );
      });
      if (hasTagIdTemplateMapping && productTagIds.length > 0) {
        const missingTagIds = productTagIds.filter((tagId: string) => {
          const direct = tagExternalIdByInternalId?.[tagId];
          const lowered = tagExternalIdByInternalId?.[tagId.toLowerCase()];
          return !direct && !lowered;
        });
        if (missingTagIds.length > 0) {
          const missingTagNames = missingTagIds.map((tagId: string) => {
            const direct = tagNameById?.[tagId];
            const lowered = tagNameById?.[tagId.toLowerCase()];
            return direct ?? lowered ?? tagId;
          });
          throw badRequestError(
            `No Base.com tag mapping found for: ${missingTagNames.join(', ')}. Map tags in Tag Mapper first.`
          );
        }
      }

      const hasCategoryTemplateMapping = mappings.some((mapping) => {
        const sourceKey = mapping['sourceKey'];
        const targetField = mapping['targetField'];
        return (
          matchesTemplateField(sourceKey, CATEGORY_TEMPLATE_PRODUCT_FIELDS) ||
          matchesTemplateField(targetField, CATEGORY_TEMPLATE_PRODUCT_FIELDS)
        );
      });

      if (hasCategoryTemplateMapping) {
        const internalCategoryId =
          typeof product.categoryId === 'string' ? product.categoryId.trim() : '';
        if (!internalCategoryId) {
          throw badRequestError(
            'Product has no internal category assigned. Assign a category before exporting with category mapping.'
          );
        }

        const categoryMappingRepo = getCategoryMappingRepository();
        const categoryMappings = await categoryMappingRepo.listByConnection(
          data.connectionId
        );
        const productCatalogIds = new Set(
          (product.catalogs ?? []).map((catalog) => catalog.catalogId)
        );

        const matchingMappings = categoryMappings.filter(
          (mapping) =>
            mapping.isActive && mapping.internalCategoryId === internalCategoryId
        );
        const validMappings = matchingMappings.filter((mapping) => {
          const externalCategoryId = toTrimmedString(
            mapping.externalCategory?.externalId
          );
          if (!externalCategoryId) return false;
          if (
            isMissingExternalEntity(mapping.externalCategory?.name, 'category')
          ) {
            return false;
          }
          return true;
        });
        const catalogMatchedMappings = validMappings.filter((mapping) =>
          productCatalogIds.has(mapping.catalogId)
        );
        const prioritizedMappings =
          catalogMatchedMappings.length > 0
            ? catalogMatchedMappings
            : validMappings;
        const externalCategoryIds = Array.from(
          new Set(
            prioritizedMappings
              .map((mapping) =>
                toTrimmedString(mapping.externalCategory?.externalId)
              )
              .filter(Boolean)
          )
        );
        if (externalCategoryIds.length > 1) {
          const mappingLabels = prioritizedMappings
            .map((mapping) => {
              const categoryName = toTrimmedString(mapping.externalCategory?.name);
              const externalId = toTrimmedString(mapping.externalCategory?.externalId);
              if (!externalId) return '';
              return categoryName ? `${categoryName} (${externalId})` : externalId;
            })
            .filter(Boolean);
          throw badRequestError(
            `Multiple active Base.com category mappings found for this category. Keep only one active mapping and retry. Found: ${mappingLabels.join(', ')}`
          );
        }
        const selectedMapping =
          [...prioritizedMappings].sort(
            (a, b) => toTimeMs(b.updatedAt) - toTimeMs(a.updatedAt)
          )[0] ?? null;

        if (!selectedMapping) {
          if (matchingMappings.length > 0) {
            throw badRequestError(
              `Category mapping for internal category "${internalCategoryId}" points to stale external categories. Re-fetch categories and re-save mapping in Category Mapper.`
            );
          }
          throw badRequestError(
            `No Base.com category mapping found for internal category "${internalCategoryId}". Map this category in Category Mapper first.`
          );
        }

        exportProduct = {
          ...product,
          categoryId: selectedMapping.externalCategory.externalId,
        };

        await ErrorSystem.logInfo(
          '[export-to-base] Resolved category mapping for export',
          {
            productId,
            connectionId: data.connectionId,
            internalCategoryId,
            mappedExternalCategoryId: selectedMapping.externalCategory.externalId,
            catalogId: selectedMapping.catalogId,
          }
        );
      }
    }

    // Check for duplicate SKU in Base.com if not allowed
    const allowDuplicateSku = imagesOnly ? true : data.allowDuplicateSku ?? false;
    if (!allowDuplicateSku && product.sku) {
      await ErrorSystem.logInfo('[export-to-base] Checking if SKU exists in Base.com', {
        sku: product.sku,
        inventoryId: resolvedInventoryId
      });

      const skuVal = product.sku;
      const tokenVal = token;
      const skuCheck = await checkBaseSkuExists(
        tokenVal,
        resolvedInventoryId,
        skuVal
      );
      if (skuCheck.exists) {
        await ErrorSystem.logWarning('[export-to-base] SKU already exists in Base.com', {
          sku: product.sku,
          existingProductId: skuCheck.productId
        });
        throw conflictError(
          `SKU "${product.sku}" already exists in Base.com inventory. Use "Allow duplicate SKUs" option to export anyway.`,
          {
            skuExists: true,
            existingProductId: skuCheck.productId,
            sku: product.sku
          }
        );
      }
    }

    const primaryListingRepo = await getProductListingRepository();
    let listingRepo = primaryListingRepo;
    const integrations = await integrationRepo.listIntegrations();
    const baseIntegration = integrations.find((i) =>
      ['baselinker', 'base-com', 'base'].includes(i.slug)
    );
    const baseIntegrationId = baseIntegration?.id ?? connection.integrationId ?? null;
    if (!baseIntegration && baseIntegrationId) {
      await ErrorSystem.logWarning(
        '[export-to-base] Base integration slug not found while resolving listing badge integration; falling back to connection.integrationId.',
        {
          productId,
          connectionId: data.connectionId,
          fallbackIntegrationId: baseIntegrationId,
        }
      );
    }
    let listingId: string | null = null;
    let listingExternalId: string | null = data.externalListingId ?? null;
    let listingInventoryId: string | null = null;
    if (baseIntegrationId) {
      if (imagesOnly) {
        let existingListing: {
          id: string;
          productId: string;
          connectionId: string;
          externalListingId: string | null;
          inventoryId?: string | null;
        } | null = null;
        if (data.listingId) {
          const resolvedById = await findProductListingByIdAcrossProviders(data.listingId);
          if (resolvedById?.listing.productId === productId) {
            existingListing = resolvedById.listing;
            listingRepo = resolvedById.repository;
          }
        }
        if (!existingListing) {
          const resolvedByConnection =
            await findProductListingByProductAndConnectionAcrossProviders(
              productId,
              data.connectionId
            );
          if (resolvedByConnection) {
            existingListing = resolvedByConnection.listing;
            listingRepo = resolvedByConnection.repository;
          }
        }
        if (existingListing) {
          listingId = existingListing.id;
          listingExternalId = existingListing.externalListingId ?? listingExternalId;
          listingInventoryId = existingListing.inventoryId ?? null;
          await listingRepo.updateListingStatus(existingListing.id, 'pending');
          if (
            listingExternalId &&
            existingListing.externalListingId !== listingExternalId
          ) {
            await listingRepo.updateListingExternalId(
              existingListing.id,
              listingExternalId
            );
          }
        }
        if (!listingExternalId) {
          throw badRequestError(
            'Images-only export requires an existing Base.com listing. Export the product first.'
          );
        }
      } else {
        const resolvedByConnection =
          await findProductListingByProductAndConnectionAcrossProviders(
            productId,
            data.connectionId
          );
        if (!resolvedByConnection) {
          const newListing = await primaryListingRepo.createListing({
            productId,
            integrationId: baseIntegrationId,
            connectionId: data.connectionId,
            externalListingId: null,
            inventoryId: resolvedInventoryId
          });
          listingRepo = primaryListingRepo;
          listingId = newListing.id;
        } else {
          const existingListing = resolvedByConnection.listing;
          listingRepo = resolvedByConnection.repository;
          listingId = existingListing.id;
          await listingRepo.updateListingStatus(existingListing.id, 'pending');
          if (existingListing.inventoryId !== resolvedInventoryId) {
            await listingRepo.updateListingInventoryId(
              existingListing.id,
              resolvedInventoryId
            );
          }
        }
      }
    }

    if (requestId && listingId) {
      const existingListing = await listingRepo.getListingById(listingId);
      const history = existingListing?.exportHistory ?? [];
      const prior = history.find(
        (event) => event.requestId === requestId && event.status === 'success'
      );
      if (prior) {
        if (runId) {
          await runRepository
            .createRunEvent({
              runId,
              level: 'info',
              message: 'Export already completed (idempotent).',
              metadata: {
                productId,
                listingId,
                externalListingId:
                  prior.externalListingId ?? existingListing?.externalListingId ?? null,
                requestId: requestId ?? null,
                idempotent: true,
              },
            })
            .catch(() => undefined);
          await runRepository
            .updateRun(runId, {
              status: 'completed',
              finishedAt: new Date(),
              meta: {
                ...runMeta,
                idempotent: true,
                completedAt: new Date().toISOString(),
              },
            })
            .catch(() => undefined);
        }
        logCapture.stop();
        const logs = logCapture.getLogs();
        return NextResponse.json({
          success: true,
          message: 'Export already completed',
          externalProductId:
            prior.externalListingId ?? existingListing?.externalListingId ?? null,
          idempotent: true,
          runId,
          logs
        });
      }
    }

    const targetInventoryId =
      imagesOnly && listingInventoryId ? listingInventoryId : resolvedInventoryId;
    const canRetryWrite = imagesOnly || Boolean(listingExternalId);
    imageDiagnosticsContext = {
      ...imageDiagnosticsContext,
      inventoryId: targetInventoryId
    };

    let warehouseId = imagesOnly ? null : await getExportWarehouseId(targetInventoryId);
    let stockWarehouseAliases: Record<string, string> | null = null;
    let validWarehouseIds: Set<string> | null = null;
    if (!imagesOnly) {
      try {
        const warehouses = await fetchBaseWarehouses(token, targetInventoryId);
        const warehouseIdSet = new Set<string>();
        const warehouseAliases: Record<string, string> = {};
        const inferTypedWarehouseId = (value: string) => {
          const match = value.match(/([a-z]+)[_-]?(\d+)/i);
          if (!match?.[1] || !match?.[2]) return null;
          const typed = `${match[1].toLowerCase()}_${match[2]}`;
          return { typed, numeric: match[2] };
        };
        for (const warehouse of warehouses) {
          warehouseIdSet.add(warehouse['id']);
          const inferred = warehouse['typedId'] ?? inferTypedWarehouseId(warehouse['id'])?.typed;
          if (inferred) {
            warehouseIdSet.add(inferred);
            if (inferred !== warehouse['id']) {
              const numeric = inferTypedWarehouseId(inferred)?.numeric;
              if (numeric) {
                warehouseAliases[numeric] = inferred;
              } else {
                warehouseAliases[warehouse['id']] = inferred;
              }
            }
          }
          if (warehouse['typedId'] && warehouse['typedId'] !== warehouse['id']) {
            warehouseAliases[warehouse['id']] = warehouse['typedId'];
          }
        }
        if (warehouseId) {
          const inferred = inferTypedWarehouseId(warehouseId);
          if (inferred?.numeric && inferred.typed) {
            warehouseAliases[inferred.numeric] = inferred.typed;
            warehouseIdSet.add(inferred.typed);
          }
        }
        stockWarehouseAliases =
          Object.keys(warehouseAliases).length > 0 ? warehouseAliases : null;
        validWarehouseIds = warehouseIdSet;
        if (warehouseId && stockWarehouseAliases?.[warehouseId]) {
          warehouseId = stockWarehouseAliases[warehouseId] ?? null;
        } else if (warehouseId) {
          const match = warehouses.find(
            (warehouse) =>
              warehouse['id'] === warehouseId || warehouse['typedId'] === warehouseId
          );
          if (match?.typedId) {
            warehouseId = match.typedId ?? null;
          }
        }
        if (warehouseId) {
          if (!validWarehouseIds.has(warehouseId)) {
            const fallbackWarehouseId =
              warehouses[0]?.typedId ?? warehouses[0]?.id ?? null;
            await ErrorSystem.logWarning('[export-to-base] Warehouse not in inventory, using fallback', {
              warehouseId,
              fallbackWarehouseId,
              inventoryId: targetInventoryId
            });
            warehouseId = fallbackWarehouseId;
          }
        } else {
          warehouseId = warehouses[0]?.typedId ?? warehouses[0]?.id ?? null;
        }
      } catch (error) {
        await ErrorSystem.logWarning('[export-to-base] Failed to verify warehouse, skipping stock export', {
          warehouseId,
          inventoryId: targetInventoryId,
          error
        });
        validWarehouseIds = null;
      }
    }

    const normalizeStockMappingKey = (value: string) => {
      const trimmed = value.trim();
      const withoutPrefix = trimmed.replace(/^stock[._-]?/i, '');
      return normalizeStockKey(withoutPrefix);
    };

    const filterStockMappings = (entries: typeof mappings) => {
      if (!validWarehouseIds) return entries;
      return entries.filter((mapping) => {
        const key = mapping['sourceKey'].trim();
        const lowered = key.toLowerCase();
        if (!lowered.startsWith('stock')) return true;
        const normalized = normalizeStockMappingKey(key);
        if (!normalized) return true;
        return validWarehouseIds.has(normalized);
      });
    };

    let effectiveMappings = imagesOnly ? [] : filterStockMappings(mappings);

    // Export to Base.com
    await ErrorSystem.logInfo('[export-to-base] Calling Base.com API', {
      productId,
      inventoryId: targetInventoryId,
      mappingsCount: effectiveMappings.length
    });

    const baseImageDiagnostics = exportImagesAsBase64
      ? buildImageDiagnosticsLogger({
        ...imageDiagnosticsContext,
        exportImagesAsBase64,
        imageBase64Mode,
        imageTransform
      })
      : undefined;

    const buildExportSnapshot = async (
      targetWarehouseId: string | null,
      activeMappings: typeof mappings = effectiveMappings,
      includeStockWithoutWarehouse = false
    ) => {
      const exportData = await buildBaseProductData(
        exportProduct,
        activeMappings,
        targetWarehouseId,
        {
          imageBaseUrl,
          includeStockWithoutWarehouse,
          ...(stockWarehouseAliases ? { stockWarehouseAliases } : {}),
          ...(producerNameById ? { producerNameById } : {}),
          ...(producerExternalIdByInternalId
            ? { producerExternalIdByInternalId }
            : {}),
          ...(tagNameById ? { tagNameById } : {}),
          ...(tagExternalIdByInternalId
            ? { tagExternalIdByInternalId }
            : {}),
          exportImagesAsBase64: exportImagesAsBase64,
          imageBase64Mode,
          imageTransform,
          imagesOnly
        }
      ) as Record<string, unknown> & {
        text_fields?: Record<string, unknown>;
        prices?: Record<string, unknown>;
        stock?: Record<string, unknown>;
      };
      const exportFields = Object.keys(exportData).flatMap((key) => {
        if (key === 'text_fields' && exportData.text_fields && typeof exportData.text_fields === 'object') {
          return Object.keys(exportData.text_fields).map((field) => `text_fields.${field}`);
        }
        if (key === 'prices' && exportData.prices && typeof exportData.prices === 'object') {
          return Object.keys(exportData.prices).map((field) => `prices.${field}`);
        }
        if (key === 'stock' && exportData.stock && typeof exportData.stock === 'object') {
          return Object.keys(exportData.stock).map((field) => `stock.${field}`);
        }
        return [key];
      });
      return { exportData, exportFields };
    };

    const allowStockFallback = imagesOnly
      ? false
      : await getExportStockFallbackEnabled();
    let includeStockWithoutWarehouse =
      !imagesOnly && !warehouseId && product.stock !== null;
    let exportFields = imagesOnly ? ['images'] : [];
    if (!imagesOnly) {
      ({ exportFields } = await buildExportSnapshot(
        warehouseId,
        effectiveMappings,
        includeStockWithoutWarehouse
      ));
    }
    let result = imagesOnly
      ? await exportProductImagesToBase(
        token,
        targetInventoryId,
        exportProduct,
          listingExternalId as string,
          {
            imageBaseUrl,
            exportImagesAsBase64: exportImagesAsBase64,
            ...(baseImageDiagnostics ? { imageDiagnostics: baseImageDiagnostics } : {}),
            imageBase64Mode,
            imageTransform
          }
      )
      : await exportProductToBase(
        token,
        targetInventoryId,
        exportProduct,
        effectiveMappings,
        warehouseId,
        {
          imageBaseUrl,
          includeStockWithoutWarehouse,
          ...(stockWarehouseAliases ? { stockWarehouseAliases } : {}),
          ...(producerNameById ? { producerNameById } : {}),
          ...(producerExternalIdByInternalId
            ? { producerExternalIdByInternalId }
            : {}),
          ...(tagNameById ? { tagNameById } : {}),
          ...(tagExternalIdByInternalId
            ? { tagExternalIdByInternalId }
            : {}),
          exportImagesAsBase64: exportImagesAsBase64,
          ...(baseImageDiagnostics ? { imageDiagnostics: baseImageDiagnostics } : {}),
          imageBase64Mode,
          imageTransform
        }
      );

    const isWarehouseMismatch = (message: string | undefined) =>
      typeof message === 'string' &&
      message.toLowerCase().includes('warehouse') &&
      message.toLowerCase().includes('not included');

    const isStockMismatch = (message: string | undefined) =>
      typeof message === 'string' &&
      (message.toLowerCase().includes('stock') ||
        message.toLowerCase().includes('quantity'));

    const warehouseMismatch = !imagesOnly && isWarehouseMismatch(result.error);

    if (
      !imagesOnly &&
      canRetryWrite &&
      !result.success &&
      warehouseMismatch &&
      allowStockFallback
    ) {
      await ErrorSystem.logWarning('[export-to-base] Warehouse mismatch, retrying without stock', {
        productId,
        inventoryId: targetInventoryId,
        warehouseId,
        error: result.error
      });
      warehouseId = null;
      effectiveMappings = effectiveMappings.filter(
        (mapping) => !mapping['sourceKey'].trim().toLowerCase().startsWith('stock')
      );
      includeStockWithoutWarehouse = false;
      ({ exportFields } = await buildExportSnapshot(
        warehouseId,
        effectiveMappings,
        includeStockWithoutWarehouse
      ));
      result = await exportProductToBase(
        token,
        targetInventoryId,
        exportProduct,
        effectiveMappings,
        warehouseId,
        {
          imageBaseUrl,
          includeStockWithoutWarehouse,
          ...(stockWarehouseAliases ? { stockWarehouseAliases } : {}),
          ...(producerNameById ? { producerNameById } : {}),
          ...(producerExternalIdByInternalId
            ? { producerExternalIdByInternalId }
            : {}),
          ...(tagNameById ? { tagNameById } : {}),
          ...(tagExternalIdByInternalId
            ? { tagExternalIdByInternalId }
            : {}),
          exportImagesAsBase64: exportImagesAsBase64,
          imageBase64Mode,
          imageTransform
        }
      );
    } else if (!imagesOnly && !result.success && warehouseMismatch) {
      await ErrorSystem.logWarning('[export-to-base] Warehouse mismatch, failing export', {
        productId,
        inventoryId: targetInventoryId,
        warehouseId,
        error: result.error
      });
    }

    if (
      !imagesOnly &&
      canRetryWrite &&
      !result.success &&
      !warehouseMismatch &&
      includeStockWithoutWarehouse &&
      isStockMismatch(result.error)
    ) {
      await ErrorSystem.logWarning('[export-to-base] Retrying without stock export', {
        productId,
        inventoryId: targetInventoryId,
        warehouseId,
        error: result.error
      });
      warehouseId = null;
      effectiveMappings = effectiveMappings.filter(
        (mapping) => !mapping['sourceKey'].trim().toLowerCase().startsWith('stock')
      );
      includeStockWithoutWarehouse = false;
      ({ exportFields } = await buildExportSnapshot(
        warehouseId,
        effectiveMappings,
        includeStockWithoutWarehouse
      ));
      result = await exportProductToBase(
        token,
        targetInventoryId,
        exportProduct,
        effectiveMappings,
        warehouseId,
        {
          imageBaseUrl,
          includeStockWithoutWarehouse,
          ...(stockWarehouseAliases ? { stockWarehouseAliases } : {}),
          ...(producerNameById ? { producerNameById } : {}),
          ...(producerExternalIdByInternalId
            ? { producerExternalIdByInternalId }
            : {}),
          ...(tagNameById ? { tagNameById } : {}),
          ...(tagExternalIdByInternalId
            ? { tagExternalIdByInternalId }
            : {}),
          exportImagesAsBase64: exportImagesAsBase64,
          imageBase64Mode,
          imageTransform
        }
      );
    }

    const imageError = isBaseImageError(result.error);

    if (!result.success && imageError) {
      await logImageDiagnostics({
        product,
        imageBaseUrl,
        includeBase64: exportImagesAsBase64,
        base64Mode: imageBase64Mode,
        transform: imageTransform,
        context: {
          ...imageDiagnosticsContext,
          exportImagesAsBase64,
          imageBase64Mode
        }
      });

      if (!exportImagesAsBase64 || !imageTransform) {
        void ErrorSystem.logWarning('[export-to-base] Image export failed, retrying with base64 + JPEG resize', {
          ...imageDiagnosticsContext,
          error: result.error
        });
        exportImagesAsBase64 = true;
        imageBase64Mode = 'base-only';
        imageTransform = {
          forceJpeg: true,
          maxDimension: 1600,
          jpegQuality: 85
        };
        const imageDiagnostics = buildImageDiagnosticsLogger({
          ...imageDiagnosticsContext,
          exportImagesAsBase64,
          imageBase64Mode,
          imageTransform
        });
        if (!imagesOnly) {
          ({ exportFields } = await buildExportSnapshot(
            warehouseId,
            effectiveMappings,
            includeStockWithoutWarehouse
          ));
        }
        if (canRetryWrite) {
          result = imagesOnly
            ? await exportProductImagesToBase(
              token,
              targetInventoryId,
              exportProduct,
                listingExternalId as string,
                {
                  imageBaseUrl,
                  exportImagesAsBase64: exportImagesAsBase64,
                  imageDiagnostics,
                  imageBase64Mode,
                  imageTransform
                }
            )
            : await exportProductToBase(
              token,
              targetInventoryId,
              exportProduct,
              effectiveMappings,
              warehouseId,
              {
                imageBaseUrl,
                includeStockWithoutWarehouse,
                ...(stockWarehouseAliases ? { stockWarehouseAliases } : {}),
                ...(producerNameById ? { producerNameById } : {}),
                ...(producerExternalIdByInternalId
                  ? { producerExternalIdByInternalId }
                  : {}),
                ...(tagNameById ? { tagNameById } : {}),
                ...(tagExternalIdByInternalId
                  ? { tagExternalIdByInternalId }
                  : {}),
                exportImagesAsBase64: exportImagesAsBase64,
                imageDiagnostics,
                imageBase64Mode,
                imageTransform
              }
            );
        } else {
          let existingExternalProductId: string | null = null;
          if (product.sku) {
            const skuCheck = await checkBaseSkuExists(
              token,
              targetInventoryId,
              product.sku
            );
            existingExternalProductId = skuCheck.productId ?? null;
          }

          if (existingExternalProductId) {
            listingExternalId = existingExternalProductId;
            result = await exportProductImagesToBase(
              token,
              targetInventoryId,
              exportProduct,
              existingExternalProductId,
              {
                imageBaseUrl,
                exportImagesAsBase64: exportImagesAsBase64,
                imageDiagnostics,
                imageBase64Mode,
                imageTransform
              }
            );
          } else {
            result = await exportProductToBase(
              token,
              targetInventoryId,
              exportProduct,
              effectiveMappings,
              warehouseId,
              {
                imageBaseUrl,
                includeStockWithoutWarehouse,
                ...(stockWarehouseAliases ? { stockWarehouseAliases } : {}),
                ...(producerNameById ? { producerNameById } : {}),
                ...(producerExternalIdByInternalId
                  ? { producerExternalIdByInternalId }
                  : {}),
                ...(tagNameById ? { tagNameById } : {}),
                ...(tagExternalIdByInternalId
                  ? { tagExternalIdByInternalId }
                  : {}),
                exportImagesAsBase64: exportImagesAsBase64,
                imageDiagnostics,
                imageBase64Mode,
                imageTransform
              }
            );
          }
        }
      }
    }

    if (!result.success && !imagesOnly && !canRetryWrite && product.sku) {
      const createdAfterTimeout = await checkBaseSkuExists(
        token,
        targetInventoryId,
        product.sku
      );
      if (createdAfterTimeout.exists) {
        await ErrorSystem.logWarning(
          '[export-to-base] Initial export failed but SKU now exists; treating export as successful to avoid duplicate create.',
          {
            productId,
            sku: product.sku,
            inventoryId: targetInventoryId,
            detectedExternalProductId: createdAfterTimeout.productId ?? null,
            originalError: result.error ?? null,
          }
        );
        result = {
          success: true,
          ...(createdAfterTimeout.productId
            ? { productId: createdAfterTimeout.productId }
            : {}),
        };
      }
    }

    if (!result.success) {
      if (listingId) {
        await listingRepo.updateListingStatus(listingId, 'failed');
        await listingRepo.appendExportHistory(listingId, {
          exportedAt: new Date(),
          status: 'failed',
          inventoryId: targetInventoryId,
          templateId: resolvedTemplateId ?? (requestedTemplateId || null),
          warehouseId,
          externalListingId: result.productId || null,
          fields: exportFields,
          requestId: requestId ?? null
        });
      }
      throw externalServiceError(result.error || 'Failed to export product', {
        productId,
        inventoryId: targetInventoryId
      });
    }

    await ErrorSystem.logInfo('[export-to-base] Export successful', {
      productId,
      externalProductId: result.productId
    });

    if (listingId) {
      if (result.productId) {
        await listingRepo.updateListingExternalId(listingId, result.productId);
      }
      await listingRepo.updateListingStatus(listingId, 'active');
      await listingRepo.appendExportHistory(listingId, {
        exportedAt: new Date(),
        status: 'success',
        inventoryId: targetInventoryId,
        templateId: resolvedTemplateId ?? (requestedTemplateId || null),
        warehouseId,
        externalListingId: result.productId || null,
        fields: exportFields,
        requestId: requestId ?? null
      });
    }

    logCapture.stop();
    const logs = logCapture.getLogs();
    if (runId) {
      await runRepository
        .createRunEvent({
          runId,
          level: 'info',
          message: 'Export to Base.com completed.',
          metadata: {
            productId,
            inventoryId: targetInventoryId,
            listingId,
            externalProductId: result.productId ?? null,
            imagesOnly,
          },
        })
        .catch(() => undefined);
      await runRepository
        .updateRun(runId, {
          status: 'completed',
          finishedAt: new Date(),
          meta: {
            ...runMeta,
            listingId,
            inventoryId: targetInventoryId,
            externalProductId: result.productId ?? null,
            completedAt: new Date().toISOString(),
          },
        })
        .catch(() => undefined);
    }

    return NextResponse.json({
      success: true,
      message: 'Product successfully exported to Base.com',
      externalProductId: result.productId,
      runId,
      logs
    });
  } catch (error) {
    logCapture.stop();
    const logs = logCapture.getLogs();
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to export product to Base.com.';
    if (runId) {
      await runRepository
        .createRunEvent({
          runId,
          level: 'error',
          message: `Export failed: ${errorMessage}`,
          metadata: {
            logsCount: logs.length,
          },
        })
        .catch(() => undefined);
      await runRepository
        .updateRun(runId, {
          status: 'failed',
          finishedAt: new Date(),
          errorMessage,
          meta: {
            ...runMeta,
            failedAt: new Date().toISOString(),
            logsCount: logs.length,
          },
        })
        .catch(() => undefined);
    }
    // Re-throw with extra logs context
    if (error instanceof Error && 'meta' in error) {
      const errorWithMeta = error as Error & { meta?: Record<string, unknown> };
      errorWithMeta.meta = { ...(errorWithMeta.meta ?? {}), logs };
    }
    throw error;
  } finally {
    if (requestLockKey) {
      inFlightExportRequests.delete(requestLockKey);
    }
  }
}

export const POST = apiHandlerWithParams<{ id: string }>(
  POST_handler,
  { source: 'integrations.products.[id].export-to-base.POST', requireCsrf: false }
);
