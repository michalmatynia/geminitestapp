import type { BaseProductRecord } from '@/features/integrations/services/imports/base-client';
import {
  collectCustomFieldImportDiagnostics,
  mapBaseProduct,
} from '@/features/integrations/services/imports/base-mapper';
import { applyBaseParameterImport } from '@/features/integrations/services/imports/parameter-import/apply';
import { emitProductCacheInvalidation } from '@/shared/events/products';
import {
  findProductListingByProductAndConnectionAcrossProviders,
} from '@/features/integrations/services/product-listing-repository';
import type { BaseImportItemRecord, BaseImportMode, BaseImportRunRecord } from '@/shared/contracts/integrations/base-com';
import type { BaseParameterImportSummary } from '@/shared/contracts/integrations/parameter-import';
import type { ProductListing } from '@/shared/contracts/integrations/listings';
import type { ProductListingRepository } from '@/shared/contracts/integrations/repositories';
import { defaultBaseImportParameterImportSettings, normalizeBaseImportParameterImportSettings } from '@/shared/contracts/integrations/parameter-import';
import { type ImportTemplateParameterImport } from '@/shared/contracts/integrations/templates';
import type { ParameterRepository } from '@/shared/contracts/products/drafts';
import type {
  ProductCustomFieldDefinition,
  ProductCustomFieldValue,
} from '@/shared/contracts/products/custom-fields';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductRecord, ProductWithImages, ProductParameterValue } from '@/shared/contracts/products/product';
import type { ProductCreateInput, ProductUpdateInput } from '@/shared/contracts/products/io';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import { normalizeProductCustomFieldValues } from '@/shared/lib/products/utils/custom-field-values';
import { validateProductUpdate } from '@/shared/lib/products/validations';
import { listingHasBaseImportProvenance } from '@/features/integrations/services/imports/base-import-provenance';

import {
  MAX_IMAGES_PER_PRODUCT,
  isSkuConflictError,
  toStringId,
  type NormalizedMappedProduct,
  type ProcessItemResult,
  type ProductLookupMaps,
} from './base-import-service-shared';
import {
  classifyByErrorCode,
  createLinkedImage,
  decideImportAction,
  downloadImage,
  formatProductValidationFailure,
  linkImportedProductToBaseListing,
  resolveProducerIds,
  resolveTagIds,
  resolveUniqueSku,
  validateImportedCreateData,
} from './base-import-item-processor-utils';

export { resolveProducerAndTagLookups } from './base-import-item-processor-utils';

export const pickMappedSku = (mapped: NormalizedMappedProduct): string | null => {
  const rawSku = typeof mapped.sku === 'string' ? mapped.sku.trim() : '';
  return rawSku.length > 0 ? rawSku : null;
};

export const normalizeMappedProduct = (
  record: BaseProductRecord,
  mappings: Array<{ sourceKey: string; targetField: string }>,
  preferredCurrencies: string[],
  customFieldDefinitions?: ProductCustomFieldDefinition[]
): NormalizedMappedProduct => {
  const mapped = mapBaseProduct(record, mappings, {
    preferredPriceCurrencies: preferredCurrencies,
    customFieldDefinitions,
  }) as NormalizedMappedProduct;

  const sku = pickMappedSku(mapped);
  mapped.sku = sku ?? '';
  return mapped;
};

