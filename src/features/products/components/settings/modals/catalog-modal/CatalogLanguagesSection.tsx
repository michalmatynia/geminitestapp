import React from 'react';

import { Label, SelectSimple, Badge, Button, SearchInput } from '@/shared/ui';

import { useCatalogModalContext } from './context/CatalogModalContext';

export function CatalogLanguagesSection(): React.JSX.Element {
  const {
    selectedLanguageIds,
    toggleLanguage,
    moveLanguage,
    defaultLanguageId,
    setDefaultLanguageId,
    languageQuery,
    setLanguageQuery,
    availableLanguages,
    getLanguage,
    languagesLoading,
    languagesError,
  } = useCatalogModalContext();

  return (
    <div className='rounded-md border border-border bg-card/70 p-4 space-y-4'>
      <Label className='text-sm font-semibold text-white'>
        Languages
      </Label>
      {languagesLoading ? (
        <p className='text-xs text-gray-500'>Loading languages...</p>
      ) : languagesError ? (
        <p className='text-xs text-red-400'>{languagesError}</p>
      ) : (
        <div className='space-y-4'>
          <SearchInput
            placeholder='Search languages...'
            value={languageQuery}
            onChange={(e) => setLanguageQuery(e.target.value)}
            onClear={() => setLanguageQuery('')}
            size='sm'
          />

          <div className='space-y-1'>
            {selectedLanguageIds.length === 0 ? (
              <p className='text-xs text-gray-500'>
                No languages selected.
              </p>
            ) : (
              selectedLanguageIds.map((id, index) => {
                const lang = getLanguage(id);
                const label = lang
                  ? `${lang.name} (${lang.code})`
                  : id;
                return (
                  <div
                    key={id}
                    className='flex items-center justify-between rounded-md border bg-gray-900 px-3 py-1.5 text-xs text-gray-200'
                  >
                    <div className='flex items-center gap-2'>
                      <span className='text-gray-500 w-4'>
                        {index + 1}.
                      </span>
                      <span>{label}</span>
                      {id === defaultLanguageId && (
                        <Badge variant='success' className='text-[9px] h-4 px-1'>
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className='flex gap-1'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-6 w-6'
                        onClick={() => moveLanguage(id, 'up')}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-6 w-6'
                        onClick={() => moveLanguage(id, 'down')}
                        disabled={
                          index === selectedLanguageIds.length - 1
                        }
                      >
                        ↓
                      </Button>
                      <Button
                        variant='ghost'
                        className='h-6 px-2 text-red-400 hover:text-red-300'
                        onClick={() => toggleLanguage(id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className='max-h-32 overflow-y-auto rounded-md border border-border bg-gray-900 p-2 text-xs'>
            {availableLanguages.map((lang) => (
              <Button
                key={lang.id}
                variant='ghost'
                className='w-full justify-between h-8 px-2'
                onClick={() => toggleLanguage(lang.id)}
              >
                <span>
                  {lang.name} ({lang.code})
                </span>
                <span className='text-gray-500'>Add</span>
              </Button>
            ))}
          </div>

          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>
              Default language
            </Label>
            <SelectSimple
              size='sm'
              value={defaultLanguageId}
              onValueChange={setDefaultLanguageId}
              disabled={selectedLanguageIds.length === 0}
              placeholder='Select default language'
              options={selectedLanguageIds.map((id) => {
                const lang = getLanguage(id);
                return {
                  value: id,
                  label: lang ? `${lang.name} (${lang.code})` : id
                };
              })}
              triggerClassName='w-full bg-gray-900 border-border text-xs text-white h-9'
            />
          </div>
        </div>
      )}
    </div>
  );
}
