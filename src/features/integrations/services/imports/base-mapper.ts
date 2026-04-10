import { randomUUID } from 'crypto';

import type { BaseProductRecord } from '@/features/integrations/services/imports/base-client';
import type { IntegrationTemplateMapping as TemplateMapping } from '@/shared/contracts/integrations';
import { parseProductCustomFieldTarget } from '@/shared/contracts/integrations/import-template-targets';
import type {
  ProductCustomFieldDefinition,
  ProductCustomFieldValue,
} from '@/shared/contracts/products/custom-fields';
import type { ProductCreateInput } from '@/shared/contracts/products/io';
import {
  normalizeProductCustomFieldValues,
} from '@/shared/lib/products/utils/custom-field-values';

import {
  MARKET_EXCLUSION_FIELD_NAME,
  normalizeBaseMarketplaceCheckboxKey,
  resolveBaseMarketExclusionOptionStates,
  resolveBaseMarketplaceCheckboxValue,
} from '@/shared/lib/integrations/base-marketplace-checkboxes';

import {
  autoExtractProducerIds,
  autoExtractTagIds,
  getImageUrlsForAll as extractImageUrlsForAll,
  getImageUrlsForAll,
  getImageUrlsForLinks,
  getImageUrlsForSlots,
  mergeCheckboxOptionSelection,
  normalizeImportedStructuredName,
  normalizePreferredCurrencies,
  normalizeProducerIds,
  normalizeTagIds,
  NUMBER_FIELDS,
  pickFirstIntFromObject,
  pickInt,
  pickNestedInt,
  pickNestedString,
  pickPriceByPreferredCurrency,
  pickString,
  PRODUCER_TARGET_FIELDS,
  resolveCheckboxOptionId,
  resolveImageTargetIndex,
  TAG_TARGET_FIELDS,
  toCheckboxValue,
  toIntValue,
  toStringValue,
  getByPath,
} from './base-mapper-utils';

export type BaseCustomFieldImportDiagnostics = {
  autoMatchedFieldIds: string[];
  autoMatchedFieldNames: string[];
  explicitMappedFieldIds: string[];
  explicitMappedFieldNames: string[];
  skippedFieldIds: string[];
  skippedFieldNames: string[];
  overriddenFieldIds: string[];
  overriddenFieldNames: string[];
};

const collectTemplateParameterBuckets = (record: BaseProductRecord): unknown[] => {
  const buckets: unknown[] = [];
  const pushBucket = (value: unknown): void => {
    if (value === null || value === undefined) return;
    buckets.push(value);
  };

  pushBucket(record['parameters']);
  pushBucket(record['params']);
  pushBucket(record['attributes']);
  pushBucket(record['features']);
  pushBucket(record['feature']);

  const textFields =
    record['text_fields'] && typeof record['text_fields'] === 'object'
      ? (record['text_fields'] as Record<string, unknown>)
      : null;
  if (!textFields) {
    return buckets;
  }

  pushBucket(textFields);
  pushBucket(textFields['features']);
  pushBucket(textFields['parameters']);

  Object.entries(textFields).forEach(([key, value]: [string, unknown]) => {
    const normalizedKey = key.trim().toLowerCase();
    if (!normalizedKey) return;
    if (
      normalizedKey.startsWith('features|') ||
      normalizedKey.startsWith('parameters|') ||
      normalizedKey.startsWith('params|') ||
      normalizedKey.startsWith('attributes|')
    ) {
      pushBucket(value);
    }
  });

  return buckets;
};

const normalizeLookupKey = (value: string): string => {
  const trimmed = value.trim();
  const separatorIndex = trimmed.indexOf('|');
  const scopedKey =
    separatorIndex > 0 && /^[a-z0-9_-]{2,10}$/i.test(trimmed.slice(separatorIndex + 1))
      ? trimmed.slice(0, separatorIndex)
      : trimmed;
  return scopedKey.trim().toLowerCase();
};