const normalizeParameterValues = (input: unknown): ProductParameterValue[] => {
  if (!Array.isArray(input)) return [];
  const byParameterId = new Map<string, ProductParameterValue>();
  input.forEach((entry: unknown) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
    const record = entry as Record<string, unknown>;
    const parameterId =
      typeof record['parameterId'] === 'string' ? record['parameterId'].trim() : '';
    if (!parameterId) return;
    const value = typeof record['value'] === 'string' ? record['value'] : '';
    const valuesByLanguageRaw = record['valuesByLanguage'];
    const valuesByLanguage =
      valuesByLanguageRaw &&
      typeof valuesByLanguageRaw === 'object' &&
      !Array.isArray(valuesByLanguageRaw)
        ? Object.entries(valuesByLanguageRaw as Record<string, unknown>).reduce(
          (acc: Record<string, string>, [languageCode, languageValue]: [string, unknown]) => {
            const normalizedLanguageCode = languageCode.trim().toLowerCase();
            if (!normalizedLanguageCode || typeof languageValue !== 'string') return acc;
            acc[normalizedLanguageCode] = languageValue;
            return acc;
          },
          {}
        )
        : {};
    byParameterId.set(parameterId, {
      parameterId,
      value,
      ...(Object.keys(valuesByLanguage).length > 0 ? { valuesByLanguage } : {}),
    });
  });
  return Array.from(byParameterId.values());
};

const mergeParameterValues = (
  base: ProductParameterValue[],
  overrides: ProductParameterValue[]
): ProductParameterValue[] => {
  const byParameterId = new Map<string, ProductParameterValue>();
  normalizeParameterValues(base).forEach((entry: ProductParameterValue) => {
    byParameterId.set(entry.parameterId, entry);
  });
  normalizeParameterValues(overrides).forEach((entry: ProductParameterValue) => {
    byParameterId.set(entry.parameterId, entry);
  });
  return Array.from(byParameterId.values());
};

const stripLinkedParameterValues = (input: {
  values: ProductParameterValue[];
  parameters: ProductParameter[] | undefined;
}): ProductParameterValue[] => {
  const linkedParameterIds = new Set(
    (input.parameters ?? [])
      .filter((parameter: ProductParameter): boolean => Boolean(parameter.linkedTitleTermType))
      .map((parameter: ProductParameter) => parameter.id)
  );
  if (linkedParameterIds.size === 0) {
    return normalizeParameterValues(input.values);
  }
  return normalizeParameterValues(input.values).filter(
    (entry: ProductParameterValue): boolean => !linkedParameterIds.has(entry.parameterId)
  );
};

const buildLinkedParameterPlaceholders = (
  parameters: ProductParameter[] | undefined
): ProductParameterValue[] =>
  (parameters ?? []).reduce(
    (acc: ProductParameterValue[], parameter: ProductParameter): ProductParameterValue[] => {
      if (!parameter.linkedTitleTermType) return acc;
      acc.push({
        parameterId: parameter.id,
        value: '',
      });
      return acc;
    },
    []
  );

const mergeCustomFieldValues = (
  base: ProductCustomFieldValue[],
  overrides: ProductCustomFieldValue[]
): ProductCustomFieldValue[] => {
  const byFieldId = new Map<string, ProductCustomFieldValue>();
  normalizeProductCustomFieldValues(base).forEach((entry: ProductCustomFieldValue) => {
    byFieldId.set(entry.fieldId, entry);
  });
  normalizeProductCustomFieldValues(overrides).forEach((entry: ProductCustomFieldValue) => {
    byFieldId.set(entry.fieldId, entry);
  });
  return Array.from(byFieldId.values());
};

type ParameterImportSummary = BaseParameterImportSummary;

type CustomFieldImportMetadata = {
  seededFieldNames: string[];
  autoMatchedFieldNames: string[];
  explicitMappedFieldNames: string[];
  skippedFieldNames: string[];
  overriddenFieldNames: string[];
};

type ParameterImportResult = {
  applied: boolean;
  parameters: ProductParameterValue[];
  summary: ParameterImportSummary;
};

