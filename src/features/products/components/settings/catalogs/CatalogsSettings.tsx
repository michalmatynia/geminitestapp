import { MoreVertical } from 'lucide-react';

import { useInternationalizationContext } from '@/features/internationalization';
import { Catalog } from '@/features/products/types';
import type { Language } from '@/shared/types/internationalization';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Badge } from '@/shared/ui';


type CatalogsSettingsProps = {
  loadingCatalogs: boolean;
  catalogs: Catalog[];
  handleOpenCatalogModal: () => void;
  handleEditCatalog: (catalog: Catalog) => void;
  handleDeleteCatalog: (catalog: Catalog) => void;
};

export function CatalogsSettings({
  loadingCatalogs,
  catalogs,
  handleOpenCatalogModal,
  handleEditCatalog,
  handleDeleteCatalog,
}: CatalogsSettingsProps): React.JSX.Element {
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
          onClick={(): void => handleOpenCatalogModal()}
        >
          Add Catalog
        </Button>
      </div>
      <div className='rounded-md border border-border bg-card/60 p-4'>
        <p className='text-sm font-semibold text-white'>Existing Catalogs</p>
        {loadingCatalogs ? (
          <div className='mt-4 rounded-md border border-dashed border p-4 text-center text-sm text-gray-400'>
            Loading catalogs...
          </div>
        ) : catalogs.length === 0 ? (
          <div className='mt-4 rounded-md border border-dashed border p-4 text-center text-sm text-gray-400'>
            No catalogs yet.
          </div>
        ) : (
          <div className='mt-4 space-y-3'>
            {catalogs.map((catalog: Catalog) => (
              <div
                key={catalog.id}
                className='flex items-start justify-between gap-3 rounded-md border border-border bg-gray-900 px-3 py-2'
              >
                <div>
                  <div className='flex items-center gap-2'>
                    <p className='text-sm font-semibold text-white'>
                      {catalog.name}
                    </p>
                    {catalog.isDefault ? (
                      <Badge variant='success'>
                        Default
                      </Badge>
                    ) : null}
                  </div>
                  <p className='text-xs text-gray-400'>
                    {catalog.description || 'No description'}
                  </p>
                  {catalog.languageIds && catalog.languageIds.length > 0 ? (
                    <div className='mt-2 flex flex-wrap gap-2 text-[11px] text-gray-300'>
                      {resolveCatalogLanguageIds(catalog).map(
                        (languageId: string, index: number) => (
                          <Badge
                            key={languageId}
                            variant={normalizeLanguageId(catalog.defaultLanguageId) === languageId ? 'success' : 'neutral'}
                          >
                            {index + 1}. {getLanguageDisplay(languageId)}
                            {normalizeLanguageId(catalog.defaultLanguageId) ===
                              languageId && ' (Default)'}
                          </Badge>
                        )
                      )}
                    </div>
                  ) : null}
                </div>
                <div className='flex gap-2'>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className='p-1 hover:bg-muted/50 rounded-full text-gray-400 hover:text-white'>
                        <MoreVertical className='h-4 w-4' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem
                        onClick={(): void => handleEditCatalog(catalog)}
                        className='cursor-pointer'
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className='text-red-400 focus:text-red-400 cursor-pointer'
                        onClick={(): void => handleDeleteCatalog(catalog)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}