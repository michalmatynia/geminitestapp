import { z } from 'zod';

import {
  collectProductImageDiagnostics,
  fetchBaseWarehouses,
  getExportActiveTemplateId,
  getProductImagesAsBase64,
  listExportTemplates,
  normalizeStockKey,
  type ImageBase64Mode,
  type ImageExportLogger,
  type ImageTransformOptions,
} from '@/shared/lib/integrations/server';
import {
  getCategoryMappingRepository,
  getProducerMappingRepository,
  getTagMappingRepository,
} from '@/shared/lib/integrations/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import {
  getParameterRepository,
  getProducerRepository,
  getTagRepository,
} from '@/features/products/server';
import { badRequestError } from '@/shared/errors/app-error';

export const exportSchema = z.object({
  connectionId: z.string().min(1),
  inventoryId: z.string().min(1),
  templateId: z.string().optional(),
  allowDuplicateSku: z.boolean().optional(),
  exportImagesAsBase64: z.boolean().optional(),
  imageBase64Mode: z.enum(['base-only', 'full-data-uri']).optional(),
  imagesOnly: z.boolean().optional(),
  listingId: z.string().optional(),
  externalListingId: z.string().optional(),
  imageTransform: z
    .object({
      forceJpeg: z.boolean().optional(),
      maxDimension: z.number().int().positive().optional(),
      jpegQuality: z.number().int().min(10).max(100).optional(),
    })
    .optional(),
});
export type BaseExportRequestData = z.infer<typeof exportSchema>;

const normalizeSearchText = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const isBaseImageError = (message: string | undefined): boolean => {
  if (!message) return false;
  const normalized = normalizeSearchText(message.toLowerCase());
  return (
    normalized.includes('zdjec') || normalized.includes('image') || normalized.includes('photo')
  );
};

export const buildImageDiagnosticsLogger = (
  context: Record<string, unknown>
): ImageExportLogger => ({
  log: (message: string, data?: Record<string, unknown>) => {
    void (ErrorSystem as any).logWarning(`[export-to-base][images] ${message}`, {
      ...context,
      ...(data ?? {}),
    });
  },
});