const buildCustomFieldImportMetadata = (input: {
  seededFieldNames?: string[];
  autoMatchedFieldNames?: string[];
  explicitMappedFieldNames?: string[];
  skippedFieldNames?: string[];
  overriddenFieldNames?: string[];
}): CustomFieldImportMetadata | null => {
  const normalize = (values: string[] | undefined): string[] =>
    Array.from(
      new Set(
        (values ?? [])
          .map((value: string): string => value.trim())
          .filter((value: string): boolean => value.length > 0)
      )
    ).sort((left: string, right: string) => left.localeCompare(right));

  const seededFieldNames = normalize(input.seededFieldNames);
  const autoMatchedFieldNames = normalize(input.autoMatchedFieldNames);
  const explicitMappedFieldNames = normalize(input.explicitMappedFieldNames);
  const skippedFieldNames = normalize(input.skippedFieldNames);
  const overriddenFieldNames = normalize(input.overriddenFieldNames);

  if (
    seededFieldNames.length === 0 &&
    autoMatchedFieldNames.length === 0 &&
    explicitMappedFieldNames.length === 0 &&
    skippedFieldNames.length === 0 &&
    overriddenFieldNames.length === 0
  ) {
    return null;
  }

  return {
    seededFieldNames,
    autoMatchedFieldNames,
    explicitMappedFieldNames,
    skippedFieldNames,
    overriddenFieldNames,
  };
};

