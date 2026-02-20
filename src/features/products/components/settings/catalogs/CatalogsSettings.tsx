import { useInternationalizationContext } from '@/features/internationalization';
import { Catalog } from '@/features/products/types';
import type { Language } from '@/shared/contracts/internationalization';
import { Button, Badge, SimpleSettingsList } from '@/shared/ui';

import { useProductSettingsContext } from '../ProductSettingsContext';

export function CatalogsSettings(): React.JSX.Element {
  const {
    loadingCatalogs,
    catalogs,
    onOpenCatalogModal,
    onEditCatalog,
    onDeleteCatalog,
  } = useProductSettingsContext();
  const { languages } = useInternationalizationContext();
  const getLanguageDisplay = (languageId: string): string => {
    const language = languages.find((l: Language) => l.id === languageId);
    return language ? `${language.name} (${language.code})` : languageId;
  };
  const languageIdMap = new Map<string, string>();
  languages.forEach((language: Language) => {
    if (language.id) languageIdMap.set(language.id, language.id);
    if (language.code) languageIdMap.set(language.code, language.id);
  });
  const normalizeLanguageId = (value?: string | null): string | null =>
    value ? languageIdMap.get(value) ?? null : null;
  const resolveCatalogLanguageIds = (catalog: Catalog): string[] => {
    const unique = Array.from(new Set(catalog.languageIds ?? []));
    const normalized = unique
      .map((id: string) => normalizeLanguageId(id))
      .filter((id: string | null): id is string => Boolean(id));
    return normalized.length > 0 ? normalized : unique;
  };
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
          items={catalogs.map((catalog: Catalog) => ({
            id: catalog.id,
            title: (
              <div className='flex items-center gap-2'>
                <span>{catalog.name}</span>
                {catalog.isDefault && (
                  <Badge variant='success' className='text-[9px] h-4 px-1'>
                    Default
                  </Badge>
                )}
              </div>
            ),
            description: catalog.description || 'No description',
            original: catalog
          }))}
          isLoading={loadingCatalogs}
          onEdit={(item) => { onEditCatalog(item.original); }}
          onDelete={(item) => { onDeleteCatalog(item.original); }}
          emptyMessage='No catalogs yet.'
          renderCustomContent={(item) => (
            <>
              {item.original.languageIds && item.original.languageIds.length > 0 ? (
                <div className='flex flex-wrap gap-2 text-[11px] text-gray-300'>
                  {resolveCatalogLanguageIds(item.original).map(
                    (languageId: string, index: number) => (
                      <Badge
                        key={languageId}
                        variant={normalizeLanguageId(item.original.defaultLanguageId) === languageId ? 'success' : 'neutral'}
                        className='text-[9px]'
                      >
                        {index + 1}. {getLanguageDisplay(languageId)}
                        {normalizeLanguageId(item.original.defaultLanguageId) ===
                          languageId && ' (Default)'}
                      </Badge>
                    )
                  )}
                </div>
              ) : null}
            </>
          )}
        />
      </div>
    </div>
  );
}