const findObjectEntryByNormalizedKey = (
  record: Record<string, unknown>,
  key: string
): [string, unknown] | null => {
  if (key in record) {
    return [key, record[key]];
  }
  const normalizedKey = normalizeLookupKey(key);
  return (
    Object.entries(record).find(
      ([candidateKey]: [string, unknown]) => normalizeLookupKey(candidateKey) === normalizedKey
    ) ?? null
  );
};

const extractOptionValueFromArray = (entries: unknown[], optionKey: string): unknown => {
  const normalizedOptionKey = normalizeLookupKey(optionKey);

  for (const entry of entries) {
    const scalar = toStringValue(entry);
    if (scalar && normalizeLookupKey(scalar) === normalizedOptionKey) {
      return true;
    }

    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;

    const record = entry as Record<string, unknown>;
    const optionName = toStringValue(
      record['name'] ??
        record['parameter'] ??
        record['code'] ??
        record['label'] ??
        record['title'] ??
        record['value'] ??
        record['text']
    );
    if (!optionName || normalizeLookupKey(optionName) !== normalizedOptionKey) continue;

    const explicitState =
      record['selected'] ??
      record['checked'] ??
      record['active'] ??
      record['enabled'] ??
      record['is_selected'] ??
      record['isSelected'];
    if (explicitState !== undefined) {
      return explicitState;
    }

    return true;
  }

  return null;
};

const resolveCompoundParameterValue = (
  record: Record<string, unknown>,
  sourceKey: string
): unknown => {
  const pathSegments = sourceKey
    .split('.')
    .map((segment: string) => segment.trim())
    .filter((segment: string): boolean => segment.length > 0);
  if (pathSegments.length < 2) return null;

  const headSegment = pathSegments[0];
  if (!headSegment) return null;
  const tailSegments = pathSegments.slice(1);
  const normalizedHeadSegment = normalizeLookupKey(headSegment);
  const name = toStringValue(
    record['name'] ?? record['parameter'] ?? record['code'] ?? record['label'] ?? record['title']
  );
  const id = toStringValue(
    record['id'] ?? record['parameter_id'] ?? record['param_id'] ?? record['attribute_id']
  );
  const headMatches =
    (name && normalizeLookupKey(name) === normalizedHeadSegment) ||
    (id && normalizeLookupKey(id) === normalizedHeadSegment);
  if (!headMatches) return null;

  const nestedCandidates = [
    record['value'],
    record['values'],
    record['options'],
    record['items'],
    record['children'],
    record['data'],
  ];

  for (const candidate of nestedCandidates) {
    const resolved = resolveValueByNormalizedPath(candidate, tailSegments);
    if (resolved !== null && resolved !== undefined) {
      return resolved;
    }
  }

  return null;
};

const resolveValueByNormalizedPath = (value: unknown, pathSegments: string[]): unknown => {
  if (value === null || value === undefined) return null;
  if (pathSegments.length === 0) return value;
  const currentSegment = pathSegments[0];
  if (!currentSegment) return null;

  if (Array.isArray(value)) {
    if (pathSegments.length === 1) {
      return extractOptionValueFromArray(value, currentSegment);
    }

    for (const entry of value) {
      const resolved = resolveValueByNormalizedPath(entry, pathSegments);
      if (resolved !== null && resolved !== undefined) {
        return resolved;
      }
    }

    return null;
  }

  if (typeof value !== 'object') {
    if (pathSegments.length !== 1) return null;
    const scalar = toStringValue(value);
    if (!scalar) return null;
    return normalizeLookupKey(scalar) === normalizeLookupKey(currentSegment) ? true : null;
  }

  const record = value as Record<string, unknown>;
  const directEntry = findObjectEntryByNormalizedKey(record, currentSegment);
  if (directEntry) {
    return resolveValueByNormalizedPath(directEntry[1], pathSegments.slice(1));
  }

  if (pathSegments.length > 1) {
    const compoundValue = resolveCompoundParameterValue(record, pathSegments.join('.'));
    if (compoundValue !== null && compoundValue !== undefined) {
      return compoundValue;
    }
  }

  return null;
};

