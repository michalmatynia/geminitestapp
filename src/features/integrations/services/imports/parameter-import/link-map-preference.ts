import type { ActiveTemplateScopeInput as ParameterLinkScopeInput } from '../../active-template-preference';

const PARAMETER_LINK_SCOPE_SEPARATOR = '::';

export { PARAMETER_LINK_SCOPE_SEPARATOR };

export type { ParameterLinkScopeInput };

export type CatalogParameterLinkMap = Record<string, Record<string, string>>;

export type ScopedCatalogParameterLinkMap = {
  defaultByCatalog: CatalogParameterLinkMap;
  byScope: Record<string, CatalogParameterLinkMap>;
};

const EMPTY_SCOPED_LINK_MAP: ScopedCatalogParameterLinkMap = {
  defaultByCatalog: {},
  byScope: {},
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeOptionalId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeParameterLinkEntries = (raw: unknown): Record<string, string> => {
  if (!isRecord(raw)) return {};
  return Object.entries(raw).reduce(
    (
      acc: Record<string, string>,
      [baseParameterId, mappedParameterId]: [string, unknown]
    ): Record<string, string> => {
      const normalizedBaseParameterId = baseParameterId.trim();
      const normalizedMappedParameterId = normalizeOptionalId(mappedParameterId);
      if (!normalizedBaseParameterId || !normalizedMappedParameterId) return acc;
      acc[normalizedBaseParameterId] = normalizedMappedParameterId;
      return acc;
    },
    {}
  );
};

export const normalizeCatalogParameterLinkMap = (raw: unknown): CatalogParameterLinkMap => {
  if (!isRecord(raw)) return {};
  return Object.entries(raw).reduce(
    (
      acc: CatalogParameterLinkMap,
      [catalogId, catalogLinksRaw]: [string, unknown]
    ): CatalogParameterLinkMap => {
      const normalizedCatalogId = catalogId.trim();
      if (!normalizedCatalogId) return acc;
      const links = normalizeParameterLinkEntries(catalogLinksRaw);
      if (Object.keys(links).length === 0) return acc;
      acc[normalizedCatalogId] = links;
      return acc;
    },
    {}
  );
};

export const normalizeScopedCatalogParameterLinkMap = (
  raw: unknown
): Record<string, CatalogParameterLinkMap> => {
  if (!isRecord(raw)) return {};
  return Object.entries(raw).reduce(
    (
      acc: Record<string, CatalogParameterLinkMap>,
      [scopeKey, catalogLinksRaw]: [string, unknown]
    ): Record<string, CatalogParameterLinkMap> => {
      const normalizedScopeKey = scopeKey.trim();
      if (!normalizedScopeKey) return acc;
      if (!normalizedScopeKey.includes(PARAMETER_LINK_SCOPE_SEPARATOR)) return acc;
      const catalogLinks = normalizeCatalogParameterLinkMap(catalogLinksRaw);
      if (Object.keys(catalogLinks).length === 0) return acc;
      acc[normalizedScopeKey] = catalogLinks;
      return acc;
    },
    {}
  );
};

const sortLinkEntries = (entries: Record<string, string>): Record<string, string> =>
  Object.keys(entries)
    .sort((left: string, right: string) => left.localeCompare(right))
    .reduce((acc: Record<string, string>, key: string): Record<string, string> => {
      acc[key] = entries[key] as string;
      return acc;
    }, {});

const sortCatalogLinkMap = (map: CatalogParameterLinkMap): CatalogParameterLinkMap =>
  Object.keys(map)
    .sort((left: string, right: string) => left.localeCompare(right))
    .reduce((acc: CatalogParameterLinkMap, catalogId: string): CatalogParameterLinkMap => {
      acc[catalogId] = sortLinkEntries(map[catalogId] as Record<string, string>);
      return acc;
    }, {});

export const buildParameterLinkScopeKey = (scope?: ParameterLinkScopeInput): string | null => {
  const connectionId = normalizeOptionalId(scope?.connectionId);
  const inventoryId = normalizeOptionalId(scope?.inventoryId);
  if (!connectionId || !inventoryId) return null;
  return `${connectionId}${PARAMETER_LINK_SCOPE_SEPARATOR}${inventoryId}`;
};

export const parseScopedCatalogParameterLinkMap = (
  raw: string | null
): ScopedCatalogParameterLinkMap => {
  if (!raw) return EMPTY_SCOPED_LINK_MAP;
  const trimmed = raw.trim();
  if (!trimmed) return EMPTY_SCOPED_LINK_MAP;

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!isRecord(parsed)) return EMPTY_SCOPED_LINK_MAP;
    return {
      defaultByCatalog: normalizeCatalogParameterLinkMap(parsed['defaultByCatalog']),
      byScope: normalizeScopedCatalogParameterLinkMap(parsed['byScope']),
    };
  } catch {
    return EMPTY_SCOPED_LINK_MAP;
  }
};

export const stringifyScopedCatalogParameterLinkMap = (
  map: ScopedCatalogParameterLinkMap
): string => {
  const normalizedDefaultByCatalog = normalizeCatalogParameterLinkMap(map.defaultByCatalog);
  const normalizedByScope = normalizeScopedCatalogParameterLinkMap(map.byScope);
  const sortedByScope = Object.keys(normalizedByScope)
    .sort((left: string, right: string) => left.localeCompare(right))
    .reduce((acc: Record<string, CatalogParameterLinkMap>, scopeKey: string) => {
      acc[scopeKey] = sortCatalogLinkMap(normalizedByScope[scopeKey] as CatalogParameterLinkMap);
      return acc;
    }, {});

  return JSON.stringify({
    defaultByCatalog: sortCatalogLinkMap(normalizedDefaultByCatalog),
    byScope: sortedByScope,
  });
};
