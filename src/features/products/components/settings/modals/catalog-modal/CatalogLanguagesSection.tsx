'use client';

import React, { useMemo } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { SearchInput } from '@/shared/ui/search-input';
import { SelectSimple } from '@/shared/ui/select-simple';

import { useCatalogModalContext } from './context/CatalogModalContext';

type CatalogLanguage = ReturnType<typeof useCatalogModalContext>['availableLanguages'][number];
type CatalogLanguageLookup = ReturnType<typeof useCatalogModalContext>['getLanguage'];
type SelectedLanguageRowProps = {
  id: string;
  index: number;
  selectedLanguageCount: number;
  defaultLanguageId: string;
  getLanguage: CatalogLanguageLookup;
  moveLanguage: (id: string, direction: 'up' | 'down') => void;
  toggleLanguage: (id: string) => void;
};

const getLanguageOptionLabel = (
  languageId: string,
  getLanguage: CatalogLanguageLookup
): string => {
  const language = getLanguage(languageId);
  return language !== undefined ? `${language.name} (${language.code})` : languageId;
};

const buildDefaultLanguageOptions = (
  languageIds: readonly string[],
  getLanguage: CatalogLanguageLookup
): Array<LabeledOptionDto<string>> =>
  languageIds.map((id) => ({
    value: id,
    label: getLanguageOptionLabel(id, getLanguage),
  }));

function SelectedLanguagesList({
  selectedLanguageIds,
  defaultLanguageId,
  getLanguage,
  moveLanguage,
  toggleLanguage,
}: {
  selectedLanguageIds: readonly string[];
  defaultLanguageId: string;
  getLanguage: CatalogLanguageLookup;
  moveLanguage: (id: string, direction: 'up' | 'down') => void;
  toggleLanguage: (id: string) => void;
}): React.JSX.Element {
  if (selectedLanguageIds.length === 0) {
    return <p className='text-xs text-gray-500'>No languages selected.</p>;
  }

  return (
    <>
      {selectedLanguageIds.map((id, index) => (
        <SelectedLanguageRow
          key={id}
          id={id}
          index={index}
          selectedLanguageCount={selectedLanguageIds.length}
          defaultLanguageId={defaultLanguageId}
          getLanguage={getLanguage}
          moveLanguage={moveLanguage}
          toggleLanguage={toggleLanguage}
        />
      ))}
    </>
  );
}