const findParameterValue = (params: unknown, sourceKey: string): unknown => {
  if (!params) return null;
  const normalizedSourceKey = normalizeLookupKey(sourceKey);
  if (!normalizedSourceKey) return null;
  const getFromParameterRecord = (record: Record<string, unknown>): unknown => {
    if (sourceKey.includes('.')) {
      const compoundValue = resolveCompoundParameterValue(record, sourceKey);
      if (compoundValue !== null && compoundValue !== undefined) {
        return compoundValue;
      }
    }
    const name = toStringValue(
      record['name'] ?? record['parameter'] ?? record['code'] ?? record['label'] ?? record['title']
    );
    const id = toStringValue(
      record['id'] ?? record['parameter_id'] ?? record['param_id'] ?? record['attribute_id']
    );
    if (
      (name && normalizeLookupKey(name) === normalizedSourceKey) ||
      (id && normalizeLookupKey(id) === normalizedSourceKey)
    ) {
      return (
        record['value'] ??
        record['values'] ??
        record['value_id'] ??
        record['label'] ??
        record['text']
      );
    }
    return null;
  };
  if (Array.isArray(params)) {
    for (const entry of params) {
      if (!entry || typeof entry !== 'object') continue;
      const record = entry as Record<string, unknown>;
      const fromRecord = getFromParameterRecord(record);
      if (fromRecord !== null && fromRecord !== undefined) return fromRecord;
    }
    return null;
  }
  if (typeof params === 'object') {
    const record = params as Record<string, unknown>;
    if (sourceKey.includes('.')) {
      const byPath = resolveValueByNormalizedPath(
        record,
        sourceKey
          .split('.')
          .map((segment: string) => segment.trim())
          .filter((segment: string): boolean => segment.length > 0)
      );
      if (byPath !== null && byPath !== undefined) {
        return byPath;
      }
    }
    if (sourceKey in record) return record[sourceKey];
    const byNormalizedKey = Object.entries(record).find(
      ([key]: [string, unknown]) => normalizeLookupKey(key) === normalizedSourceKey
    );
    if (byNormalizedKey) {
      return byNormalizedKey[1];
    }
    for (const value of Object.values(record)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      const fromRecord = getFromParameterRecord(value as Record<string, unknown>);
      if (fromRecord !== null && fromRecord !== undefined) return fromRecord;
    }
  }
  return null;
};

const resolveTemplateValue = (record: BaseProductRecord, sourceKey: string): unknown => {
  if (!sourceKey) return null;
  const normalized = sourceKey.trim().toLowerCase();
  if (normalized === 'image_slots_all') {
    return getImageUrlsForSlots(record);
  }
  if (normalized === 'image_links_all') {
    return getImageUrlsForLinks(record);
  }
  if (normalized === 'images_all') {
    return getImageUrlsForAll(record);
  }
  if (normalized.startsWith('image_slot_')) {
    const index = parseInt(normalized.replace('image_slot_', ''), 10);
    if (Number.isNaN(index)) return null;
    return getImageUrlsForSlots(record)[index - 1] ?? null;
  }
  if (normalized.startsWith('image_file_')) {
    const index = parseInt(normalized.replace('image_file_', ''), 10);
    if (Number.isNaN(index)) return null;
    return getImageUrlsForSlots(record)[index - 1] ?? null;
  }
  if (normalized.startsWith('image_link_')) {
    const index = parseInt(normalized.replace('image_link_', ''), 10);
    if (Number.isNaN(index)) return null;
    return getImageUrlsForLinks(record)[index - 1] ?? null;
  }
  if (normalized.startsWith('image_')) {
    const index = parseInt(normalized.replace('image_', ''), 10);
    if (Number.isNaN(index)) return null;
    return getImageUrlsForAll(record)[index - 1] ?? null;
  }
  if (sourceKey.includes('.')) {
    const pathParts = sourceKey.split('.').map((part: string) => part.trim());
    const value = getByPath(record, pathParts);
    if (value !== null && value !== undefined) return value;
  }
  if (sourceKey in record) {
    return record[sourceKey];
  }
  const marketplaceCheckboxValue = resolveBaseMarketplaceCheckboxValue(record, sourceKey);
  if (marketplaceCheckboxValue !== null && marketplaceCheckboxValue !== undefined) {
    return marketplaceCheckboxValue;
  }
  const parameterBuckets = collectTemplateParameterBuckets(record);
  for (const bucket of parameterBuckets) {
    const parameterValue = findParameterValue(bucket, sourceKey);
    if (parameterValue !== null && parameterValue !== undefined) {
      return parameterValue;
    }
  }
  return null;
};

