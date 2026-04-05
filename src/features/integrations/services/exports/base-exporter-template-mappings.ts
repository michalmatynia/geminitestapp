import 'server-only';

import type { ImportExportTemplateMappingDto as ExportTemplateMapping } from '@/shared/contracts/integrations/import-export';
import type { ProductWithImages } from '@/shared/contracts/products/product';


import {
  ProducerNameLookup,
  ProducerExternalIdLookup,
  TagNameLookup,
  TagExternalIdLookup,
} from './base-exporter/lookup-resolvers';
import {
  toStringValue,
  toNumberValue,
  parseParameterSourceKey,
  normalizeProducerTargetField,
  normalizeTagTargetField,
  NUMERIC_TARGET_FIELDS,
} from './base-exporter/template-helpers';
import {
  getProductValue,
  toProducerNameValueList,
  toProducerIdValueList,
  toTagNameValueList,
  toTagIdValueList,
} from './base-exporter/value-resolvers';
import { ImageExportLogger } from './base-exporter-images';

export { toStringValue, toNumberValue };

type BaseExporterTemplateOptions = {
  imageBaseUrl?: string | null;
  diagnostics?: ImageExportLogger;
  producerNameById?: ProducerNameLookup;
  producerExternalIdByInternalId?: ProducerExternalIdLookup;
  tagNameById?: TagNameLookup;
  tagExternalIdByInternalId?: TagExternalIdLookup;
};

const resolveProducerTargetValue = (
  targetField: string,
  sourceValue: unknown,
  options?: BaseExporterTemplateOptions
): unknown | undefined => {
  const producerTarget = normalizeProducerTargetField(targetField);
  if (!producerTarget) return undefined;

  if (producerTarget === 'producer_id') {
    return (
      toProducerIdValueList(
        sourceValue,
        options?.producerExternalIdByInternalId,
        options?.producerNameById
      )[0] ?? null
    );
  }
  if (producerTarget === 'producer_ids') {
    return toProducerIdValueList(
      sourceValue,
      options?.producerExternalIdByInternalId,
      options?.producerNameById
    );
  }
  if (producerTarget === 'producer_name') {
    return toProducerNameValueList(sourceValue, options?.producerNameById)[0] ?? null;
  }
  return toProducerNameValueList(sourceValue, options?.producerNameById);
};

const resolveTagTargetValue = (
  targetField: string,
  sourceValue: unknown,
  options?: BaseExporterTemplateOptions
): unknown | undefined => {
  const tagTarget = normalizeTagTargetField(targetField) ?? targetField.trim().toLowerCase();
  if (tagTarget === 'tag_id') {
    return (
      toTagIdValueList(
        sourceValue,
        options?.tagExternalIdByInternalId,
        options?.tagNameById
      )[0] ?? null
    );
  }
  if (tagTarget === 'tag_ids') {
    return toTagIdValueList(
      sourceValue,
      options?.tagExternalIdByInternalId,
      options?.tagNameById
    );
  }
  if (tagTarget === 'tag_name') {
    return toTagNameValueList(sourceValue, options?.tagNameById)[0] ?? null;
  }
  if (tagTarget === 'tag_names') {
    return toTagNameValueList(sourceValue, options?.tagNameById);
  }
  return undefined;
};

const resolveNumericTargetValue = (
  targetField: string,
  sourceValue: unknown,
  parameterSource: ReturnType<typeof parseParameterSourceKey>
): unknown | undefined => {
  if (!NUMERIC_TARGET_FIELDS.has(targetField.trim().toLowerCase())) return undefined;
  if (parameterSource && sourceValue === '') return null;
  return toNumberValue(sourceValue);
};

const resolveDefaultTargetValue = (
  sourceValue: unknown,
  parameterSource: ReturnType<typeof parseParameterSourceKey>
): string | null => {
  if (parameterSource && sourceValue === '') return '';
  return toStringValue(sourceValue);
};

export const resolveBaseExporterTemplateMappings = (
  product: ProductWithImages,
  mappings: ExportTemplateMapping[],
  options?: BaseExporterTemplateOptions
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  for (const mapping of mappings) {
    const targetField = mapping.targetField.trim();
    if (!targetField) continue;
    const parameterSource = parseParameterSourceKey(mapping.sourceKey);

    const sourceValue = getProductValue(
      product,
      mapping.sourceKey,
      options?.imageBaseUrl,
      options?.diagnostics,
      options?.producerNameById,
      options?.producerExternalIdByInternalId,
      options?.tagNameById,
      options?.tagExternalIdByInternalId
    );

    const producerTargetValue = resolveProducerTargetValue(targetField, sourceValue, options);
    if (producerTargetValue !== undefined) {
      result[targetField] = producerTargetValue;
      continue;
    }

    const tagTargetValue = resolveTagTargetValue(targetField, sourceValue, options);
    if (tagTargetValue !== undefined) {
      result[targetField] = tagTargetValue;
      continue;
    }

    const numericTargetValue = resolveNumericTargetValue(targetField, sourceValue, parameterSource);
    if (numericTargetValue !== undefined) {
      result[targetField] = numericTargetValue;
      continue;
    }

    result[targetField] = resolveDefaultTargetValue(sourceValue, parameterSource);
  }

  return result;
};

export const applyExportTemplateMappings = resolveBaseExporterTemplateMappings;