export const importSingleItem = async (input: {
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
  parameterRepository: ParameterRepository;
  imageMode: 'links' | 'download';
  dryRun: boolean;
  inventoryId: string;
  mode: BaseImportMode;
  forceCreateNewProduct: boolean;
  persistBaseSyncIdentity: boolean;
  allowDuplicateSku: boolean;
  parameterImportSettings?: ImportTemplateParameterImport;
  customFieldDefinitions?: ProductCustomFieldDefinition[];
  customFieldImportSeededFieldNames?: string[];
  catalogLanguageCodes?: string[];
  defaultLanguageCode?: string | null;
  prefetchedParameters?: ProductParameter[];
  prefetchedLinks?: Record<string, string>;
  prefetchedProductsByBaseId?: Map<string, ProductWithImages>;
  prefetchedProductsBySku?: Map<string, ProductWithImages>;
  prefetchedListings?: Map<
    string,
    { listing: ProductListing; repository: ProductListingRepository }
  >;
}): Promise<ProcessItemResult> => {
  const mapped = normalizeMappedProduct(
    input.raw,
    input.templateMappings,
    input.preferredPriceCurrencies,
    input.customFieldDefinitions
  );
  const templateMappedParameterValues = normalizeParameterValues(mapped.parameters);
  const templateMappedCustomFieldValues = normalizeProductCustomFieldValues(mapped.customFields);
  const customFieldDiagnostics = collectCustomFieldImportDiagnostics(
    input.raw,
    input.templateMappings,
    input.customFieldDefinitions
  );
  const touchedCustomFieldNames = new Set<string>([
    ...customFieldDiagnostics.autoMatchedFieldNames,
    ...customFieldDiagnostics.explicitMappedFieldNames,
    ...customFieldDiagnostics.skippedFieldNames,
    ...customFieldDiagnostics.overriddenFieldNames,
  ]);
  const customFieldImportMetadata = buildCustomFieldImportMetadata({
    seededFieldNames: (input.customFieldImportSeededFieldNames ?? []).filter((fieldName: string) =>
      touchedCustomFieldNames.has(fieldName)
    ),
    autoMatchedFieldNames: customFieldDiagnostics.autoMatchedFieldNames,
    explicitMappedFieldNames: customFieldDiagnostics.explicitMappedFieldNames,
    skippedFieldNames: customFieldDiagnostics.skippedFieldNames,
    overriddenFieldNames: customFieldDiagnostics.overriddenFieldNames,
  });
  const resultMetadata = customFieldImportMetadata
    ? { metadata: { customFieldImport: customFieldImportMetadata } }
    : {};
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
    ? (input.prefetchedProductsByBaseId?.get(mappedBaseProductId) ??
      (await input.productRepository.findProductByBaseId(mappedBaseProductId)))
    : null;
  const existingBySku = mappedSku
    ? (input.prefetchedProductsBySku?.get(mappedSku) ??
      (await input.productRepository.getProductBySku(mappedSku)))
    : null;

  const decision = decideImportAction({
    mode: input.mode,
    forceCreateNewProduct: input.forceCreateNewProduct,
    allowDuplicateSku: input.allowDuplicateSku,
    mappedBaseProductId,
    mappedSku,
    existingByBaseId,
    existingBySku,
  });

  if (decision.type === 'skip') {
    const classified = classifyByErrorCode(decision.code);
    return {
      ...resultMetadata,
      status: 'skipped',
      action: input.dryRun ? 'dry_run' : 'skipped',
      baseProductId: mappedBaseProductId,
      sku: mappedSku,
      errorCode: decision.code,
      errorClass: classified.errorClass,
      retryable: classified.retryable,
      errorMessage: decision.message,
      payloadSnapshot: mapped,
    };
  }

  if (decision.type === 'fail') {
    const classified = classifyByErrorCode(decision.code);
    return {
      ...resultMetadata,
      status: 'failed',
      action: 'failed',
      baseProductId: mappedBaseProductId,
      sku: mappedSku,
      errorCode: decision.code,
      errorClass: classified.errorClass,
      retryable: classified.retryable,
      errorMessage: decision.message,
      payloadSnapshot: mapped,
    };
  }

  if (decision.type === 'update') {
    const existingListing =
      input.prefetchedListings?.get(decision.target.id) ??
      (await findProductListingByProductAndConnectionAcrossProviders(
        decision.target.id,
        input.connectionId
      ));
    const shouldBackfillImportSource =
      decision.target.importSource === 'base' ||
      listingHasBaseImportProvenance(existingListing?.listing);

    const parameterImportResult = (await applyBaseParameterImport({
      record: input.raw,
      catalogId: input.targetCatalogId,
      connectionId: input.connectionId,
      inventoryId: input.inventoryId,
      parameterRepository: input.parameterRepository,
      existingValues: Array.isArray(decision.target.parameters) ? decision.target.parameters : [],
      catalogLanguageCodes: input.catalogLanguageCodes ?? [],
      defaultLanguageCode: input.defaultLanguageCode ?? null,
      settings: normalizeBaseImportParameterImportSettings(
        input.parameterImportSettings ?? defaultBaseImportParameterImportSettings
      ),
      templateMappings: input.templateMappings,
      prefetchedParameters: input.prefetchedParameters,
      prefetchedLinks: input.prefetchedLinks,
    })) as ParameterImportResult;
    const parameterImportSummary: ParameterImportSummary | null = parameterImportResult.applied
      ? parameterImportResult.summary
      : null;
    const shouldResolveLinkedParameters =
      parameterImportResult.applied || templateMappedParameterValues.length > 0;
    const mergedImportedParameterValues = mergeParameterValues(
      parameterImportResult.applied ? parameterImportResult.parameters : [],
      templateMappedParameterValues
    );
    const resolvedParameterValues = shouldResolveLinkedParameters
      ? mergeParameterValues(
        stripLinkedParameterValues({
          values: mergedImportedParameterValues,
          parameters: input.prefetchedParameters,
        }),
        buildLinkedParameterPlaceholders(input.prefetchedParameters)
      )
      : [];
    mapped.parameters = resolvedParameterValues.length > 0 ? resolvedParameterValues : undefined;
    const resolvedCustomFieldValues = mergeCustomFieldValues(
      Array.isArray(decision.target.customFields) ? decision.target.customFields : [],
      templateMappedCustomFieldValues
    );
    mapped.customFields =
      templateMappedCustomFieldValues.length > 0 ? resolvedCustomFieldValues : undefined;

    const updateData: ProductUpdateInput = {
      baseProductId: mappedBaseProductId ?? decision.target.baseProductId ?? null,
      ...(shouldBackfillImportSource ? { importSource: 'base' as const } : {}),
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
      ...(templateMappedCustomFieldValues.length > 0
        ? { customFields: resolvedCustomFieldValues }
        : {}),
      ...(shouldResolveLinkedParameters ? { parameters: resolvedParameterValues } : {}),
    };

    if (mappedSku && !input.allowDuplicateSku && mappedSku !== decision.target.sku) {
      const skuOwner = await input.productRepository.getProductBySku(mappedSku);
      if (skuOwner && skuOwner.id !== decision.target.id) {
        const classified = classifyByErrorCode('DUPLICATE_SKU');
        return {
          ...resultMetadata,
          status: 'skipped',
          action: input.dryRun ? 'dry_run' : 'skipped',
          baseProductId: mappedBaseProductId,
          sku: mappedSku,
          errorCode: 'DUPLICATE_SKU',
          errorClass: classified.errorClass,
          retryable: classified.retryable,
          errorMessage: `SKU ${mappedSku} already belongs to another product.`,
          payloadSnapshot: mapped,
          parameterImportSummary,
        };
      }
    }

    const validationResult = await validateProductUpdate(updateData);
    if (!validationResult.success) {
      const classified = classifyByErrorCode('VALIDATION_ERROR');
      return {
        ...resultMetadata,
        status: 'failed',
        action: 'failed',
        baseProductId: mappedBaseProductId,
        sku: mappedSku,
        errorCode: 'VALIDATION_ERROR',
        errorClass: classified.errorClass,
        retryable: classified.retryable,
        errorMessage: formatProductValidationFailure(
          mappedSku ?? mappedBaseProductId ?? input.item.itemId,
          validationResult.errors
        ),
        payloadSnapshot: mapped,
        parameterImportSummary,
      };
    }

    if (input.dryRun) {
      return {
        ...resultMetadata,
        status: 'updated',
        action: 'dry_run',
        importedProductId: decision.target.id,
        baseProductId: mappedBaseProductId,
        sku: mappedSku,
        payloadSnapshot: mapped,
        parameterImportSummary,
      };
    }

    const updated = await input.productRepository.updateProduct(
      decision.target.id,
      validationResult.data
    );

    if (!updated) {
      throw new Error(`Failed to update product ${decision.target.id}`);
    }

    await input.productRepository.replaceProductCatalogs(updated.id, [input.targetCatalogId]);
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
      existingListing,
    });
    emitProductCacheInvalidation();

    return {
      ...resultMetadata,
      status: 'updated',
      action: 'updated',
      importedProductId: updated.id,
      baseProductId: mappedBaseProductId,
      sku: mappedSku,
      payloadSnapshot: mapped,
      parameterImportSummary,
    };
  }

  let skuForCreate = mappedSku;
  if (!skuForCreate) {
    const classified = classifyByErrorCode('MISSING_SKU');
    return {
      ...resultMetadata,
      status: 'failed',
      action: 'failed',
      baseProductId: mappedBaseProductId,
      sku: mappedSku,
      errorCode: 'MISSING_SKU',
      errorClass: classified.errorClass,
      retryable: classified.retryable,
      errorMessage: 'Cannot create product without SKU.',
      payloadSnapshot: mapped,
    };
  }

  const shouldResolveDuplicateSkuByCreating =
    input.allowDuplicateSku || input.forceCreateNewProduct;

  if (existingBySku && shouldResolveDuplicateSkuByCreating) {
    skuForCreate = await resolveUniqueSku(
      input.productRepository,
      skuForCreate,
      mappedBaseProductId
    );
  }

  const shouldPersistImportProvenance =
    input.persistBaseSyncIdentity || Boolean(input.run.params.directTarget);

  const createData: ProductCreateInput = {
    ...mapped,
    sku: skuForCreate,
    baseProductId: input.persistBaseSyncIdentity ? mappedBaseProductId ?? null : null,
    importSource: shouldPersistImportProvenance ? 'base' : null,
    defaultPriceGroupId: input.defaultPriceGroupId,
    imageLinks: imageUrls,
  };

  const parameterImportResult = (await applyBaseParameterImport({
    record: input.raw,
    catalogId: input.targetCatalogId,
    connectionId: input.connectionId,
    inventoryId: input.inventoryId,
    parameterRepository: input.parameterRepository,
    existingValues: [],
    catalogLanguageCodes: input.catalogLanguageCodes ?? [],
    defaultLanguageCode: input.defaultLanguageCode ?? null,
    settings: normalizeBaseImportParameterImportSettings(
      input.parameterImportSettings ?? defaultBaseImportParameterImportSettings
    ),
    templateMappings: input.templateMappings,
    prefetchedParameters: input.prefetchedParameters,
    prefetchedLinks: input.prefetchedLinks,
  })) as ParameterImportResult;
  const parameterImportSummary: ParameterImportSummary | null = parameterImportResult.applied
    ? parameterImportResult.summary
    : null;
  const shouldResolveLinkedParameters =
    parameterImportResult.applied || templateMappedParameterValues.length > 0;
  const mergedImportedParameterValues = mergeParameterValues(
    parameterImportResult.applied ? parameterImportResult.parameters : [],
    templateMappedParameterValues
  );
  const resolvedParameterValues = shouldResolveLinkedParameters
    ? mergeParameterValues(
      stripLinkedParameterValues({
        values: mergedImportedParameterValues,
        parameters: input.prefetchedParameters,
      }),
      buildLinkedParameterPlaceholders(input.prefetchedParameters)
    )
    : mergedImportedParameterValues;
  const resolvedCustomFieldValues = normalizeProductCustomFieldValues(mapped.customFields);
  if (resolvedParameterValues.length > 0) {
    createData.parameters = resolvedParameterValues;
    mapped.parameters = resolvedParameterValues;
  } else {
    mapped.parameters = undefined;
  }
  if (resolvedCustomFieldValues.length > 0) {
    createData.customFields = resolvedCustomFieldValues;
    mapped.customFields = resolvedCustomFieldValues;
  } else {
    mapped.customFields = undefined;
  }

  const validationResult = await validateImportedCreateData(createData);
  if (!validationResult.success) {
    const classified = classifyByErrorCode('VALIDATION_ERROR');
    return {
      ...resultMetadata,
      status: 'failed',
      action: 'failed',
      baseProductId: mappedBaseProductId,
      sku: skuForCreate,
      errorCode: 'VALIDATION_ERROR',
      errorClass: classified.errorClass,
      retryable: classified.retryable,
      errorMessage: formatProductValidationFailure(skuForCreate, validationResult.errors),
      payloadSnapshot: mapped,
      parameterImportSummary,
    };
  }

  if (input.dryRun) {
    return {
      ...resultMetadata,
      status: 'imported',
      action: 'dry_run',
      baseProductId: mappedBaseProductId,
      sku: skuForCreate,
      payloadSnapshot: mapped,
      parameterImportSummary,
    };
  }

  let created: ProductRecord | null;
  try {
    created = await input.productRepository.createProduct(validationResult.data);
  } catch (error: unknown) {
    if (isSkuConflictError(error) && shouldResolveDuplicateSkuByCreating) {
      const fallbackSku = await resolveUniqueSku(
        input.productRepository,
        skuForCreate,
        mappedBaseProductId
      );
      const fallbackValidation = await validateImportedCreateData({
        ...createData,
        sku: fallbackSku,
      });
      if (!fallbackValidation.success) {
        throw new Error(`Validation failed for fallback SKU ${fallbackSku}`, { cause: error });
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

  await input.productRepository.replaceProductCatalogs(created.id, [input.targetCatalogId]);
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

  if (shouldPersistImportProvenance) {
    await linkImportedProductToBaseListing({
      product: created,
      baseIntegrationId: input.baseIntegrationId,
      connectionId: input.connectionId,
      inventoryId: input.inventoryId,
      baseProductId: mappedBaseProductId,
      existingListing: input.prefetchedListings?.get(created.id) ?? null,
    });
  }
  emitProductCacheInvalidation();

  return {
    ...resultMetadata,
    status: 'imported',
    action: 'imported',
    importedProductId: created.id,
    baseProductId: mappedBaseProductId,
    sku: skuForCreate,
    payloadSnapshot: mapped,
    parameterImportSummary,
  };
};