const buildSourceKeyCandidates = (label: string, parentLabel?: string): string[] => {
  const trimmedLabel = label.trim();
  if (!trimmedLabel) return [];

  const baseVariants = Array.from(
    new Set(
      [
        trimmedLabel,
        trimmedLabel.toLowerCase(),
        trimmedLabel.replace(/\s+/g, '_'),
        trimmedLabel.replace(/\s+/g, '_').toLowerCase(),
        trimmedLabel.replace(/\s+/g, '-'),
        trimmedLabel.replace(/\s+/g, '-').toLowerCase(),
        trimmedLabel.replace(/\s+/g, ''),
        trimmedLabel.replace(/\s+/g, '').toLowerCase(),
      ].filter((candidate): candidate is string => candidate.length > 0)
    )
  );

  const parentVariants = parentLabel ? buildSourceKeyCandidates(parentLabel) : [];
  return Array.from(
    new Set([
      ...baseVariants,
      ...parentVariants.flatMap((parentVariant) =>
        baseVariants.flatMap((baseVariant) => [
          `${parentVariant}.${baseVariant}`,
          `${parentVariant}_${baseVariant}`,
          `${parentVariant}-${baseVariant}`,
        ])
      ),
    ])
  );
};

const resolveAutoTemplateValue = (
  record: BaseProductRecord,
  label: string,
  parentLabel?: string
): unknown => {
  const candidates = buildSourceKeyCandidates(label, parentLabel);
  for (const candidate of candidates) {
    const value = resolveTemplateValue(record, candidate);
    if (value !== null && value !== undefined) {
      return value;
    }
  }
  return null;
};

const autoExtractCustomFieldValues = (
  record: BaseProductRecord,
  customFieldDefinitions: ProductCustomFieldDefinition[] | undefined
): ProductCustomFieldValue[] => {
  if (!Array.isArray(customFieldDefinitions) || customFieldDefinitions.length === 0) {
    return [];
  }

  const customFieldValuesById = new Map<string, ProductCustomFieldValue>();

  customFieldDefinitions.forEach((customField: ProductCustomFieldDefinition) => {
    const fieldId = customField.id.trim();
    const fieldName = customField.name.trim();
    if (!fieldId || !fieldName) return;

    if (customField.type === 'checkbox_set') {
      const marketExclusionStates =
        normalizeBaseMarketplaceCheckboxKey(fieldName) ===
        normalizeBaseMarketplaceCheckboxKey(MARKET_EXCLUSION_FIELD_NAME)
          ? resolveBaseMarketExclusionOptionStates(record, customFieldDefinitions)
          : null;
      let matchedAnyOption = false;
      customField.options.forEach((option) => {
        const optionId = option.id.trim();
        const optionLabel = option.label.trim();
        if (!optionId || !optionLabel) return;

        const rawValue =
          resolveAutoTemplateValue(record, optionLabel, fieldName) ??
          resolveAutoTemplateValue(record, `${optionLabel} Yes`, fieldName);
        if (rawValue !== null && rawValue !== undefined) {
          matchedAnyOption = true;
          mergeCheckboxOptionSelection(
            customFieldValuesById,
            fieldId,
            optionId,
            toCheckboxValue(rawValue)
          );
          return;
        }

        if (!marketExclusionStates?.has(optionId)) return;

        matchedAnyOption = true;
        mergeCheckboxOptionSelection(
          customFieldValuesById,
          fieldId,
          optionId,
          marketExclusionStates.get(optionId) ?? false
        );
      });

      if (!matchedAnyOption) return;
      if (!customFieldValuesById.has(fieldId)) {
        customFieldValuesById.set(fieldId, {
          fieldId,
          selectedOptionIds: [],
        });
      }
      return;
    }

    const rawValue = resolveAutoTemplateValue(record, fieldName);
    if (rawValue === null || rawValue === undefined) return;

    const textValue = toStringValue(rawValue);
    if (textValue === null) return;

    customFieldValuesById.set(fieldId, {
      fieldId,
      textValue,
    });
  });

  return normalizeProductCustomFieldValues(Array.from(customFieldValuesById.values()));
};

