import {
  PARAMETER_LINK_SCOPE_SEPARATOR,
  normalizeCatalogParameterLinkMap,
  normalizeParameterLinkEntries,
  normalizeScopedCatalogParameterLinkMap,
  type CatalogParameterLinkMap,
  type ScopedCatalogParameterLinkMap,
} from '@/features/integrations/services/imports/parameter-import/link-map-preference';

const LEGACY_DEFAULT_SCOPE_KEY = '__global__';
const EMPTY_SCOPED_LINK_MAP: ScopedCatalogParameterLinkMap = {
  defaultByCatalog: {},
  byScope: {},
};

type ParsedLegacyCompatibleLinkMapResult = {
  map: ScopedCatalogParameterLinkMap;
  legacyPayloadDetected: boolean;
  warnings: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const mergeCatalogMaps = (
  target: CatalogParameterLinkMap,
  source: CatalogParameterLinkMap
): CatalogParameterLinkMap => {
  Object.entries(source).forEach(([catalogId, links]: [string, Record<string, string>]) => {
    if (!target[catalogId]) {
      target[catalogId] = { ...links };
      return;
    }
    target[catalogId] = {
      ...target[catalogId],
      ...links,
    };
  });
  return target;
};

export const parseLegacyCompatibleScopedCatalogParameterLinkMap = (
  raw: string
): ParsedLegacyCompatibleLinkMapResult => {
  const warnings: string[] = [];
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      map: EMPTY_SCOPED_LINK_MAP,
      legacyPayloadDetected: false,
      warnings,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      map: EMPTY_SCOPED_LINK_MAP,
      legacyPayloadDetected: true,
      warnings: ['Dropped non-JSON payload and reset to empty canonical scoped map.'],
    };
  }

  if (!isRecord(parsed)) {
    return {
      map: EMPTY_SCOPED_LINK_MAP,
      legacyPayloadDetected: true,
      warnings: ['Dropped unsupported JSON payload and reset to empty canonical scoped map.'],
    };
  }

  const map: ScopedCatalogParameterLinkMap = {
    defaultByCatalog: normalizeCatalogParameterLinkMap(parsed['defaultByCatalog']),
    byScope: normalizeScopedCatalogParameterLinkMap(parsed['byScope']),
  };
  let legacyPayloadDetected = false;

  if (parsed['defaultByCatalog'] != null && !isRecord(parsed['defaultByCatalog'])) {
    legacyPayloadDetected = true;
    warnings.push('Dropped non-object defaultByCatalog payload.');
  }
  if (parsed['byScope'] != null && !isRecord(parsed['byScope'])) {
    legacyPayloadDetected = true;
    warnings.push('Dropped non-object byScope payload.');
  }

  Object.entries(parsed).forEach(([topLevelKey, topLevelValue]: [string, unknown]) => {
    if (topLevelKey === 'defaultByCatalog' || topLevelKey === 'byScope') return;

    const normalizedTopLevelKey = topLevelKey.trim();
    if (!normalizedTopLevelKey || !isRecord(topLevelValue)) return;

    const normalizedCatalogMap = normalizeCatalogParameterLinkMap(topLevelValue);
    const normalizedDirectLinks = normalizeParameterLinkEntries(topLevelValue);
    const hasCatalogMap = Object.keys(normalizedCatalogMap).length > 0;
    const hasDirectLinks = Object.keys(normalizedDirectLinks).length > 0;

    if (normalizedTopLevelKey === LEGACY_DEFAULT_SCOPE_KEY) {
      if (hasCatalogMap) {
        mergeCatalogMaps(map.defaultByCatalog, normalizedCatalogMap);
      } else if (hasDirectLinks) {
        warnings.push('Dropped legacy __global__ payload that omitted catalog buckets.');
      }
      legacyPayloadDetected = true;
      return;
    }

    if (normalizedTopLevelKey.includes(PARAMETER_LINK_SCOPE_SEPARATOR)) {
      if (hasCatalogMap) {
        if (!map.byScope[normalizedTopLevelKey]) {
          map.byScope[normalizedTopLevelKey] = {};
        }
        mergeCatalogMaps(
          map.byScope[normalizedTopLevelKey],
          normalizedCatalogMap
        );
      } else if (hasDirectLinks) {
        warnings.push(
          `Dropped legacy scoped bucket "${normalizedTopLevelKey}" that omitted catalog buckets.`
        );
      }
      legacyPayloadDetected = true;
      return;
    }

    if (hasDirectLinks) {
      if (!map.defaultByCatalog[normalizedTopLevelKey]) {
        map.defaultByCatalog[normalizedTopLevelKey] = {};
      }
      map.defaultByCatalog[normalizedTopLevelKey] = {
        ...map.defaultByCatalog[normalizedTopLevelKey],
        ...normalizedDirectLinks,
      };
      legacyPayloadDetected = true;
      warnings.push(`Converted flat legacy catalog bucket "${normalizedTopLevelKey}".`);
      return;
    }

    if (hasCatalogMap) {
      legacyPayloadDetected = true;
      warnings.push(`Dropped unsupported legacy top-level bucket "${normalizedTopLevelKey}".`);
    }
  });

  return {
    map,
    legacyPayloadDetected,
    warnings,
  };
};
