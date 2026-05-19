import 'server-only';

import {
  buildParameterLinkScopeKey,
  parseScopedCatalogParameterLinkMap,
  stringifyScopedCatalogParameterLinkMap,
  normalizeParameterLinkEntries,
} from '@/features/integrations/services/imports/parameter-import/link-map-preference';
import {
  readImportExportSettingValue,
  writeImportExportSettingValue,
} from '@/features/integrations/services/import-export-settings-store';

const SETTINGS_KEY = 'base_import_parameter_link_map';

const readSettingsValue = async (): Promise<string | null> => {
  return readImportExportSettingValue(SETTINGS_KEY);
};

const writeSettingsValue = async (value: string): Promise<void> => {
  await writeImportExportSettingValue(SETTINGS_KEY, value);
};

export const getCatalogParameterLinks = async (input: {
  catalogId: string;
  connectionId?: string | null;
  inventoryId?: string | null;
}): Promise<Record<string, string>> => {
  const normalizedCatalogId = input.catalogId.trim();
  if (normalizedCatalogId.length === 0) return {};
  const all = parseScopedCatalogParameterLinkMap(await readSettingsValue());
  const scopeKey = buildParameterLinkScopeKey(input);
  if (scopeKey !== null) {
    const scopedLinks = all.byScope[scopeKey]?.[normalizedCatalogId];
    if (scopedLinks !== undefined) return scopedLinks;
  }
  return all.defaultByCatalog[normalizedCatalogId] ?? {};
};

export const mergeCatalogParameterLinks = async (input: {
  catalogId: string;
  connectionId?: string | null;
  inventoryId?: string | null;
  links: Record<string, string>;
}): Promise<void> => {
  const normalizedCatalogId = input.catalogId.trim();
  if (normalizedCatalogId.length === 0) return;
  const nextEntries = normalizeParameterLinkEntries(input.links);
  if (Object.keys(nextEntries).length === 0) return;

  const all = parseScopedCatalogParameterLinkMap(await readSettingsValue());
  const scopeKey = buildParameterLinkScopeKey(input);

  if (scopeKey !== null) {
    all.byScope[scopeKey] ??= {};
    const previous = all.byScope[scopeKey][normalizedCatalogId] ?? {};
    all.byScope[scopeKey] = {
      ...(all.byScope[scopeKey] ?? {}),
      [normalizedCatalogId]: { ...previous, ...nextEntries },
    };
  } else {
    const previous = all.defaultByCatalog[normalizedCatalogId] ?? {};
    all.defaultByCatalog[normalizedCatalogId] = { ...previous, ...nextEntries };
  }

  await writeSettingsValue(stringifyScopedCatalogParameterLinkMap(all));
};
