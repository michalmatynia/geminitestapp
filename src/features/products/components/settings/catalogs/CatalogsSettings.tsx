import { useInternationalizationData } from '@/features/internationalization/public';
import type { Language } from '@/shared/contracts/internationalization';
import { type Catalog } from '@/shared/contracts/products/catalogs';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { SimpleSettingsList } from '@/shared/ui/templates/SimpleSettingsList';

import { useProductSettingsCatalogsContext } from '../ProductSettingsContext';

type CatalogLanguageNormalizer = (value?: string | null) => string | null;

const buildLanguageIdMap = (languages: readonly Language[]): Map<string, string> => {
  const languageIdMap = new Map<string, string>();
  languages.forEach((language) => {
    if (language.id !== '') languageIdMap.set(language.id, language.id);
    if (language.code !== '') languageIdMap.set(language.code, language.id);
  });
  return languageIdMap;
};

const normalizeLanguageId = (
  value: string | null | undefined,
  languageIdMap: ReadonlyMap<string, string>
): string | null => {
  if (value === null || value === undefined || value === '') return null;
  return languageIdMap.get(value) ?? null;
};

const getLanguageDisplay = (languageId: string, languages: readonly Language[]): string => {
  const language = languages.find((candidate) => candidate.id === languageId);
  return language !== undefined ? `${language.name} (${language.code})` : languageId;
};

const resolveCatalogLanguageIds = (
  catalog: Catalog,
  normalizeLanguage: CatalogLanguageNormalizer
): string[] => {
  const unique = Array.from(new Set(catalog.languageIds));
  const normalized = unique
    .map((id) => normalizeLanguage(id))
    .filter((id: string | null): id is string => id !== null);
  return normalized.length > 0 ? normalized : unique;
};

const resolveCatalogDescription = (catalog: Catalog): string =>
  catalog.description !== null && catalog.description !== undefined && catalog.description !== ''
    ? catalog.description
    : 'No description';

export function CatalogsSettings(): React.JSX.Element {
  const { loadingCatalogs, catalogs, onOpenCatalogModal, onEditCatalog, onDeleteCatalog } =
    useProductSettingsCatalogsContext();
  const { languages } = useInternationalizationData();
  const languageIdMap = buildLanguageIdMap(languages);
  const normalizeCatalogLanguageId = (value?: string | null): string | null =>
    normalizeLanguageId(value, languageIdMap);

  return (
    <div className='space-y-5'>
      <div className='flex justify-start'>
        <Button
          className='min-w-[100px] border border-white/20 hover:border-white/40'
          type='button'
          onClick={onOpenCatalogModal}
        >
          Add Catalog
        </Button>
      </div>
      <div className='rounded-md border border-border bg-card/60 p-4'>
        <p className='text-sm font-semibold text-white mb-4'>Existing Catalogs</p>
        <SimpleSettingsList
          items={buildCatalogSettingsItems(catalogs)}
          isLoading={loadingCatalogs}
          onEdit={(item) => {
            onEditCatalog(item.original);
          }}
          onDelete={(item) => {
            onDeleteCatalog(item.original);
          }}
          emptyMessage='No catalogs yet.'
          renderCustomContent={(item) => (
            <CatalogLanguageBadges
              catalog={item.original}
              languages={languages}
              normalizeLanguage={normalizeCatalogLanguageId}
            />
          )}
        />
      </div>
    </div>
  );
}

const buildCatalogSettingsItems = (
  catalogs: readonly Catalog[]
): Array<{
  id: string;
  title: React.JSX.Element;
  description: string;
  original: Catalog;
}> =>
  catalogs.map((catalog) => ({
    id: catalog.id,
    title: (
      <div className='flex items-center gap-2'>
        <span>{catalog.name}</span>
        {catalog.isDefault ? (
          <Badge variant='success' className='text-[9px] h-4 px-1'>
            Default
          </Badge>
        ) : null}
      </div>
    ),
    description: resolveCatalogDescription(catalog),
    original: catalog,
  }));

function CatalogLanguageBadges({
  catalog,
  languages,
  normalizeLanguage,
}: {
  catalog: Catalog;
  languages: readonly Language[];
  normalizeLanguage: CatalogLanguageNormalizer;
}): React.JSX.Element | null {
  if (catalog.languageIds.length === 0) return null;
  const defaultLanguageId = normalizeLanguage(catalog.defaultLanguageId);

  return (
    <div className='flex flex-wrap gap-2 text-[11px] text-gray-300'>
      {resolveCatalogLanguageIds(catalog, normalizeLanguage).map((languageId, index) => (
        <Badge
          key={languageId}
          variant={defaultLanguageId === languageId ? 'success' : 'neutral'}
          className='text-[9px]'
        >
          {index + 1}. {getLanguageDisplay(languageId, languages)}
          {defaultLanguageId === languageId ? ' (Default)' : null}
        </Badge>
      ))}
    </div>
  );
}