function SelectedLanguageRow({
  id,
  index,
  selectedLanguageCount,
  defaultLanguageId,
  getLanguage,
  moveLanguage,
  toggleLanguage,
}: SelectedLanguageRowProps): React.JSX.Element {
  const label = getLanguageOptionLabel(id, getLanguage);

  return (
    <div className='flex items-center justify-between rounded-md border bg-gray-900 px-3 py-1.5 text-xs text-gray-200'>
      <div className='flex items-center gap-2'>
        <span className='text-gray-500 w-4'>{index + 1}.</span>
        <span>{label}</span>
        {id === defaultLanguageId ? (
          <Badge variant='success' className='text-[9px] h-4 px-1'>
            Default
          </Badge>
        ) : null}
      </div>
      <div className='flex gap-1'>
        <Button
          variant='ghost'
          size='icon'
          className='h-6 w-6'
          onClick={() => moveLanguage(id, 'up')}
          disabled={index === 0}
          aria-label={`Move ${label} up`}
        >
          ↑
        </Button>
        <Button
          variant='ghost'
          size='icon'
          className='h-6 w-6'
          onClick={() => moveLanguage(id, 'down')}
          disabled={index === selectedLanguageCount - 1}
          aria-label={`Move ${label} down`}
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
}

function AvailableLanguagesList({
  availableLanguages,
  toggleLanguage,
}: {
  availableLanguages: readonly CatalogLanguage[];
  toggleLanguage: (id: string) => void;
}): React.JSX.Element {
  return (
    <div className='max-h-32 overflow-y-auto rounded-md border border-border bg-gray-900 p-2 text-xs'>
      {availableLanguages.map((language) => (
        <Button
          key={language.id}
          variant='ghost'
          className='w-full justify-between h-8 px-2'
          onClick={() => toggleLanguage(language.id)}
        >
          <span>
            {language.name} ({language.code})
          </span>
          <span className='text-gray-500'>Add</span>
        </Button>
      ))}
    </div>
  );
}

function DefaultLanguageSelect({
  defaultLanguageId,
  setDefaultLanguageId,
  selectedLanguageIds,
  defaultLanguageOptions,
}: {
  defaultLanguageId: string;
  setDefaultLanguageId: (id: string) => void;
  selectedLanguageIds: readonly string[];
  defaultLanguageOptions: Array<LabeledOptionDto<string>>;
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label className='text-xs text-gray-400'>Default language</Label>
      <SelectSimple
        size='sm'
        value={defaultLanguageId}
        onValueChange={setDefaultLanguageId}
        disabled={selectedLanguageIds.length === 0}
        placeholder='Select default language'
        ariaLabel='Default language'
        options={defaultLanguageOptions}
        triggerClassName='w-full bg-gray-900 border-border text-xs text-white h-9'
        title='Select default language'
      />
    </div>
  );
}

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
  const defaultLanguageOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () => buildDefaultLanguageOptions(selectedLanguageIds, getLanguage),
    [getLanguage, selectedLanguageIds]
  );

  const hasLanguagesError = languagesError !== null && languagesError !== '';

  return (
    <div className='rounded-md border border-border bg-card/70 p-4 space-y-4'>
      <Label className='text-sm font-semibold text-white'>Languages</Label>
      {languagesLoading && <p className='text-xs text-gray-500'>Loading languages...</p>}
      {!languagesLoading && hasLanguagesError && (
        <p className='text-xs text-red-400'>{languagesError}</p>
      )}
      {!languagesLoading && !hasLanguagesError && (
        <CatalogLanguagesContent
          selectedLanguageIds={selectedLanguageIds}
          defaultLanguageId={defaultLanguageId}
          setDefaultLanguageId={setDefaultLanguageId}
          defaultLanguageOptions={defaultLanguageOptions}
          languageQuery={languageQuery}
          setLanguageQuery={setLanguageQuery}
          availableLanguages={availableLanguages}
          getLanguage={getLanguage}
          moveLanguage={moveLanguage}
          toggleLanguage={toggleLanguage}
        />
      )}
    </div>
  );
}

function CatalogLanguagesContent({
  selectedLanguageIds,
  defaultLanguageId,
  setDefaultLanguageId,
  defaultLanguageOptions,
  languageQuery,
  setLanguageQuery,
  availableLanguages,
  getLanguage,
  moveLanguage,
  toggleLanguage,
}: {
  selectedLanguageIds: readonly string[];
  defaultLanguageId: string;
  setDefaultLanguageId: (id: string) => void;
  defaultLanguageOptions: Array<LabeledOptionDto<string>>;
  languageQuery: string;
  setLanguageQuery: (query: string) => void;
  availableLanguages: readonly CatalogLanguage[];
  getLanguage: CatalogLanguageLookup;
  moveLanguage: (id: string, direction: 'up' | 'down') => void;
  toggleLanguage: (id: string) => void;
}): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <SearchInput
        placeholder='Search languages...'
        value={languageQuery}
        onChange={(event) => setLanguageQuery(event.target.value)}
        onClear={() => setLanguageQuery('')}
        size='sm'
      />

      <div className='space-y-1'>
        <SelectedLanguagesList
          selectedLanguageIds={selectedLanguageIds}
          defaultLanguageId={defaultLanguageId}
          getLanguage={getLanguage}
          moveLanguage={moveLanguage}
          toggleLanguage={toggleLanguage}
        />
      </div>

      <AvailableLanguagesList availableLanguages={availableLanguages} toggleLanguage={toggleLanguage} />

      <DefaultLanguageSelect
        defaultLanguageId={defaultLanguageId}
        setDefaultLanguageId={setDefaultLanguageId}
        selectedLanguageIds={selectedLanguageIds}
        defaultLanguageOptions={defaultLanguageOptions}
      />
    </div>
  );
}
