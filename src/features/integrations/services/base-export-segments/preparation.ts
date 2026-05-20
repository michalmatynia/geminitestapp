import {
  getExportActiveTemplateId,
  listExportTemplates,
  type ImageBase64Mode,
  type ImageTransformOptions,
  getProducerMappingRepository,
  getTagMappingRepository,
  type Template,
} from '@/features/integrations/server';
import { type CategoryMappingWithDetails } from '@/shared/contracts/integrations/listings';
import type { ProducerRepository } from '@/shared/contracts/products/drafts';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import { badRequestError } from '@/shared/errors/app-error';
import { getParameterRepository } from '@/shared/lib/products/services/parameter-repository';
import { getProducerRepository } from '@/shared/lib/products/services/producer-repository';
import { getTagRepository } from '@/shared/lib/products/services/tag-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { getCategoryMappingRepository } from '@/features/integrations/services/category-mapping-repository';
import {
  type BaseExportRequestData,
  type BaseFieldMapping,
  type BaseExportProductLike,
  toTrimmedString,
  matchesTemplateField,
  isMissingExternalEntity,
  CATEGORY_TEMPLATE_PRODUCT_FIELDS,
  PRODUCER_ID_TEMPLATE_FIELDS,
  TAG_ID_TEMPLATE_FIELDS,
  toTimeMs,
} from './common';

export const getProducerRefId = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const record = value as Record<string, unknown>;
  const idValue =
    record['producerId'] ??
    record['producer_id'] ??
    record['manufacturerId'] ??
    record['manufacturer_id'] ??
    record['id'] ??
    (record['producer'] &&
    typeof record['producer'] === 'object' &&
    !Array.isArray(record['producer'])
      ? (record['producer'] as Record<string, unknown>)['id']
      : undefined);
  if (typeof idValue === 'string') return idValue.trim();
  if (typeof idValue === 'number') return String(idValue);
  return '';
};

export const getProducerRefName = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const record = value as Record<string, unknown>;
  const nameValue =
    record['producerName'] ??
    record['producer_name'] ??
    record['manufacturerName'] ??
    record['manufacturer_name'] ??
    record['name'] ??
    (record['producer'] &&
    typeof record['producer'] === 'object' &&
    !Array.isArray(record['producer'])
      ? (record['producer'] as Record<string, unknown>)['name']
      : undefined);
  return typeof nameValue === 'string' ? nameValue.trim() : '';
};

const collectProducerRefIds = (product: BaseExportProductLike): string[] => {
  const productRecord = product as Record<string, unknown>;
  const producerEntries = Array.isArray(productRecord['producers'])
    ? (productRecord['producers'] as unknown[])
    : [];
  const legacyProducerIds = Array.isArray(productRecord['producerIds'])
    ? (productRecord['producerIds'] as unknown[])
    : [];

  return Array.from(
    new Set(
      [
        ...producerEntries.map((producer) => getProducerRefId(producer)),
        ...legacyProducerIds.map((producerId) => getProducerRefId(producerId)),
        getProducerRefId(productRecord['producerId']),
        getProducerRefId(productRecord['producer_id']),
        getProducerRefId(productRecord['manufacturerId']),
        getProducerRefId(productRecord['manufacturer_id']),
        getProducerRefId(productRecord['producer']),
        getProducerRefId(productRecord['manufacturer']),
      ].filter((producerId): producerId is string => producerId.length > 0)
    )
  );
};