const normalizeCustomFieldValueForComparison = (
  value: ProductCustomFieldValue | undefined
): ProductCustomFieldValue | null => {
  if (!value) return null;
  return normalizeProductCustomFieldValues([value])[0] ?? null;
};

const serializeNormalizedCustomFieldValue = (
  value: ProductCustomFieldValue | undefined
): string => JSON.stringify(normalizeCustomFieldValueForComparison(value));

const sortUniqueStrings = (values: Iterable<string>): string[] =>
  Array.from(new Set(Array.from(values).filter((value: string): boolean => value.trim().length > 0))).sort(
    (left: string, right: string) => left.localeCompare(right)
  );

const createCustomFieldNameResolver = (
  customFieldDefinitions: ProductCustomFieldDefinition[] | undefined
): ((fieldId: string) => string) => {
  const fieldNameById = new Map<string, string>();
  (customFieldDefinitions ?? []).forEach((customField: ProductCustomFieldDefinition) => {
    const fieldId = customField.id.trim();
    const fieldName = customField.name.trim();
    if (!fieldId || !fieldName) return;
    fieldNameById.set(fieldId, fieldName);
  });

  return (fieldId: string): string => fieldNameById.get(fieldId) ?? fieldId;
};

export const collectCustomFieldImportDiagnostics = (
  record: BaseProductRecord,
  mappings: TemplateMapping[] = [],
  customFieldDefinitions?: ProductCustomFieldDefinition[]
): BaseCustomFieldImportDiagnostics => {
  const resolveFieldName = createCustomFieldNameResolver(customFieldDefinitions);
  const autoMatchedValues = autoExtractCustomFieldValues(record, customFieldDefinitions);
  const autoMatchedByFieldId = new Map<string, ProductCustomFieldValue>();
  autoMatchedValues.forEach((value: ProductCustomFieldValue) => {
    autoMatchedByFieldId.set(value.fieldId, value);
  });

  const mergedByFieldId = new Map<string, ProductCustomFieldValue>(autoMatchedByFieldId);
  const explicitMappedFieldIds = new Set<string>();
  const skippedFieldIds = new Set<string>();

  for (const mapping of mappings) {
    const sourceKey = mapping.sourceKey.trim();
    const targetField = mapping.targetField.trim();
    if (!sourceKey || !targetField) continue;

    const customFieldTarget = parseProductCustomFieldTarget(targetField);
    if (!customFieldTarget) continue;

    const fieldId = customFieldTarget.fieldId.trim();
    if (!fieldId) continue;

    const rawValue = resolveTemplateValue(record, sourceKey);
    if (rawValue === null || rawValue === undefined) {
      skippedFieldIds.add(fieldId);
      continue;
    }

    explicitMappedFieldIds.add(fieldId);
    if (customFieldTarget.optionId) {
      const resolvedOptionId = resolveCheckboxOptionId(
        fieldId,
        customFieldTarget.optionId,
        customFieldDefinitions
      );
      mergeCheckboxOptionSelection(
        mergedByFieldId,
        fieldId,
        resolvedOptionId,
        toCheckboxValue(rawValue)
      );
      continue;
    }

    const textValue = toStringValue(rawValue);
    if (textValue === null) {
      skippedFieldIds.add(fieldId);
      continue;
    }
    mergedByFieldId.set(fieldId, {
      fieldId,
      textValue,
    });
  }

  const overriddenFieldIds = new Set<string>();
  explicitMappedFieldIds.forEach((fieldId: string) => {
    if (!autoMatchedByFieldId.has(fieldId)) return;
    if (
      serializeNormalizedCustomFieldValue(autoMatchedByFieldId.get(fieldId)) !==
      serializeNormalizedCustomFieldValue(mergedByFieldId.get(fieldId))
    ) {
      overriddenFieldIds.add(fieldId);
    }
  });

  const skippedOnlyFieldIds = Array.from(skippedFieldIds).filter(
    (fieldId: string): boolean => !explicitMappedFieldIds.has(fieldId)
  );
  const autoMatchedFieldIds = autoMatchedValues.map((value: ProductCustomFieldValue) => value.fieldId);
  const explicitMappedFieldIdList = Array.from(explicitMappedFieldIds);
  const overriddenFieldIdList = Array.from(overriddenFieldIds);

  return {
    autoMatchedFieldIds: sortUniqueStrings(autoMatchedFieldIds),
    autoMatchedFieldNames: sortUniqueStrings(autoMatchedFieldIds.map(resolveFieldName)),
    explicitMappedFieldIds: sortUniqueStrings(explicitMappedFieldIdList),
    explicitMappedFieldNames: sortUniqueStrings(explicitMappedFieldIdList.map(resolveFieldName)),
    skippedFieldIds: sortUniqueStrings(skippedOnlyFieldIds),
    skippedFieldNames: sortUniqueStrings(skippedOnlyFieldIds.map(resolveFieldName)),
    overriddenFieldIds: sortUniqueStrings(overriddenFieldIdList),
    overriddenFieldNames: sortUniqueStrings(overriddenFieldIdList.map(resolveFieldName)),
  };
};

