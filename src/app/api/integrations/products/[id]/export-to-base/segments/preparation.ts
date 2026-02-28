import {
  getExportActiveTemplateId,
  listExportTemplates,
  type ImageBase64Mode,
  type ImageTransformOptions,
  getCategoryMappingRepository,
  getProducerMappingRepository,
  getTagMappingRepository,
  type Template,
} from '@/features/integrations/server';
import {
  getParameterRepository,
  getProducerRepository,
  getTagRepository,
  type ProducerRepository,
} from '@/features/products/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { badRequestError } from '@/shared/errors/app-error';
import { type CategoryMappingWithDetails } from '@/shared/contracts/integrations';
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
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const record = value as Record<string, unknown>;
  const idValue =
    record['producerId'] ?? record['producer_id'] ?? record['manufacturerId'] ?? record['id'];
  if (typeof idValue === 'string') return idValue.trim();
  if (typeof idValue === 'number') return String(idValue);
  return '';
};

const toBaseFieldMappings = (value: unknown): BaseFieldMapping[] => {
  if (!Array.isArray(value)) return [];
  return (value as unknown[]).filter(
    (item): item is BaseFieldMapping =>
      item !== null && typeof item === 'object' && !Array.isArray(item) && 'targetField' in item
  );
};

const parseMappedParameterId = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  const match = trimmed.match(/parameter:([^:]+)/);
  if (match?.[1]) return match[1];
  if (trimmed.startsWith('parameter:')) return trimmed.replace(/^parameter:/, '');
  return '';
};

const remapLegacyParameterSourceMappings = async (args: {
  productId: string;
  product: BaseExportProductLike;
  mappings: BaseFieldMapping[];
}): Promise<BaseFieldMapping[]> => {
  const { mappings } = args;
  const parameterMappings = mappings.filter((m) =>
    String(m['sourceKey'] || '').startsWith('parameter:')
  );
  if (parameterMappings.length === 0) return mappings;

  try {
    const parameterRepository = await getParameterRepository();
    const allParameters = await parameterRepository.listParameters({});
    const paramNameById = new Map<string, string>();
    allParameters.forEach((p) => {
      paramNameById.set(p.id, p.name_en);
      if (p.name_en.toLowerCase() !== p.id.toLowerCase()) {
        paramNameById.set(p.id.toLowerCase(), p.name_en);
      }
    });

    return mappings.map((mapping) => {
      const sourceKey = String(mapping['sourceKey'] || '');
      if (!sourceKey.startsWith('parameter:')) return mapping;
      const parameterId = parseMappedParameterId(sourceKey);
      const parameterName =
        paramNameById.get(parameterId) || paramNameById.get(parameterId.toLowerCase());
      if (parameterName && parameterName !== parameterId) {
        return { ...mapping, sourceKey: `parameter:${parameterName}` };
      }
      return mapping;
    });
  } catch (error) {
    await ErrorSystem.logWarning('[export-to-base] Failed to remap legacy parameter mappings', {
      productId: args.productId,
      error: error instanceof Error ? error.message : String(error),
    });
    return mappings;
  }
};

const validateTemplateParameterMappings = (args: {
  productId: string;
  product: BaseExportProductLike;
  mappings: BaseFieldMapping[];
}): void => {
  const { product, mappings } = args;
  const productParameterNames = new Set(
    (product.parameters ?? []).map((p) => String(p.name || p.id).toLowerCase())
  );
  const templateParameterMappings = mappings.filter((m) =>
    String(m['sourceKey'] || '').startsWith('parameter:')
  );
  const missingParameterNames: string[] = [];
  const emptyParameterNames: string[] = [];
  const emptyParameterIds: string[] = [];

  templateParameterMappings.forEach((mapping) => {
    const sourceKey = String(mapping['sourceKey'] || '');
    const parameterName = parseMappedParameterId(sourceKey);
    if (!parameterName) return;

    if (!productParameterNames.has(parameterName.toLowerCase())) {
      missingParameterNames.push(parameterName);
    } else {
      const productParam = (product.parameters ?? []).find(
        (p) => String(p.name || p.id).toLowerCase() === parameterName.toLowerCase()
      );
      const value = productParam?.value;
      if (value === undefined || value === null || String(value).trim().length === 0) {
        emptyParameterNames.push(parameterName);
        if (productParam?.id) emptyParameterIds.push(productParam.id);
      }
    }
  });

  if (emptyParameterNames.length > 0) {
    void ErrorSystem.logWarning(
      `[export-to-base] Product has empty values for ${emptyParameterNames.length} mapped template parameter(s)`,
      {
        productId: args.productId,
        parameterNames: emptyParameterNames,
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
        const templateRecord = template as unknown as {
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
      const producerRepository: ProducerRepository = await getProducerRepository();
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
      await ErrorSystem.logWarning('[export-to-base] Failed to resolve producer names for export', {
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
        throw badRequestError(
          `Multiple active Base.com category mappings found for this category. Keep only one active mapping and retry. Found: ${mappingLabels.join(', ')}`
        );
      }
      const selectedMapping = (([...prioritizedMappings].sort(
        (a: CategoryMappingWithDetails, b: CategoryMappingWithDetails) =>
          toTimeMs(b.updatedAt ?? 0) - toTimeMs(a.updatedAt ?? 0)
      )[0] as CategoryMappingWithDetails) ?? null) as CategoryMappingWithDetails | null;

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

      await ErrorSystem.logInfo('[export-to-base] Resolved category mapping for export', {
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
