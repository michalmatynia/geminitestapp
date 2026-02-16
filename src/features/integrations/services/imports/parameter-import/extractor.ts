import type { BaseImportParameterImportSettings } from '@/features/integrations/types/base-import-parameter-import';

import type { BaseProductRecord } from '../base-client';
import type { ExtractedBaseParameter } from './types';

const PARAMETER_VALUE_KEYS = [
  'value',
  'values',
  'value_id',
  'label',
  'text',
] as const;

const PARAMETER_NAME_KEYS = [
  'name',
  'parameter',
  'code',
  'label',
  'title',
] as const;

const PARAMETER_ID_KEYS = ['id', 'parameter_id', 'param_id', 'attribute_id'] as const;

const PARAMETER_COLLECTION_KEYS = new Set([
  'parameters',
  'params',
  'attributes',
  'features',
]);

const toTrimmedString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return null;
};

const normalizeLanguageCode = (value: unknown): string | null => {
  const raw = toTrimmedString(value);
  if (!raw) return null;
  const normalized = raw.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return normalized.length > 0 ? normalized : null;
};

const normalizeScalarValue = (value: unknown): string | null => {
  const direct = toTrimmedString(value);
  if (direct) return direct;
  if (Array.isArray(value)) {
    const joined = value
      .map((entry: unknown) => normalizeScalarValue(entry))
      .filter((entry: string | null): entry is string => Boolean(entry))
      .join(', ');
    return joined || null;
  }
  if (value && typeof value === 'object') {
    try {
      const serialized = JSON.stringify(value);
      return serialized && serialized !== '{}' ? serialized : null;
    } catch {
      return null;
    }
  }
  return null;
};

type MutableExtractedParameter = {
  key: string;
  baseParameterId: string | null;
  namesByLanguage: Record<string, string>;
  valuesByLanguage: Record<string, string>;
};

const getRecordValue = (
  record: Record<string, unknown>,
  keys: readonly string[]
): unknown => {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }
  return null;
};

const upsertParameter = (input: {
  target: Map<string, MutableExtractedParameter>;
  keyHint: string;
  baseParameterId: string | null;
  languageCode: string;
  name: string;
  value: string;
}): void => {
  const mapKey = input.baseParameterId
    ? `id:${input.baseParameterId}`
    : `name:${input.keyHint.toLowerCase()}`;
  const existing = input.target.get(mapKey);
  if (existing) {
    if (input.baseParameterId && !existing.baseParameterId) {
      existing.baseParameterId = input.baseParameterId;
    }
    if (!existing.namesByLanguage[input.languageCode]) {
      existing.namesByLanguage[input.languageCode] = input.name;
    }
    if (!existing.valuesByLanguage[input.languageCode]) {
      existing.valuesByLanguage[input.languageCode] = input.value;
    }
    return;
  }
  input.target.set(mapKey, {
    key: mapKey,
    baseParameterId: input.baseParameterId,
    namesByLanguage: { [input.languageCode]: input.name },
    valuesByLanguage: { [input.languageCode]: input.value },
  });
};

const collectFromEntry = (input: {
  entry: unknown;
  languageCode: string;
  fallbackName?: string;
  target: Map<string, MutableExtractedParameter>;
}): void => {
  if (!input.entry || typeof input.entry !== 'object' || Array.isArray(input.entry)) {
    if (!input.fallbackName) return;
    const value = normalizeScalarValue(input.entry);
    if (!value) return;
    upsertParameter({
      target: input.target,
      keyHint: input.fallbackName,
      baseParameterId: null,
      languageCode: input.languageCode,
      name: input.fallbackName,
      value,
    });
    return;
  }

  const record = input.entry as Record<string, unknown>;
  const name =
    toTrimmedString(getRecordValue(record, PARAMETER_NAME_KEYS)) ??
    toTrimmedString(input.fallbackName) ??
    null;
  const baseParameterId = toTrimmedString(getRecordValue(record, PARAMETER_ID_KEYS));
  const value = normalizeScalarValue(getRecordValue(record, PARAMETER_VALUE_KEYS));
  if (!name || !value) return;
  upsertParameter({
    target: input.target,
    keyHint: name,
    baseParameterId,
    languageCode: input.languageCode,
    name,
    value,
  });
};