const applyTemplateMappings = (
  record: BaseProductRecord,
  mapped: ProductCreateInput,
  mappings: TemplateMapping[],
  customFieldDefinitions?: ProductCustomFieldDefinition[]
): void => {
  const parameterValuesById = new Map<string, { parameterId: string; value: string }>();
  const customFieldValuesById = new Map<string, ProductCustomFieldValue>();
  if (Array.isArray(mapped.parameters)) {
    mapped.parameters.forEach((entry) => {
      const parameterId = toStringValue(entry?.parameterId);
      const value = toStringValue(entry?.value);
      if (!parameterId || !value) return;
      parameterValuesById.set(parameterId, { parameterId, value });
    });
  }
  if (Array.isArray(mapped.customFields)) {
    normalizeProductCustomFieldValues(mapped.customFields).forEach((entry: ProductCustomFieldValue) => {
      customFieldValuesById.set(entry.fieldId, entry);
    });
  }

  for (const mapping of mappings) {
    const sourceKey = mapping.sourceKey.trim();
    const targetField = mapping.targetField.trim();
    const normalizedTargetField = targetField.toLowerCase();
    if (!sourceKey || !targetField) continue;
    const rawValue = resolveTemplateValue(record, sourceKey);
    if (rawValue === null || rawValue === undefined) continue;
    if (PRODUCER_TARGET_FIELDS.has(normalizedTargetField)) {
      const producerIds = normalizeProducerIds(rawValue);
      if (producerIds.length > 0) {
        (mapped as ProductCreateInput & { producerIds?: string[] }).producerIds = producerIds;
      }
      continue;
    }
    if (TAG_TARGET_FIELDS.has(normalizedTargetField)) {
      const tagIds = normalizeTagIds(rawValue);
      if (tagIds.length > 0) {
        (mapped as ProductCreateInput & { tagIds?: string[] }).tagIds = tagIds;
      }
      continue;
    }
    const customFieldTarget = parseProductCustomFieldTarget(targetField);
    if (customFieldTarget) {
      if (customFieldTarget.optionId) {
        const resolvedOptionId = resolveCheckboxOptionId(
          customFieldTarget.fieldId,
          customFieldTarget.optionId,
          customFieldDefinitions
        );
        mergeCheckboxOptionSelection(
          customFieldValuesById,
          customFieldTarget.fieldId,
          resolvedOptionId,
          toCheckboxValue(rawValue)
        );
      } else {
        const textValue = toStringValue(rawValue);
        if (textValue !== null) {
          customFieldValuesById.set(customFieldTarget.fieldId, {
            fieldId: customFieldTarget.fieldId,
            textValue,
          });
        }
      }
      continue;
    }
    if (normalizedTargetField.startsWith('parameter:')) {
      const parameterId = targetField.slice('parameter:'.length).trim();
      if (!parameterId) continue;
      const parameterValue = toStringValue(rawValue);
      if (!parameterValue) continue;
      parameterValuesById.set(parameterId, {
        parameterId,
        value: parameterValue,
      });
      continue;
    }
    if (NUMBER_FIELDS.has(targetField)) {
      const parsed = toIntValue(rawValue);
      if (parsed === null) continue;
      (mapped as Record<string, unknown>)[targetField] = parsed;
      continue;
    }
    const stringValue = toStringValue(rawValue);
    if (!stringValue) continue;
    if (targetField === 'sku') {
      mapped.sku = stringValue;
      continue;
    }
    const imageIndex = resolveImageTargetIndex(targetField);
    if (imageIndex !== null && imageIndex >= 0) {
      if (!mapped.imageLinks) mapped.imageLinks = [];
      mapped.imageLinks[imageIndex] = stringValue;
      continue;
    }
    if (
      targetField === 'image_links_all' ||
      targetField === 'image_slots_all' ||
      targetField === 'images_all'
    ) {
      const urls = extractImageUrlsForAll(record);
      if (urls.length > 0) {
        mapped.imageLinks = urls;
      }
      continue;
    }
    (mapped as Record<string, unknown>)[targetField] = stringValue;
  }

  // Clean up any empty slots if we created a sparse array
  if (mapped.imageLinks) {
    mapped.imageLinks = mapped.imageLinks.filter(Boolean);
  }
  if (parameterValuesById.size > 0) {
    mapped.parameters = Array.from(parameterValuesById.values());
  }
  if (customFieldValuesById.size > 0) {
    mapped.customFields = normalizeProductCustomFieldValues(Array.from(customFieldValuesById.values()));
  }
};

