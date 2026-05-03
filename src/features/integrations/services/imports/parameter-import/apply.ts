import type { ApplyBaseParameterImportInput, ApplyBaseParameterImportResult, ExtractedBaseParameter } from '@/shared/contracts/integrations/parameter-import';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue } from '@/shared/contracts/products/product';

import { extractBaseParameters } from './extractor';
import { getCatalogParameterLinks, mergeCatalogParameterLinks } from './link-map-repository';

const toTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeLanguageCode = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
  return normalized.length > 0 ? normalized : null;
};

const normalizeNameKey = (value: string): string => value.trim().toLowerCase();

const formatExternalParameterIdLabel = (value: string | null): string | null => {
  const normalized = toTrimmedString(value);
  if (!normalized) return null;
  const words = normalized
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((part: string): boolean => part.length > 0);
  if (words.length === 0) return null;
  return words
    .map((word: string): string => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const resolveNeutralEnglishParameterName = (extracted: ExtractedBaseParameter): string =>
  formatExternalParameterIdLabel(extracted.baseParameterId) ?? 'Imported parameter';

const hasExistingValue = (entry: ProductParameterValue | undefined): boolean => {
  if (!entry) return false;
  const scalar = toTrimmedString(entry.value);
  if (scalar) return true;
  const valuesByLanguage = entry.valuesByLanguage;
  if (!valuesByLanguage || typeof valuesByLanguage !== 'object') return false;
  return Object.values(valuesByLanguage).some((value) => toTrimmedString(value));
};

const buildParameterNames = (
  extracted: ExtractedBaseParameter
): { name_en: string; name_pl?: string | null; name_de?: string | null } | null => {
  const namePl = toTrimmedString(extracted.namesByLanguage['pl']);
  const nameDe = toTrimmedString(extracted.namesByLanguage['de']);
  const unlocalizedName =
    !namePl && !nameDe ? toTrimmedString(extracted.namesByLanguage['default']) : null;
  const nameEn =
    toTrimmedString(extracted.namesByLanguage['en']) ??
    unlocalizedName ??
    resolveNeutralEnglishParameterName(extracted);
  if (!nameEn) return null;
  return {
    name_en: nameEn,
    ...(namePl !== null ? { name_pl: namePl } : {}),
    ...(nameDe !== null ? { name_de: nameDe } : {}),
  };
};

const buildParameterValuePayload = (input: {
  extracted: ExtractedBaseParameter;
  settingsLanguageScope: 'catalog_languages' | 'default_only';
  catalogLanguageCodes: string[];
  defaultLanguageCode: string | null;
}): { value: string; valuesByLanguage?: Record<string, string> } | null => {
  const normalizedCatalogCodes = Array.from(
    new Set(
      input.catalogLanguageCodes
        .map((code: string) => normalizeLanguageCode(code))
        .filter((code: string | null): code is string => Boolean(code))
    )
  );

  const normalizedDefault = normalizeLanguageCode(input.defaultLanguageCode);
  const valueMap: Record<string, string> = {};
  const normalizedExtractedEntries = Object.entries(input.extracted.valuesByLanguage).reduce(
    (acc: Record<string, string>, [key, rawValue]: [string, string]) => {
      const normalizedKey = normalizeLanguageCode(key);
      const normalizedValue = toTrimmedString(rawValue);
      if (!normalizedKey || !normalizedValue) return acc;
      acc[normalizedKey] = normalizedValue;
      return acc;
    },
    {}
  );
  const hasDefaultValue = Boolean(normalizedExtractedEntries['default']);
  const explicitLocalizedEntries = Object.entries(normalizedExtractedEntries).filter(
    ([code]: [string, string]): boolean => code !== 'default'
  );

  const defaultValue =
    normalizedExtractedEntries['default'] ??
    (normalizedDefault ? normalizedExtractedEntries[normalizedDefault] : null) ??
    Object.values(normalizedExtractedEntries)[0] ??
    null;
  if (!defaultValue) return null;

  if (input.settingsLanguageScope === 'default_only') {
    if (normalizedDefault && normalizedExtractedEntries[normalizedDefault]) {
      valueMap[normalizedDefault] = normalizedExtractedEntries[normalizedDefault];
    } else if (hasDefaultValue) {
      const targetCode = normalizedDefault ?? normalizedCatalogCodes[0] ?? 'en';
      valueMap[targetCode] = defaultValue;
    } else if (explicitLocalizedEntries.length > 0) {
      const [code, value] = explicitLocalizedEntries[0] ?? [];
      if (code && value) valueMap[code] = value;
    }
  } else if (normalizedCatalogCodes.length > 0) {
    normalizedCatalogCodes.forEach((code: string) => {
      const value = normalizedExtractedEntries[code] ?? (hasDefaultValue ? defaultValue : null);
      if (value) valueMap[code] = value;
    });
  } else {
    Object.entries(normalizedExtractedEntries).forEach(([code, value]: [string, string]) => {
      if (code === 'default') return;
      valueMap[code] = value;
    });
  }

  const value =
    (normalizedDefault && valueMap[normalizedDefault]) ||
    Object.values(valueMap)[0] ||
    defaultValue;
  if (!value) return null;
  return {
    value,
    ...(Object.keys(valueMap).length > 0 ? { valuesByLanguage: valueMap } : {}),
  };
};

const buildLookupMaps = (
  parameters: ProductParameter[]
): {
  byId: Map<string, ProductParameter>;
  byName: Map<string, ProductParameter>;
} => {
  const byId = new Map<string, ProductParameter>();
  const byName = new Map<string, ProductParameter>();
  parameters.forEach((parameter: ProductParameter) => {
    byId.set(parameter.id, parameter);
    const names = [parameter.name_en, parameter.name_pl, parameter.name_de];
    names
      .map((name: string | null) => (typeof name === 'string' ? name.trim() : ''))
      .filter((name: string): boolean => name.length > 0)
      .forEach((name: string) => {
        const normalized = normalizeNameKey(name);
        if (!byName.has(normalized)) {
          byName.set(normalized, parameter);
        }
      });
  });
  return { byId, byName };
};

const resolveMatchedParameter = (input: {
  extracted: ExtractedBaseParameter;
  byId: Map<string, ProductParameter>;
  byName: Map<string, ProductParameter>;
  linkMap: Record<string, string>;
  useLinkMap: boolean;
}): ProductParameter | null => {
  if (input.useLinkMap && input.extracted.baseParameterId) {
    const linkedId = input.linkMap[input.extracted.baseParameterId];
    if (linkedId && input.byId.has(linkedId)) {
      return input.byId.get(linkedId) ?? null;
    }
  }
  const names = Object.values(input.extracted.namesByLanguage)
    .map((name: string) => normalizeNameKey(name))
    .filter((name: string): boolean => name.length > 0);
  for (const name of names) {
    const byName = input.byName.get(name);
    if (byName) return byName;
  }
  return null;
};

export const applyBaseParameterImport = async (
  input: ApplyBaseParameterImportInput
): Promise<ApplyBaseParameterImportResult> => {
  if (!input.settings.enabled) {
    return {
      applied: false,
      parameters: input.existingValues,
      summary: { extracted: 0, resolved: 0, created: 0, written: 0 },
    };
  }

  const extracted = extractBaseParameters({
    record: input.record,
    settings: input.settings,
    templateMappings: input.templateMappings,
  });
  if (extracted.length === 0) {
    return {
      applied: true,
      parameters: input.existingValues,
      summary: { extracted: 0, resolved: 0, created: 0, written: 0 },
    };
  }

  const allCatalogParameters =
    input.prefetchedParameters ??
    (await input.parameterRepository.listParameters({
      catalogId: input.catalogId,
    }));
  const { byId, byName } = buildLookupMaps(allCatalogParameters);
  const useLinkMap = input.settings.matchBy === 'base_id_then_name';
  const linkMap =
    input.prefetchedLinks ??
    (useLinkMap
      ? await getCatalogParameterLinks({
        catalogId: input.catalogId,
        connectionId: input.connectionId ?? null,
        inventoryId: input.inventoryId ?? null,
      })
      : {});
  const linkUpdates: Record<string, string> = {};

  const nextByParameterId = new Map<string, ProductParameterValue>();
  input.existingValues.forEach((entry: ProductParameterValue) => {
    const parameterId = toTrimmedString(entry.parameterId);
    if (!parameterId) return;
    nextByParameterId.set(parameterId, {
      parameterId,
      value: typeof entry.value === 'string' ? entry.value : '',
      ...(entry.valuesByLanguage &&
      typeof entry.valuesByLanguage === 'object' &&
      !Array.isArray(entry.valuesByLanguage)
        ? { valuesByLanguage: entry.valuesByLanguage }
        : {}),
    });
  });

  let resolved = 0;
  let created = 0;
  let written = 0;

  for (const entry of extracted) {
    let matched = resolveMatchedParameter({
      extracted: entry,
      byId,
      byName,
      linkMap,
      useLinkMap,
    });

    if (!matched && input.settings.createMissingParameters) {
      const names = buildParameterNames(entry);
      if (names) {
        matched = await input.parameterRepository.createParameter({
          name: names.name_en,
          catalogId: input.catalogId,
          name_en: names.name_en,
          name_pl: names.name_pl ?? null,
          name_de: names.name_de ?? null,
          selectorType: 'text',
          optionLabels: [],
          linkedTitleTermType: null,
        });
        if (!matched) continue;
        byId.set(matched.id, matched);
        [matched.name_en, matched.name_pl, matched.name_de]
          .map((name: string | null) => (typeof name === 'string' ? name.trim() : ''))
          .filter((name: string): boolean => name.length > 0)
          .forEach((name: string) => {
            const normalized = normalizeNameKey(name);
            if (!byName.has(normalized)) {
              byName.set(normalized, matched as ProductParameter);
            }
          });
        created += 1;
      }
    }

    if (!matched) continue;
    resolved += 1;

    if (entry.baseParameterId && useLinkMap) {
      const existingLink = linkMap[entry.baseParameterId];
      if (existingLink !== matched.id) {
        linkUpdates[entry.baseParameterId] = matched.id;
        linkMap[entry.baseParameterId] = matched.id;
      }
    }

    if (matched.linkedTitleTermType) {
      continue;
    }

    const nextValuePayload = buildParameterValuePayload({
      extracted: entry,
      settingsLanguageScope: input.settings.languageScope || 'catalog_languages',
      catalogLanguageCodes: input.catalogLanguageCodes,
      defaultLanguageCode: input.defaultLanguageCode ?? null,
    });
    if (!nextValuePayload) continue;

    const existing = nextByParameterId.get(matched.id);
    if (!input.settings.overwriteExistingValues && hasExistingValue(existing)) {
      continue;
    }

    nextByParameterId.set(matched.id, {
      parameterId: matched.id,
      value: nextValuePayload.value,
      ...(nextValuePayload.valuesByLanguage
        ? { valuesByLanguage: nextValuePayload.valuesByLanguage }
        : {}),
    });
    written += 1;
  }

  if (Object.keys(linkUpdates).length > 0 && useLinkMap) {
    await mergeCatalogParameterLinks({
      catalogId: input.catalogId,
      connectionId: input.connectionId ?? null,
      inventoryId: input.inventoryId ?? null,
      links: linkUpdates,
    });
  }

  return {
    applied: true,
    parameters: Array.from(nextByParameterId.values()),
    summary: {
      extracted: extracted.length,
      resolved,
      created,
      written,
    },
  };
};