export const logImageDiagnostics = async ({
  product,
  imageBaseUrl,
  includeBase64,
  base64Mode,
  transform,
  context,
}: {
  product: Parameters<typeof collectProductImageDiagnostics>[0];
  imageBaseUrl: string | null;
  includeBase64: boolean;
  base64Mode: ImageBase64Mode;
  transform?: ImageTransformOptions | null;
  context: Record<string, unknown>;
}): Promise<void> => {
  const urlDiagnostics = collectProductImageDiagnostics(product, imageBaseUrl);
  void (ErrorSystem as any).logWarning('[export-to-base][images] Image candidates', {
    ...context,
    images: urlDiagnostics,
  });

  if (!includeBase64) return;

  try {
    const diagnostics = buildImageDiagnosticsLogger(context);
    await getProductImagesAsBase64(product, {
      diagnostics,
      outputMode: base64Mode,
      transform: transform ?? null,
    });
  } catch (error) {
    void (ErrorSystem as any).logWarning('[export-to-base][images] Failed to gather base64 diagnostics', {
      ...context,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const CATEGORY_TEMPLATE_PRODUCT_FIELDS = new Set(['categoryid', 'category_id', 'category']);

export const PRODUCER_ID_TEMPLATE_FIELDS = new Set([
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

export const TAG_ID_TEMPLATE_FIELDS = new Set(['tagid', 'tag_id', 'tagids', 'tag_ids']);

export const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const toTemplateFieldKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

export const matchesTemplateField = (value: string, fields: Set<string>): boolean => {
  const normalized = value.trim().toLowerCase();
  if (fields.has(normalized)) return true;
  const compact = toTemplateFieldKey(normalized);
  return fields.has(compact);
};

export const isMissingExternalEntity = (
  entityName: unknown,
  entityKind: 'category' | 'producer'
): boolean => {
  const normalized = toTrimmedString(entityName).toLowerCase();
  return normalized.startsWith(`[missing external ${entityKind}:`);
};

export const toTimeMs = (value: unknown): number => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const getProducerRefId = (value: unknown): string => {
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  return (
    toTrimmedString(record['producerId']) ||
    toTrimmedString(record['producer_id']) ||
    toTrimmedString(record['id']) ||
    toTrimmedString(record['value'])
  );
};

export type BaseFieldMapping = { sourceKey: string; targetField: string };

const toBaseFieldMappings = (value: unknown): BaseFieldMapping[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry: unknown): BaseFieldMapping | null => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const sourceKey = toTrimmedString(record['sourceKey']);
      const targetField = toTrimmedString(record['targetField']);
      if (!sourceKey || !targetField) return null;
      return { sourceKey, targetField };
    })
    .filter((entry): entry is BaseFieldMapping => entry !== null);
};

type BaseExportProductLike = {
  categoryId?: string | null | undefined;
  producers?: unknown[] | null | undefined;
  tags?: Array<{ tagId?: string | null | undefined }> | null | undefined;
  catalogs?: Array<{ catalogId: string }> | null | undefined;
  parameters?:
    | Array<{
        parameterId?: string | null | undefined;
        value?: unknown;
        valuesByLanguage?: Record<string, unknown> | null | undefined;
      }>
    | null
    | undefined;
};

const PRODUCT_PARAMETER_MAPPING_PREFIX = 'parameter:';
const PARAMETER_EXPORT_FEATURES_PREFIX = 'text_fields.features';

type ParsedMappedParameterRef = {
  parameterId: string;
  languageCode: string | null;
};

export const parseMappedParameterId = (value: unknown): string => {
  const parsed = parseMappedParameterRef(value);
  return parsed?.parameterId ?? '';
};

const parseMappedParameterRef = (value: unknown): ParsedMappedParameterRef | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.toLowerCase().startsWith(PRODUCT_PARAMETER_MAPPING_PREFIX)) {
    return null;
  }
  const mappedValue = trimmed.slice(PRODUCT_PARAMETER_MAPPING_PREFIX.length).trim();
  if (!mappedValue) return null;
  const languageDelimiterIndex = mappedValue.indexOf('|');
  if (languageDelimiterIndex < 0) {
    return {
      parameterId: mappedValue,
      languageCode: null,
    };
  }
  const parameterId = mappedValue.slice(0, languageDelimiterIndex).trim();
  if (!parameterId) return null;
  const rawLanguageCode = mappedValue.slice(languageDelimiterIndex + 1).trim();
  return {
    parameterId,
    languageCode: rawLanguageCode ? rawLanguageCode.toLowerCase() : null,
  };
};

const normalizeLanguageCode = (value: unknown): string | null => {
  const normalized = toTrimmedString(value).toLowerCase().replace('_', '-');
  if (!normalized) return null;
  const match = normalized.match(/[a-z]{2}/);
  return match?.[0] ?? null;
};

const resolveProductDefaultLanguage = (product: BaseExportProductLike): string | null => {
  const catalogs = Array.isArray(product.catalogs) ? product.catalogs : [];
  for (const catalogEntry of catalogs) {
    if (!catalogEntry || typeof catalogEntry !== 'object') continue;
    const record = catalogEntry as Record<string, unknown>;
    const directLanguage = normalizeLanguageCode(record['defaultLanguageId']);
    if (directLanguage) return directLanguage;
    const catalog = record['catalog'];
    if (!catalog || typeof catalog !== 'object') continue;
    const nestedLanguage = normalizeLanguageCode(
      (catalog as Record<string, unknown>)['defaultLanguageId']
    );
    if (nestedLanguage) return nestedLanguage;
  }
  return null;
};

const collectParameterLanguages = (
  product: BaseExportProductLike,
  parameterId: string
): string[] => {
  const normalizedParameterId = parameterId.trim().toLowerCase();
  if (!normalizedParameterId) return [];
  const entries = Array.isArray(product.parameters) ? product.parameters : [];
  const languages = new Set<string>();
  entries.forEach((entry) => {
    const entryId = toTrimmedString(entry?.parameterId).toLowerCase();
    if (!entryId || entryId !== normalizedParameterId) return;
    const valuesByLanguage =
      entry.valuesByLanguage &&
      typeof entry.valuesByLanguage === 'object' &&
      !Array.isArray(entry.valuesByLanguage)
        ? entry.valuesByLanguage
        : null;
    if (!valuesByLanguage) return;
    Object.entries(valuesByLanguage).forEach(([key, value]) => {
      if (!toTrimmedString(value)) return;
      const normalizedLanguage = normalizeLanguageCode(key);
      if (!normalizedLanguage) return;
      languages.add(normalizedLanguage);
    });
  });
  return Array.from(languages);
};

const resolveParameterName = ({
  parameterId,
  languageCode,
  defaultLanguageCode,
  parameterById,
}: {
  parameterId: string;
  languageCode: string | null;
  defaultLanguageCode: string | null;
  parameterById: Map<
    string,
    { name_en?: string | null; name_pl?: string | null; name_de?: string | null }
  >;
}): string => {
  const parameterRecord = parameterById.get(parameterId.toLowerCase()) ?? null;
  const pickName = (code: string | null): string => {
    if (!parameterRecord || !code) return '';
    if (code === 'en') return toTrimmedString(parameterRecord.name_en);
    if (code === 'pl') return toTrimmedString(parameterRecord.name_pl);
    if (code === 'de') return toTrimmedString(parameterRecord.name_de);
    return '';
  };

  const candidates = [languageCode, defaultLanguageCode, 'en', 'pl', 'de'];
  for (const candidate of candidates) {
    const resolved = pickName(candidate);
    if (resolved) return resolved;
  }

  if (parameterRecord) {
    const fallback =
      toTrimmedString(parameterRecord.name_en) ||
      toTrimmedString(parameterRecord.name_pl) ||
      toTrimmedString(parameterRecord.name_de);
    if (fallback) return fallback;
  }

  return parameterId;
};

const dedupeMappings = (mappings: BaseFieldMapping[]): BaseFieldMapping[] => {
  const seen = new Set<string>();
  const result: BaseFieldMapping[] = [];
  mappings.forEach((mapping) => {
    const sourceKey = toTrimmedString(mapping.sourceKey);
    const targetField = toTrimmedString(mapping.targetField);
    if (!sourceKey || !targetField) return;
    const dedupeKey = `${sourceKey}=>${targetField}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    result.push({ sourceKey, targetField });
  });
  return result;
};

const remapLegacyParameterSourceMappings = async <TProduct extends BaseExportProductLike>({
  productId,
  product,
  mappings,
}: {
  productId: string;
  product: TProduct;
  mappings: BaseFieldMapping[];
}): Promise<BaseFieldMapping[]> => {
  const legacyMappings = mappings
    .map((mapping: BaseFieldMapping) => ({
      mapping,
      parsed: parseMappedParameterRef(mapping.sourceKey),
    }))
    .filter(
      (entry): entry is { mapping: BaseFieldMapping; parsed: ParsedMappedParameterRef } =>
        entry.parsed !== null
    );
  if (legacyMappings.length === 0) return mappings;

  const parameterIds = Array.from(
    new Set(legacyMappings.map((entry) => entry.parsed.parameterId.toLowerCase()))
  );
  const parameterRepository = await getParameterRepository();
  const parameterRecords = await Promise.all(
    parameterIds.map(async (parameterId) => {
      try {
        return await parameterRepository.getParameterById(parameterId);
      } catch {
        return null;
      }
    })
  );
  const parameterById = new Map<
    string,
    { name_en?: string | null; name_pl?: string | null; name_de?: string | null }
  >();
  parameterRecords.forEach((parameterRecord) => {
    if (!parameterRecord) return;
    const id = toTrimmedString(parameterRecord.id).toLowerCase();
    if (!id) return;
    parameterById.set(id, {
      name_en: parameterRecord.name_en,
      name_pl: parameterRecord.name_pl,
      name_de: parameterRecord.name_de,
    });
  });
  const defaultLanguageCode = resolveProductDefaultLanguage(product) ?? 'en';
  const remapped: BaseFieldMapping[] = [];

  mappings.forEach((mapping: BaseFieldMapping) => {
    const parsed = parseMappedParameterRef(mapping.sourceKey);
    if (!parsed) {
      remapped.push(mapping);
      return;
    }

    const normalizedParameterId = parsed.parameterId.toLowerCase();
    const primaryLanguage = parsed.languageCode ? normalizeLanguageCode(parsed.languageCode) : null;
    const parameterName = resolveParameterName({
      parameterId: normalizedParameterId,
      languageCode: primaryLanguage,
      defaultLanguageCode,
      parameterById,
    });

    if (primaryLanguage) {
      remapped.push({
        sourceKey: `${PARAMETER_EXPORT_FEATURES_PREFIX}|${primaryLanguage}.${parameterName}`,
        targetField: mapping.targetField,
      });
      return;
    }

    remapped.push({
      sourceKey: `${PARAMETER_EXPORT_FEATURES_PREFIX}.${parameterName}`,
      targetField: mapping.targetField,
    });

    const parameterLanguages = new Set(collectParameterLanguages(product, normalizedParameterId));
    if (defaultLanguageCode) {
      parameterLanguages.add(defaultLanguageCode);
    }
    // Always emit an explicit English variant to support bilingual exports
    // even when EN lives in the direct parameter value field.
    parameterLanguages.add('en');

    parameterLanguages.forEach((languageCode) => {
      const normalizedLanguageCode = normalizeLanguageCode(languageCode);
      if (!normalizedLanguageCode) return;
      const localizedName = resolveParameterName({
        parameterId: normalizedParameterId,
        languageCode: normalizedLanguageCode,
        defaultLanguageCode,
        parameterById,
      });
      remapped.push({
        sourceKey: `${PARAMETER_EXPORT_FEATURES_PREFIX}|${normalizedLanguageCode}.${localizedName}`,
        targetField: `${PRODUCT_PARAMETER_MAPPING_PREFIX}${normalizedParameterId}|${normalizedLanguageCode}`,
      });
    });
  });

  const dedupedMappings = dedupeMappings(remapped);
  await (ErrorSystem as any).logInfo('[export-to-base] Normalized legacy parameter source mappings', {
    productId,
    legacyMappingCount: legacyMappings.length,
    mappingCountBefore: mappings.length,
    mappingCountAfter: dedupedMappings.length,
  });
  return dedupedMappings;
};

const hasMappedParameterValue = (
  entry: NonNullable<BaseExportProductLike['parameters']>[number]
): boolean => {
  const directValue = toTrimmedString(entry.value);
  if (directValue) return true;

  const valuesByLanguage =
    entry.valuesByLanguage &&
    typeof entry.valuesByLanguage === 'object' &&
    !Array.isArray(entry.valuesByLanguage)
      ? entry.valuesByLanguage
      : null;
  if (!valuesByLanguage) return false;

  return Object.values(valuesByLanguage).some((value: unknown) => Boolean(toTrimmedString(value)));
};

const collectTemplateParameterIds = (mappings: BaseFieldMapping[]): string[] => {
  const ids = new Set<string>();
  mappings.forEach((mapping: BaseFieldMapping) => {
    const targetParameterId = parseMappedParameterId(mapping.targetField);
    if (targetParameterId) ids.add(targetParameterId);

    const sourceParameterId = parseMappedParameterId(mapping.sourceKey);
    if (sourceParameterId) ids.add(sourceParameterId);
  });
  return Array.from(ids);
};

const validateTemplateParameterMappings = <TProduct extends BaseExportProductLike>({
  productId,
  product,
  mappings,
}: {
  productId: string;
  product: TProduct;
  mappings: BaseFieldMapping[];
}): void => {
  const mappedParameterIds = collectTemplateParameterIds(mappings);
  if (mappedParameterIds.length === 0) return;

  const entries = Array.isArray(product.parameters) ? product.parameters : [];
  const lookup = new Map<string, { id: string; hasValue: boolean }>();
  entries.forEach((entry) => {
    const parameterId = toTrimmedString(entry?.parameterId);
    if (!parameterId) return;
    const normalizedId = parameterId.toLowerCase();
    const nextHasValue = hasMappedParameterValue(entry);
    const existing = lookup.get(normalizedId);
    if (!existing || (nextHasValue && !existing.hasValue)) {
      lookup.set(normalizedId, {
        id: parameterId,
        hasValue: nextHasValue,
      });
    }
  });

  const missingParameterIds = mappedParameterIds.filter((parameterId: string) => {
    return !lookup.has(parameterId.toLowerCase());
  });
  if (missingParameterIds.length > 0) {
    void (ErrorSystem as any).logWarning(
      '[export-to-base] Some mapped parameters are not present on this product and will be skipped',
      {
        productId,
        parameterIds: missingParameterIds,
      }
    );
  }

  const parameterIdsWithValue = mappedParameterIds.filter((parameterId: string) => {
    return lookup.get(parameterId.toLowerCase())?.hasValue === true;
  });
  if (parameterIdsWithValue.length === 0) {
    throw badRequestError(
      `Export template parameter mappings contain no values for product "${productId}". Fill mapped parameter values before export.`
    );
  }

  const emptyParameterIds = mappedParameterIds.filter((parameterId: string) => {
    return lookup.get(parameterId.toLowerCase())?.hasValue === false;
  });
  if (emptyParameterIds.length > 0) {
    void (ErrorSystem as any).logWarning(
      '[export-to-base] Some mapped parameters are empty and will be skipped',
      {
        productId,
        parameterIds: emptyParameterIds,
      }
    );
  }
};

export const prepareBaseExportMappingsAndProduct = async <TProduct extends BaseExportProductLike>({
  data,
  imagesOnly,
  productId,
  resolvedInventoryId,
  product,
}: {
  data: BaseExportRequestData;
  imagesOnly: boolean;
  productId: string;
  resolvedInventoryId: string;
  product: TProduct;
}): Promise<{
  mappings: BaseFieldMapping[];
  resolvedTemplateId: string | null;
  requestedTemplateId: string;
  exportImagesAsBase64: boolean;
  imageBase64Mode: ImageBase64Mode;
  imageTransform: ImageTransformOptions | null;
  producerNameById: Record<string, string> | null;
  producerExternalIdByInternalId: Record<string, string> | null;
  tagNameById: Record<string, string> | null;
  tagExternalIdByInternalId: Record<string, string> | null;
  exportProduct: TProduct;
}> => {
  let mappings: BaseFieldMapping[] = [];
  let resolvedTemplateId: string | null = null;
  const requestedTemplateId = toTrimmedString(data.templateId);
  const hasImageOverrides = Boolean(data.imageBase64Mode || data.imageTransform);
  let exportImagesAsBase64 = imagesOnly ? true : (data.exportImagesAsBase64 ?? hasImageOverrides);
  let imageBase64Mode: ImageBase64Mode = data.imageBase64Mode ?? 'base-only';
  let imageTransform: ImageTransformOptions | null = null;

  if (data.imageTransform) {
    imageTransform = {};
    if (data.imageTransform.forceJpeg !== undefined) {
      imageTransform.forceJpeg = data.imageTransform.forceJpeg;
    }
    if (data.imageTransform.maxDimension !== undefined) {
      imageTransform.maxDimension = data.imageTransform.maxDimension;
    }
    if (data.imageTransform.jpegQuality !== undefined) {
      imageTransform.jpegQuality = data.imageTransform.jpegQuality;
    }
  }

  if (!imagesOnly) {
    const fallbackTemplateId = requestedTemplateId
      ? ''
      : toTrimmedString(
        await getExportActiveTemplateId({
          connectionId: data.connectionId,
          inventoryId: resolvedInventoryId,
        })
      );
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
        await (ErrorSystem as any).logWarning(
          '[export-to-base] Active export template not found; continuing without template mappings.',
          {
            productId,
            connectionId: data.connectionId,
            templateId: templateIdToUse,
          }
        );
      } else {
        const templateRecord = template as {
          mappings?: unknown;
          exportImagesAsBase64?: unknown;
        };
        mappings = toBaseFieldMappings(templateRecord.mappings);
        mappings = await remapLegacyParameterSourceMappings({
          productId,
          product,
          mappings,
        });
        resolvedTemplateId = template.id;
        const templateExportImagesAsBase64 =
          typeof templateRecord.exportImagesAsBase64 === 'boolean'
            ? templateRecord.exportImagesAsBase64
            : undefined;
        if (
          !hasImageOverrides &&
          data.exportImagesAsBase64 === undefined &&
          templateExportImagesAsBase64 !== undefined
        ) {
          exportImagesAsBase64 = templateExportImagesAsBase64;
        }
      }
    }

    validateTemplateParameterMappings({
      productId,
      product,
      mappings,
    });
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
          const name = typeof producer?.name === 'string' ? producer.name.trim() : '';
          if (!id || !name) return null;
          return [id, name] as const;
        })
        .filter((entry): entry is readonly [string, string] => entry !== null);
      if (mappedEntries.length > 0) {
        producerNameById = Object.fromEntries([
          ...mappedEntries,
          ...mappedEntries.map(([id, name]) => [id.toLowerCase(), name] as const),
        ]);
      }
    } catch (error) {
      await (ErrorSystem as any).logWarning('[export-to-base] Failed to resolve producer names for export', {
        productId,
        producerCount: productProducerIds.length,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      const producerMappingRepo = getProducerMappingRepository();
      const producerMappings = await producerMappingRepo.listByInternalProducerIds(
        data.connectionId,
        productProducerIds
      );
      const mappedEntries = producerMappings
        .map((mapping) => {
          const internalProducerId =
            typeof mapping.internalProducerId === 'string' ? mapping.internalProducerId.trim() : '';
          const externalProducerId =
            typeof mapping.externalProducer?.externalId === 'string'
              ? mapping.externalProducer.externalId.trim()
              : '';
          const missingExternalProducer = isMissingExternalEntity(
            mapping.externalProducer?.name,
            'producer'
          );
          if (!internalProducerId || !externalProducerId || missingExternalProducer) {
            return null;
          }
          return [internalProducerId, externalProducerId] as const;
        })
        .filter((entry): entry is readonly [string, string] => entry !== null);
      if (mappedEntries.length > 0) {
        producerExternalIdByInternalId = Object.fromEntries([
          ...mappedEntries,
          ...mappedEntries.map(([id, externalId]) => [id.toLowerCase(), externalId] as const),
        ]);
      }
    } catch (error) {
      await (ErrorSystem as any).logWarning(
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
      await (ErrorSystem as any).logWarning('[export-to-base] Failed to resolve tag names for export', {
        productId,
        tagCount: productTagIds.length,
        error: error instanceof Error ? error.message : String(error),
      });
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
            typeof mapping.internalTagId === 'string' ? mapping.internalTagId.trim() : '';
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
      await (ErrorSystem as any).logWarning('[export-to-base] Failed to resolve tag mappings for export', {
        productId,
        tagCount: productTagIds.length,
        error: error instanceof Error ? error.message : String(error),
      });
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
      const categoryMappings = await categoryMappingRepo.listByConnection(data.connectionId);
      const productCatalogIds = new Set(
        (product.catalogs ?? []).map((catalog) => catalog.catalogId)
      );

      const matchingMappings = categoryMappings.filter(
        (mapping) => mapping.isActive && mapping.internalCategoryId === internalCategoryId
      );
      const validMappings = matchingMappings.filter((mapping) => {
        const externalCategoryId = toTrimmedString(mapping.externalCategory?.externalId);
        if (!externalCategoryId) return false;
        if (isMissingExternalEntity(mapping.externalCategory?.name, 'category')) {
          return false;
        }
        return true;
      });
      const catalogMatchedMappings = validMappings.filter((mapping) =>
        productCatalogIds.has(mapping.catalogId)
      );
      const prioritizedMappings =
        catalogMatchedMappings.length > 0 ? catalogMatchedMappings : validMappings;
      const externalCategoryIds = Array.from(
        new Set(
          prioritizedMappings
            .map((mapping) => toTrimmedString(mapping.externalCategory?.externalId))
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
        [...prioritizedMappings].sort((a, b) => toTimeMs(b.updatedAt) - toTimeMs(a.updatedAt))[0] ??
        null;

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

      const mappedExternalCategoryId = toTrimmedString(
        selectedMapping.externalCategory?.externalId
      );
      if (!mappedExternalCategoryId) {
        throw badRequestError(
          `No Base.com category mapping found for internal category "${internalCategoryId}". Map this category in Category Mapper first.`
        );
      }

      exportProduct = {
        ...product,
        categoryId: mappedExternalCategoryId,
      } as TProduct;

      await (ErrorSystem as any).logInfo('[export-to-base] Resolved category mapping for export', {
        productId,
        connectionId: data.connectionId,
        internalCategoryId,
        mappedExternalCategoryId,
        catalogId: selectedMapping.catalogId,
      });
    }
  }

  return {
    mappings,
    resolvedTemplateId,
    requestedTemplateId,
    exportImagesAsBase64,
    imageBase64Mode,
    imageTransform,
    producerNameById,
    producerExternalIdByInternalId,
    tagNameById,
    tagExternalIdByInternalId,
    exportProduct,
  };
};

export const resolveWarehouseAndStockMappings = async ({
  imagesOnly,
  token,
  targetInventoryId,
  initialWarehouseId,
  mappings,
  productId,
}: {
  imagesOnly: boolean;
  token: string;
  targetInventoryId: string;
  initialWarehouseId: string | null;
  mappings: BaseFieldMapping[];
  productId: string;
}): Promise<{
  warehouseId: string | null;
  stockWarehouseAliases: Record<string, string> | null;
  effectiveMappings: BaseFieldMapping[];
}> => {
  let warehouseId = initialWarehouseId;
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
        const warehouseRecord = warehouse as Record<string, unknown>;
        const typedWarehouseId =
          typeof warehouseRecord['typedId'] === 'string' ? warehouseRecord['typedId'] : undefined;
        warehouseIdSet.add(warehouse['id']);
        const inferred = typedWarehouseId ?? inferTypedWarehouseId(warehouse['id'])?.typed;
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
        if (typedWarehouseId && typedWarehouseId !== warehouse['id']) {
          warehouseAliases[warehouse['id']] = typedWarehouseId;
        }
      }
      if (warehouseId) {
        const inferred = inferTypedWarehouseId(warehouseId);
        if (inferred?.numeric && inferred.typed) {
          warehouseAliases[inferred.numeric] = inferred.typed;
          warehouseIdSet.add(inferred.typed);
        }
      }
      stockWarehouseAliases = Object.keys(warehouseAliases).length > 0 ? warehouseAliases : null;
      validWarehouseIds = warehouseIdSet;
      if (warehouseId && stockWarehouseAliases?.[warehouseId]) {
        warehouseId = stockWarehouseAliases[warehouseId] ?? null;
      } else if (warehouseId) {
        const match = warehouses.find((warehouse) => {
          const warehouseRecord = warehouse as Record<string, unknown>;
          const typedWarehouseId =
            typeof warehouseRecord['typedId'] === 'string' ? warehouseRecord['typedId'] : undefined;
          return warehouse['id'] === warehouseId || typedWarehouseId === warehouseId;
        });
        const matchRecord = match as Record<string, unknown> | undefined;
        const matchTypedId =
          matchRecord && typeof matchRecord['typedId'] === 'string'
            ? matchRecord['typedId']
            : undefined;
        if (matchTypedId) {
          warehouseId = matchTypedId;
        }
      }
      if (warehouseId) {
        if (!validWarehouseIds.has(warehouseId)) {
          const firstWarehouse = warehouses[0] as Record<string, unknown> | undefined;
          const fallbackTypedWarehouseId =
            firstWarehouse && typeof firstWarehouse['typedId'] === 'string'
              ? firstWarehouse['typedId']
              : undefined;
          const fallbackWarehouseId = fallbackTypedWarehouseId ?? warehouses[0]?.id ?? null;
          await (ErrorSystem as any).logWarning(
            '[export-to-base] Warehouse not in inventory, using fallback',
            {
              productId,
              warehouseId,
              fallbackWarehouseId,
              inventoryId: targetInventoryId,
            }
          );
          warehouseId = fallbackWarehouseId;
        }
      } else {
        const firstWarehouse = warehouses[0] as Record<string, unknown> | undefined;
        const fallbackTypedWarehouseId =
          firstWarehouse && typeof firstWarehouse['typedId'] === 'string'
            ? firstWarehouse['typedId']
            : undefined;
        warehouseId = fallbackTypedWarehouseId ?? warehouses[0]?.id ?? null;
      }
    } catch (error) {
      await (ErrorSystem as any).logWarning(
        '[export-to-base] Failed to verify warehouse, skipping stock export',
        {
          productId,
          warehouseId,
          inventoryId: targetInventoryId,
          error,
        }
      );
      validWarehouseIds = null;
    }
  }

  const normalizeStockMappingKey = (value: string) => {
    const trimmed = value.trim();
    const withoutPrefix = trimmed.replace(/^stock[._-]?/i, '');
    return normalizeStockKey(withoutPrefix);
  };

  const filterStockMappings = (entries: BaseFieldMapping[]) => {
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

  const effectiveMappings = imagesOnly ? [] : filterStockMappings(mappings);

  return {
    warehouseId,
    stockWarehouseAliases,
    effectiveMappings,
  };
};

export const BASE_EXPORT_RUN_PATH_ID = 'integration-base-export';
export const BASE_EXPORT_RUN_PATH_NAME = 'Base.com Export Jobs';
export const BASE_EXPORT_SOURCE = 'integration_base_export';

const EXPORT_REQUEST_LOCK_TTL_MS = 2 * 60_000;
export const inFlightExportRequests = new Map<string, number>();

export const clearExpiredExportRequestLocks = (): void => {
  const now = Date.now();
  for (const [key, createdAt] of inFlightExportRequests.entries()) {
    if (now - createdAt > EXPORT_REQUEST_LOCK_TTL_MS) {
      inFlightExportRequests.delete(key);
    }
  }
};