export function mapBaseProduct(
  record: BaseProductRecord,
  mappings: TemplateMapping[] = [],
  options?: {
    preferredPriceCurrencies?: string[];
    customFieldDefinitions?: ProductCustomFieldDefinition[];
  }
): ProductCreateInput {
  // Extend this mapper as new Base.com fields are needed.
  const baseProductId = pickString(record, ['base_product_id', 'product_id', 'id']);

  const nameEn =
    pickString(record, ['name_en', 'title_en', 'name|en']) ??
    pickNestedString(record, [
      ['text_fields', 'name_en'],
      ['text_fields', 'name|en'],
      ['text_fields', 'title_en'],
      ['text_fields', 'title|en'],
    ]);

  const namePl =
    pickString(record, ['name_pl', 'title_pl', 'name', 'title']) ??
    pickNestedString(record, [
      ['text_fields', 'name_pl'],
      ['text_fields', 'name|pl'],
      ['text_fields', 'name'],
      ['text_fields', 'title_pl'],
      ['text_fields', 'title|pl'],
      ['text_fields', 'title'],
    ]);
  const nameDe = pickString(record, ['name_de']);

  const descriptionEn =
    pickString(record, ['description_en', 'description_en_long', 'description|en']) ??
    pickNestedString(record, [
      ['text_fields', 'description_en'],
      ['text_fields', 'description|en'],
      ['text_fields', 'description_en_long'],
    ]);

  const descriptionPl =
    pickString(record, ['description_pl', 'description', 'description_long']) ??
    pickNestedString(record, [
      ['text_fields', 'description_pl'],
      ['text_fields', 'description|pl'],
      ['text_fields', 'description'],
      ['text_fields', 'description_long'],
    ]);
  const descriptionDe = pickString(record, ['description_de']);

  const sku = pickString(record, ['sku', 'code', 'product_code', 'item_code']);

  const preferredCurrencies = normalizePreferredCurrencies(options?.preferredPriceCurrencies);
  const price =
    pickPriceByPreferredCurrency(record, preferredCurrencies) ??
    pickInt(record, [
      ...(preferredCurrencies.includes('PLN')
        ? ['price_pln', 'price_gross_pln', 'price_brutto_pln']
        : []),
      'price',
      'price_gross',
      'price_brutto',
    ]) ??
    pickNestedInt(record, [
      ...(preferredCurrencies.includes('PLN')
        ? [
          ['prices', 'pln'],
          ['prices', 'PLN'],
          ['prices', 'pln', 'price'],
          ['prices', 'PLN', 'price'],
          ['prices', 'pln', 'price_brutto'],
          ['prices', 'PLN', 'price_brutto'],
        ]
        : []),
      ['prices', '0', 'price'],
      ['prices', '0', 'price_brutto'],
    ]) ??
    pickFirstIntFromObject(record, 'prices');

  const stock =
    pickInt(record, ['stock', 'quantity', 'qty', 'available']) ??
    pickFirstIntFromObject(record, 'stock');

  const weight = pickInt(record, ['weight']);
  const sizeLength = pickInt(record, ['sizeLength', 'length_cm']);
  const sizeWidth = pickInt(record, ['sizeWidth', 'width_cm']);
  const length = pickInt(record, ['length']);

  const mapped: ProductCreateInput = {
    baseProductId: baseProductId ?? undefined,
    name_en: normalizeImportedStructuredName(record, nameEn) ?? undefined,
    name_pl: namePl ?? undefined,
    name_de: nameDe ?? undefined,
    description_en: descriptionEn ?? undefined,
    description_pl: descriptionPl ?? undefined,
    description_de: descriptionDe ?? undefined,
    sku: sku ?? '',
    price: price ?? undefined,
    stock: stock ?? undefined,
    weight: weight ?? undefined,
    sizeLength: sizeLength ?? undefined,
    sizeWidth: sizeWidth ?? undefined,
    length: length ?? undefined,
    imageLinks: getImageUrlsForAll(record),
  };

  const finalSku = (sku || '').trim() || `BASE-${baseProductId || randomUUID()}`;

  const result: ProductCreateInput = {
    ...mapped,
    sku: finalSku,
  };

  // Auto-extract producers and tags from the raw record before template mappings.
  // Template mappings applied below can still override these auto-extracted values.
  const extendedResult = result as ProductCreateInput & { producerIds?: string[]; tagIds?: string[] };
  const autoProducerIds = autoExtractProducerIds(record);
  if (autoProducerIds.length > 0) extendedResult.producerIds = autoProducerIds;
  const autoTagIds = autoExtractTagIds(record);
  if (autoTagIds.length > 0) extendedResult.tagIds = autoTagIds;
  const autoCustomFieldValues = autoExtractCustomFieldValues(
    record,
    options?.customFieldDefinitions
  );
  if (autoCustomFieldValues.length > 0) {
    extendedResult.customFields = autoCustomFieldValues;
  }

  applyTemplateMappings(record, result, mappings, options?.customFieldDefinitions);

  return result;
}