const collectProducerNames = (product: BaseExportProductLike): string[] => {
  const productRecord = product as Record<string, unknown>;
  const producerEntries = Array.isArray(productRecord['producers'])
    ? (productRecord['producers'] as unknown[])
    : [];
  const legacyProducerNames = Array.isArray(productRecord['producerNames'])
    ? (productRecord['producerNames'] as unknown[])
    : [];

  return Array.from(
    new Set(
      [
        ...producerEntries.map((producer) => getProducerRefName(producer)),
        ...legacyProducerNames.map((producerName) => getProducerRefName(producerName)),
        getProducerRefName(productRecord['producerName']),
        getProducerRefName(productRecord['producer_name']),
        getProducerRefName(productRecord['manufacturerName']),
        getProducerRefName(productRecord['manufacturer_name']),
        getProducerRefName(productRecord['producer']),
        getProducerRefName(productRecord['manufacturer']),
      ].filter((producerName): producerName is string => producerName.length > 0)
    )
  );
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const toBaseFieldMappings = (value: unknown): BaseFieldMapping[] => {
  if (!Array.isArray(value)) return [];
  return (value as unknown[]).filter(
    (item): item is BaseFieldMapping =>
      item !== null && typeof item === 'object' && !Array.isArray(item) && 'targetField' in item
  );
};
const UNSUPPORTED_PARAMETER_SOURCE_PREFIX = 'parameter:';
const PARAMETER_TARGET_PREFIX = 'parameter:';
const BASE_FEATURE_SOURCE_PREFIX = 'text_fields.features.';

type ProductParameterRef = {
  parameterId: string;
  fallbackLabel: string;
};

const getProductParameterRef = (entry: unknown): ProductParameterRef | null => {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const record = entry as Record<string, unknown>;
  const parameterId = toTrimmedString(record['parameterId']) || toTrimmedString(record['id']);
  if (!parameterId) return null;
  return {
    parameterId,
    fallbackLabel:
      toTrimmedString(record['name']) ||
      toTrimmedString(record['label']) ||
      toTrimmedString(record['parameterName']) ||
      parameterId,
  };
};

const collectProductParameterRefs = (product: BaseExportProductLike): ProductParameterRef[] => {
  const entries = Array.isArray(product.parameters) ? product.parameters : [];
  const seen = new Set<string>();
  const refs: ProductParameterRef[] = [];
  for (const entry of entries) {
    const ref = getProductParameterRef(entry);
    if (!ref) continue;
    const normalizedId = ref.parameterId.toLowerCase();
    if (seen.has(normalizedId)) continue;
    seen.add(normalizedId);
    refs.push(ref);
  }
  return refs;
};

const parseParameterTargetId = (targetField: unknown): string => {
  const target = toTrimmedString(targetField);
  if (!target.toLowerCase().startsWith(PARAMETER_TARGET_PREFIX)) return '';
  const payload = target.slice(PARAMETER_TARGET_PREFIX.length).trim();
  if (!payload) return '';
  return payload.split('|')[0]?.trim().toLowerCase() ?? '';
};

const collectExplicitlyMappedParameterIds = (mappings: BaseFieldMapping[]): Set<string> =>
  new Set(
    mappings
      .map((mapping: BaseFieldMapping) => parseParameterTargetId(mapping.targetField))
      .filter((parameterId: string): parameterId is string => parameterId.length > 0)
  );

const normalizeFeatureName = (value: string): string =>
  value.replace(/\./g, ' ').replace(/\s+/g, ' ').trim();

const readFeatureSourceName = (sourceKey: unknown): string => {
  const source = toTrimmedString(sourceKey);
  if (!source.toLowerCase().startsWith(BASE_FEATURE_SOURCE_PREFIX)) return '';
  return normalizeFeatureName(source.slice(BASE_FEATURE_SOURCE_PREFIX.length));
};

const collectUsedFeatureNames = (mappings: BaseFieldMapping[]): Set<string> =>
  new Set(
    mappings
      .map((mapping: BaseFieldMapping) => readFeatureSourceName(mapping.sourceKey).toLowerCase())
      .filter((featureName: string): featureName is string => featureName.length > 0)
  );

const makeUniqueFeatureName = (
  label: string,
  parameterId: string,
  usedFeatureNames: Set<string>
): string => {
  const normalizedLabel = normalizeFeatureName(label) || parameterId;
  let candidate = normalizedLabel;
  let suffix = 2;
  while (usedFeatureNames.has(candidate.toLowerCase())) {
    candidate = `${normalizedLabel} ${suffix}`;
    suffix += 1;
  }
  usedFeatureNames.add(candidate.toLowerCase());
  return candidate;
};

const getParameterDefinitionLabel = (parameter: ProductParameter | null | undefined): string => {
  if (!parameter) return '';
  return (
    toTrimmedString(parameter.name_en) ||
    toTrimmedString(parameter.name) ||
    toTrimmedString(parameter.name_pl) ||
    toTrimmedString(parameter.name_de) ||
    toTrimmedString(parameter.id)
  );
};

const collectParameterLookupCatalogIds = (product: BaseExportProductLike): string[] => {
  const catalogIds = new Set<string>();
  const directCatalogId = toTrimmedString(product['catalogId']);
  if (directCatalogId) catalogIds.add(directCatalogId);
  (product.catalogs ?? []).forEach((catalog) => {
    const catalogId = toTrimmedString(catalog.catalogId);
    if (catalogId) catalogIds.add(catalogId);
  });
  return Array.from(catalogIds);
};

const resolveParameterDefinitionsById = async (
  product: BaseExportProductLike,
  refs: ProductParameterRef[],
  productId: string
): Promise<Map<string, ProductParameter>> => {
  const definitionsById = new Map<string, ProductParameter>();
  const parameterIds = refs.map((ref: ProductParameterRef) => ref.parameterId);
  if (parameterIds.length === 0) return definitionsById;

  try {
    const parameterRepository = await getParameterRepository();
    const catalogIds = collectParameterLookupCatalogIds(product);
    const catalogDefinitions = (
      await Promise.all(
        catalogIds.map((catalogId: string) => parameterRepository.listParameters({ catalogId }))
      )
    ).flat();

    catalogDefinitions.forEach((parameter: ProductParameter) => {
      definitionsById.set(parameter.id.toLowerCase(), parameter);
    });

    const missingIds = parameterIds.filter(
      (parameterId: string) => !definitionsById.has(parameterId.toLowerCase())
    );
    const directDefinitions = await Promise.all(
      missingIds.map(async (parameterId: string) => {
        try {
          return await parameterRepository.getParameterById(parameterId);
        } catch {
          return null;
        }
      })
    );
    directDefinitions.forEach((parameter: ProductParameter | null) => {
      if (parameter) definitionsById.set(parameter.id.toLowerCase(), parameter);
    });
  } catch (error) {
    await ErrorSystem.logWarning('[export-to-base] Failed to resolve parameter labels for export', {
      productId,
      parameterCount: parameterIds.length,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return definitionsById;
};

const buildAutomaticParameterFeatureMappings = async (
  product: BaseExportProductLike,
  productId: string,
  mappings: BaseFieldMapping[]
): Promise<BaseFieldMapping[]> => {
  const parameterRefs = collectProductParameterRefs(product);
  if (parameterRefs.length === 0) return [];

  const explicitlyMappedParameterIds = collectExplicitlyMappedParameterIds(mappings);
  const unmappedRefs = parameterRefs.filter(
    (ref: ProductParameterRef) => !explicitlyMappedParameterIds.has(ref.parameterId.toLowerCase())
  );
  if (unmappedRefs.length === 0) return [];

  const definitionsById = await resolveParameterDefinitionsById(product, unmappedRefs, productId);
  const usedFeatureNames = collectUsedFeatureNames(mappings);

  return unmappedRefs.map((ref: ProductParameterRef) => {
    const definition = definitionsById.get(ref.parameterId.toLowerCase()) ?? null;
    const label = getParameterDefinitionLabel(definition) || ref.fallbackLabel;
    const featureName = makeUniqueFeatureName(label, ref.parameterId, usedFeatureNames);
    return {
      sourceKey: `${BASE_FEATURE_SOURCE_PREFIX}${featureName}`,
      targetField: `${PARAMETER_TARGET_PREFIX}${ref.parameterId}`,
    };
  });
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
  const imageBase64Mode: ImageBase64Mode = data.imageBase64Mode ?? 'base-only';
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
      const templates: Template[] = await listExportTemplates();
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
        const templateRecord = asRecord(template);
        mappings = toBaseFieldMappings(templateRecord?.['mappings']);
        const unsupportedParameterSourceMappings = mappings.filter((mapping) =>
          String(mapping.sourceKey ?? '')
            .trim()
            .toLowerCase()
            .startsWith(UNSUPPORTED_PARAMETER_SOURCE_PREFIX)
        );
        if (unsupportedParameterSourceMappings.length > 0) {
          throw badRequestError(
            `Export template "${template.id}" contains unsupported parameter source mappings. Run "npm run migrate:base-export-template-parameter-sources:v2 -- --write" and retry.`,
            {
              templateId: template.id,
              unsupportedMappingCount: unsupportedParameterSourceMappings.length,
            }
          );
        }
        resolvedTemplateId = template.id;
        const templateExportImagesAsBase64 =
          typeof templateRecord?.['exportImagesAsBase64'] === 'boolean'
            ? templateRecord['exportImagesAsBase64']
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
  }

  if (!imagesOnly) {
    const automaticParameterMappings = await buildAutomaticParameterFeatureMappings(
      product,
      productId,
      mappings
    );
    if (automaticParameterMappings.length > 0) {
      mappings = [...automaticParameterMappings, ...mappings];
    }
  }

  const productProducerIds = !imagesOnly ? collectProducerRefIds(product) : [];
  const productProducerNames = !imagesOnly ? collectProducerNames(product) : [];
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
  let producerLookupIds = productProducerIds;
  let unresolvedProducerNames: string[] = productProducerNames;

  if (!imagesOnly && (productProducerIds.length > 0 || productProducerNames.length > 0)) {
    try {
      const producerRepository: ProducerRepository = await getProducerRepository();
      const resolvedProducerMap = new Map<string, { id: string; name: string }>();
      const addResolvedProducer = (producer: { id?: string | null; name?: string | null } | null): void => {
        const id = typeof producer?.id === 'string' ? producer.id.trim() : '';
        const name = typeof producer?.name === 'string' ? producer.name.trim() : '';
        if (!id || !name || resolvedProducerMap.has(id)) return;
        resolvedProducerMap.set(id, { id, name });
      };

      const resolvedProducers = await Promise.all(
        productProducerIds.map(async (producerId: string) => {
          try {
            return await producerRepository.getProducerById(producerId);
          } catch (error) {
            void ErrorSystem.captureException(error, {
              service: 'base-export-preparation',
              action: 'getProducerById',
              productId,
              producerId,
            });
            return null;
          }
        })
      );

      resolvedProducers.forEach(addResolvedProducer);

      const resolvedProducersByName = await Promise.all(
        productProducerNames.map(async (producerName: string) => {
          try {
            return await producerRepository.findByName(producerName);
          } catch (error) {
            void ErrorSystem.captureException(error, {
              service: 'base-export-preparation',
              action: 'findProducerByName',
              productId,
              producerName,
            });
            return null;
          }
        })
      );

      resolvedProducersByName.forEach(addResolvedProducer);

      const mappedEntries = Array.from(resolvedProducerMap.values()).map(({ id, name }) => [id, name] as const);
      if (mappedEntries.length > 0) {
        producerNameById = Object.fromEntries([
          ...mappedEntries,
          ...mappedEntries.map(([id, name]) => [id.toLowerCase(), name] as const),
        ]);
      }

      const resolvedProducerNameSet = new Set(
        Array.from(resolvedProducerMap.values()).map(({ name }) => name.toLowerCase())
      );
      unresolvedProducerNames = productProducerNames.filter(
        (producerName: string) => !resolvedProducerNameSet.has(producerName.toLowerCase())
      );
      producerLookupIds = Array.from(
        new Set([
          ...productProducerIds,
          ...Array.from(resolvedProducerMap.keys()),
        ])
      );
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'base-export-preparation',
        action: 'resolveProducerNames',
        productId,
        producerCount: productProducerIds.length + productProducerNames.length,
      });
      await ErrorSystem.logWarning('[export-to-base] Failed to resolve producer names for export', {
        productId,
        producerCount: productProducerIds.length + productProducerNames.length,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      const producerMappingRepo = getProducerMappingRepository();
      const producerMappings = await producerMappingRepo.listByInternalProducerIds(
        data.connectionId,
        producerLookupIds
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
      void ErrorSystem.captureException(error, {
        service: 'base-export-preparation',
        action: 'resolveProducerMappings',
        productId,
        producerCount: producerLookupIds.length,
        connectionId: data.connectionId,
      });
      await ErrorSystem.logWarning(
        '[export-to-base] Failed to resolve producer mappings for export',
        {
          productId,
          producerCount: producerLookupIds.length,
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
          } catch (error) {
            void ErrorSystem.captureException(error, {
              service: 'base-export-preparation',
              action: 'getTagById',
              productId,
              tagId,
            });
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
      void ErrorSystem.captureException(error, {
        service: 'base-export-preparation',
        action: 'resolveTagNames',
        productId,
        tagCount: productTagIds.length,
      });
      await ErrorSystem.logWarning('[export-to-base] Failed to resolve tag names for export', {
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
      void ErrorSystem.captureException(error, {
        service: 'base-export-preparation',
        action: 'resolveTagMappings',
        productId,
        tagCount: productTagIds.length,
        connectionId: data.connectionId,
      });
      await ErrorSystem.logWarning('[export-to-base] Failed to resolve tag mappings for export', {
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
    if (hasProducerIdTemplateMapping && unresolvedProducerNames.length > 0) {
      throw badRequestError(
        `No internal producer record found for: ${unresolvedProducerNames.join(', ')}. Re-select the producer on the product and retry.`
      );
    }
    if (hasProducerIdTemplateMapping && producerLookupIds.length > 0) {
      const missingProducerIds = producerLookupIds.filter((producerId: string) => {
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

    const internalCategoryId =
      typeof product.categoryId === 'string' ? product.categoryId.trim() : '';
    if (hasCategoryTemplateMapping && !internalCategoryId) {
      throw badRequestError(
        'Product has no internal category assigned. Assign a category before exporting with category mapping.'
      );
    }

    if (internalCategoryId) {
      const categoryMappingRepo = getCategoryMappingRepository();
      const categoryMappings = await categoryMappingRepo.listByConnection(data.connectionId);
      const productCatalogIds = new Set(
        (product.catalogs ?? []).map((catalog) => (catalog as { catalogId: string }).catalogId)
      );

      const matchingMappings = categoryMappings.filter(
        (mapping: CategoryMappingWithDetails) =>
          mapping.isActive && mapping.internalCategoryId === internalCategoryId
      );
      const validMappings = matchingMappings.filter((mapping: CategoryMappingWithDetails) => {
        const externalCategoryId = toTrimmedString(mapping.externalCategory?.externalId);
        if (!externalCategoryId) return false;
        if (isMissingExternalEntity(mapping.externalCategory?.name, 'category')) {
          return false;
        }
        return true;
      });
      const catalogMatchedMappings = validMappings.filter((mapping: CategoryMappingWithDetails) =>
        productCatalogIds.has(mapping.catalogId)
      );
      const prioritizedMappings =
        catalogMatchedMappings.length > 0 ? catalogMatchedMappings : validMappings;
      const externalCategoryIds = Array.from(
        new Set(
          prioritizedMappings
            .map((mapping: CategoryMappingWithDetails) =>
              toTrimmedString(mapping.externalCategory?.externalId)
            )
            .filter(Boolean)
        )
      );
      if (externalCategoryIds.length > 1) {
        const mappingLabels = prioritizedMappings
          .map((mapping: CategoryMappingWithDetails) => {
            const categoryName = toTrimmedString(mapping.externalCategory?.name);
            const externalId = toTrimmedString(mapping.externalCategory?.externalId);
            if (!externalId) return '';
            return categoryName ? `${categoryName} (${externalId})` : externalId;
          })
          .filter(Boolean);
        if (hasCategoryTemplateMapping) {
          throw badRequestError(
            `Multiple active Base.com category mappings found for this category. Keep only one active mapping and retry. Found: ${mappingLabels.join(', ')}`
          );
        }
        await ErrorSystem.logWarning(
          '[export-to-base] Skipping category export because multiple Base.com category mappings matched the product category.',
          {
            productId,
            connectionId: data.connectionId,
            internalCategoryId,
            mappingLabels,
          }
        );
        exportProduct = {
          ...product,
          categoryId: null,
        } as TProduct;
      } else {
        const selectedMapping = (([...prioritizedMappings].sort(
          (a: CategoryMappingWithDetails, b: CategoryMappingWithDetails) =>
            toTimeMs(b.updatedAt ?? 0) - toTimeMs(a.updatedAt ?? 0)
        )[0] as CategoryMappingWithDetails) ?? null) as CategoryMappingWithDetails | null;

        if (!selectedMapping) {
          if (matchingMappings.length > 0) {
            if (hasCategoryTemplateMapping) {
              throw badRequestError(
                `Category mapping for internal category "${internalCategoryId}" points to stale external categories. Re-fetch categories and re-save mapping in Category Mapper.`
              );
            }
            await ErrorSystem.logWarning(
              '[export-to-base] Skipping category export because the product category mapping is stale.',
              {
                productId,
                connectionId: data.connectionId,
                internalCategoryId,
              }
            );
          } else if (hasCategoryTemplateMapping) {
            throw badRequestError(
              `No Base.com category mapping found for internal category "${internalCategoryId}". Map this category in Category Mapper first.`
            );
          } else {
            await ErrorSystem.logWarning(
              '[export-to-base] Skipping category export because no Base.com category mapping was found.',
              {
                productId,
                connectionId: data.connectionId,
                internalCategoryId,
              }
            );
          }
          exportProduct = {
            ...product,
            categoryId: null,
          } as TProduct;
        } else {
          const mappedExternalCategoryId = toTrimmedString(
            selectedMapping.externalCategory?.externalId
          );
          if (!mappedExternalCategoryId) {
            if (hasCategoryTemplateMapping) {
              throw badRequestError(
                `No Base.com category mapping found for internal category "${internalCategoryId}". Map this category in Category Mapper first.`
              );
            }
            await ErrorSystem.logWarning(
              '[export-to-base] Skipping category export because the selected category mapping has no external id.',
              {
                productId,
                connectionId: data.connectionId,
                internalCategoryId,
                catalogId: selectedMapping.catalogId,
              }
            );
            exportProduct = {
              ...product,
              categoryId: null,
            } as TProduct;
          } else {
            exportProduct = {
              ...product,
              categoryId: mappedExternalCategoryId,
            } as TProduct;

            await ErrorSystem.logInfo('[export-to-base] Resolved category mapping for export', {
              productId,
              connectionId: data.connectionId,
              internalCategoryId,
              mappedExternalCategoryId,
              catalogId: selectedMapping.catalogId,
            });
          }
        }
      }
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