const collectFromBucket = (input: {
  bucket: unknown;
  languageCode: string;
  target: Map<string, MutableExtractedParameter>;
}): void => {
  if (!input.bucket) return;
  if (Array.isArray(input.bucket)) {
    input.bucket.forEach((entry: unknown) => {
      collectFromEntry({
        entry,
        languageCode: input.languageCode,
        target: input.target,
      });
    });
    return;
  }
  if (typeof input.bucket !== 'object') return;
  const record = input.bucket as Record<string, unknown>;
  Object.entries(record).forEach(([key, value]: [string, unknown]) => {
    if (!key.trim()) return;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      collectFromEntry({
        entry: value,
        fallbackName: key,
        languageCode: input.languageCode,
        target: input.target,
      });
      return;
    }
    collectFromEntry({
      entry: { name: key, value },
      languageCode: input.languageCode,
      target: input.target,
    });
  });
};

const collectCollectionByLanguage = (
  record: BaseProductRecord,
  collectionKey: string,
  languageCode: string,
  target: Map<string, MutableExtractedParameter>
): void => {
  const topLevel = record[collectionKey];
  if (topLevel !== undefined) {
    collectFromBucket({ bucket: topLevel, languageCode, target });
  }
  const textFields =
    record['text_fields'] && typeof record['text_fields'] === 'object'
      ? (record['text_fields'] as Record<string, unknown>)
      : null;
  if (!textFields) return;

  const direct = textFields[collectionKey];
  if (direct !== undefined) {
    collectFromBucket({ bucket: direct, languageCode, target });
  }

  Object.entries(textFields).forEach(([key, value]: [string, unknown]) => {
    const [namePart, langPart] = key.split('|');
    if (!namePart || !langPart) return;
    if (namePart !== collectionKey) return;
    const normalized = normalizeLanguageCode(langPart);
    if (!normalized) return;
    collectFromBucket({
      bucket: value,
      languageCode: normalized,
      target,
    });
  });
};

const toAllowedMappedSources = (
  settings: BaseImportParameterImportSettings,
  templateMappings: Array<{ sourceKey: string; targetField: string }>
): Set<string> | null => {
  if (settings.mode !== 'mapped') return null;
  const mapped = new Set<string>();
  templateMappings.forEach((mapping) => {
    const source = mapping.sourceKey?.trim().toLowerCase();
    const target = mapping.targetField?.trim().toLowerCase();
    if (!source || !target) return;
    if (
      target === 'parameters' ||
      target === 'parameters_all' ||
      target === 'parameter'
    ) {
      mapped.add(source);
    }
    if (target.startsWith('parameter:')) {
      mapped.add(source);
    }
  });
  return mapped.size > 0 ? mapped : new Set<string>();
};

export const extractBaseParameters = (input: {
  record: BaseProductRecord;
  settings: BaseImportParameterImportSettings;
  templateMappings: Array<{ sourceKey: string; targetField: string }>;
}): ExtractedBaseParameter[] => {
  const byKey = new Map<string, MutableExtractedParameter>();

  PARAMETER_COLLECTION_KEYS.forEach((collectionKey: string) => {
    collectCollectionByLanguage(input.record, collectionKey, 'default', byKey);
  });

  const mappedSources = toAllowedMappedSources(
    input.settings,
    input.templateMappings
  );

  const extracted = Array.from(byKey.values()).filter(
    (entry: MutableExtractedParameter) => {
      if (!mappedSources) return true;
      if (mappedSources.size === 0) return false;
      const nameValues = Object.values(entry.namesByLanguage).map((name) =>
        name.toLowerCase()
      );
      if (entry.baseParameterId && mappedSources.has(entry.baseParameterId.toLowerCase())) {
        return true;
      }
      return nameValues.some((name) => mappedSources.has(name));
    }
  );

  extracted.forEach((entry: MutableExtractedParameter) => {
    if (!entry.namesByLanguage['default']) {
      const fallback =
        entry.namesByLanguage['en'] ??
        entry.namesByLanguage['pl'] ??
        entry.namesByLanguage['de'] ??
        Object.values(entry.namesByLanguage)[0];
      if (fallback) entry.namesByLanguage['default'] = fallback;
    }
  });

  return extracted.sort((a, b) => {
    const aName = a.namesByLanguage['default'] ?? a.key;
    const bName = b.namesByLanguage['default'] ?? b.key;
    return aName.localeCompare(bName);
  });
};
