import 'server-only';

import type { ImportExportTemplateMappingDto as ExportTemplateMapping } from '@/shared/contracts/integrations';
import type { ProductWithImages } from '@/shared/contracts/products';


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

export const resolveBaseExporterTemplateMappings = (
  product: ProductWithImages,
  mappings: ExportTemplateMapping[],
  options?: {
    imageBaseUrl?: string | null;
    diagnostics?: ImageExportLogger;
    producerNameById?: ProducerNameLookup;
    producerExternalIdByInternalId?: ProducerExternalIdLookup;
    tagNameById?: TagNameLookup;
    tagExternalIdByInternalId?: TagExternalIdLookup;
  }
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

    const producerTarget = normalizeProducerTargetField(targetField);
    if (producerTarget === 'producer_id') {
      const values = toProducerIdValueList(
        sourceValue,
        options?.producerExternalIdByInternalId,
        options?.producerNameById
      );
      result[targetField] = values[0] ?? null;
      continue;
    }
    if (producerTarget === 'producer_ids') {
      result[targetField] = toProducerIdValueList(
        sourceValue,
        options?.producerExternalIdByInternalId,
        options?.producerNameById
      );
      continue;
    }
    if (targetField.toLowerCase() === 'producer_name') {
      const values = toProducerNameValueList(sourceValue, options?.producerNameById);
      result[targetField] = values[0] ?? null;
      continue;
    }
    if (targetField.toLowerCase() === 'producer_names') {
      result[targetField] = toProducerNameValueList(sourceValue, options?.producerNameById);
      continue;
    }

    const tagTarget = normalizeTagTargetField(targetField);
    if (tagTarget === 'tag_id') {
      const values = toTagIdValueList(
        sourceValue,
        options?.tagExternalIdByInternalId,
        options?.tagNameById
      );
      result[targetField] = values[0] ?? null;
      continue;
    }
    if (tagTarget === 'tag_ids') {
      result[targetField] = toTagIdValueList(
        sourceValue,
        options?.tagExternalIdByInternalId,
        options?.tagNameById
      );
      continue;
    }
    if (targetField.toLowerCase() === 'tag_name') {
      const values = toTagNameValueList(sourceValue, options?.tagNameById);
      result[targetField] = values[0] ?? null;
      continue;
    }
    if (targetField.toLowerCase() === 'tag_names') {
      result[targetField] = toTagNameValueList(sourceValue, options?.tagNameById);
      continue;
    }

    if (NUMERIC_TARGET_FIELDS.has(targetField.toLowerCase())) {
      if (parameterSource && sourceValue === '') {
        result[targetField] = null;
        continue;
      }
      result[targetField] = toNumberValue(sourceValue);
      continue;
    }

    if (parameterSource && sourceValue === '') {
      result[targetField] = '';
      continue;
    }

    result[targetField] = toStringValue(sourceValue);
  }

  return result;
};

export const applyExportTemplateMappings = resolveBaseExporterTemplateMappings;
