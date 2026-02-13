'use client';

import React from 'react';

import { useInternationalizationContext } from '@/features/internationalization/context/InternationalizationContext';
import type { Catalog, PriceGroup } from '@/features/products/types';
import { Alert, SettingsFormModal } from '@/shared/ui';

import { CatalogFormFields } from './CatalogFormFields';
import { CatalogLanguagesSection } from './CatalogLanguagesSection';
import { CatalogPriceGroupsSection } from './CatalogPriceGroupsSection';
import { CatalogModalProvider } from './context/CatalogModalContext';
import { useCatalogForm } from './hooks/useCatalogForm';
import { toggleLanguage, moveLanguage, togglePriceGroup } from './utils/catalogModalUtils';

interface CatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  catalog?: Catalog | null;
  priceGroups: PriceGroup[];
  loadingGroups: boolean;
  defaultGroupId: string;
}

export function CatalogModal({
  isOpen,
  onClose,
  onSuccess,
  catalog,
  priceGroups,
  loadingGroups,
  defaultGroupId,
}: CatalogModalProps): React.JSX.Element {
  const {
    languages,
    languagesLoading,
    languagesError,
  } = useInternationalizationContext();

  const {
    form,
    setForm,
    selectedLanguageIds,
    setSelectedLanguageIds,
    defaultLanguageId,
    setDefaultLanguageId,
    catalogPriceGroupIds,
    setCatalogPriceGroupIds,
    catalogDefaultPriceGroupId,
    setCatalogDefaultPriceGroupId,
    languageQuery,
    setLanguageQuery,
    error,
    canonicalizeLanguageId,
    getLanguage,
    saveMutation,
    handleSubmit: handleFormSubmit,
  } = useCatalogForm({
    catalog,
    languages,
    defaultGroupId,
  });

  const availableLanguages = React.useMemo(
    () => {
      const query = languageQuery.trim().toLowerCase();
      const selectedSet = new Set(
        selectedLanguageIds
          .map((id: string) => canonicalizeLanguageId(id))
          .filter((id: string) => Boolean(id))
      );
      return languages.filter(
        (l) =>
          !selectedSet.has(l.id) &&
          (!query ||
            l.name.toLowerCase().includes(query) ||
            l.code.toLowerCase().includes(query)),
      );
    },
    [languages, selectedLanguageIds, languageQuery, canonicalizeLanguageId]
  );

  const handleToggleLanguage = React.useCallback(
    (id: string): void => {
      setSelectedLanguageIds(
        toggleLanguage(
          selectedLanguageIds,
          id,
          defaultLanguageId,
          setDefaultLanguageId
        )
      );
    },
    [
      defaultLanguageId,
      selectedLanguageIds,
      setDefaultLanguageId,
      setSelectedLanguageIds,
    ]
  );

  const handleMoveLanguage = React.useCallback(
    (id: string, direction: 'up' | 'down'): void => {
      setSelectedLanguageIds(moveLanguage(selectedLanguageIds, id, direction));
    },
    [selectedLanguageIds, setSelectedLanguageIds]
  );

  const handleTogglePriceGroup = React.useCallback(
    (id: string): void => {
      setCatalogPriceGroupIds(
        togglePriceGroup(
          catalogPriceGroupIds,
          id,
          catalogDefaultPriceGroupId,
          setCatalogDefaultPriceGroupId
        )
      );
    },
    [
      catalogDefaultPriceGroupId,
      catalogPriceGroupIds,
      setCatalogDefaultPriceGroupId,
      setCatalogPriceGroupIds,
    ]
  );

  const contextValue = React.useMemo(
    () => ({
      form,
      setForm,
      selectedLanguageIds,
      toggleLanguage: handleToggleLanguage,
      moveLanguage: handleMoveLanguage,
      defaultLanguageId,
      setDefaultLanguageId,
      languageQuery,
      setLanguageQuery,
      availableLanguages,
      getLanguage,
      languagesLoading,
      languagesError,
      error,
      catalogPriceGroupIds,
      togglePriceGroup: handleTogglePriceGroup,
      catalogDefaultPriceGroupId,
      setCatalogDefaultPriceGroupId,
      priceGroups,
      loadingGroups,
    }),
    [
      availableLanguages,
      catalogDefaultPriceGroupId,
      catalogPriceGroupIds,
      defaultLanguageId,
      form,
      getLanguage,
      handleMoveLanguage,
      handleToggleLanguage,
      handleTogglePriceGroup,
      languageQuery,
      languagesError,
      languagesLoading,
      loadingGroups,
      priceGroups,
      selectedLanguageIds,
      setCatalogDefaultPriceGroupId,
      setDefaultLanguageId,
      setForm,
      setLanguageQuery,
    ]
  );

  const handleSubmit = async (): Promise<void> => {
    await handleFormSubmit();
    if (!error) {
      onSuccess();
    }
  };

  return (
    <SettingsFormModal
      open={isOpen}
      onClose={onClose}
      title={catalog ? 'Edit Catalog' : 'Create Catalog'}
      onSave={handleSubmit}
      isSaving={saveMutation.isPending}
      size='lg'
    >
      <CatalogModalProvider value={contextValue}>
        <div className='space-y-6'>
          {error && (
            <Alert variant='error' className='p-3 text-xs'>
              {error}
            </Alert>
          )}

          <CatalogFormFields />
          <CatalogLanguagesSection />
          <CatalogPriceGroupsSection />
        </div>
      </CatalogModalProvider>
    </SettingsFormModal>
  );
}
