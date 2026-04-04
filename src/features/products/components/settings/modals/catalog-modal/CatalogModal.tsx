'use client';

import React from 'react';

import { useInternationalizationData } from '@/features/internationalization/public';
import type { Catalog, PriceGroup } from '@/shared/contracts/products';
import type { EntityModalProps } from '@/shared/contracts/ui';
import { Alert } from '@/shared/ui/alert';
import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';

import type { SettingsPanelField } from '@/shared/contracts/ui';

import { CatalogLanguagesSection } from './CatalogLanguagesSection';
import { CatalogPriceGroupsSection } from './CatalogPriceGroupsSection';
import { CatalogModalProvider } from './context/CatalogModalContext';
import { useCatalogForm } from './hooks/useCatalogForm';
import { toggleLanguage, moveLanguage, togglePriceGroup } from './utils/catalogModalUtils';

interface CatalogModalProps extends EntityModalProps<Catalog, PriceGroup> {
  defaultId?: string;
}

export function CatalogModal(props: CatalogModalProps): React.JSX.Element {
  const {
    isOpen,
    onClose,
    onSuccess,
    item: catalog,
    items: priceGroups = [],
    loading: loadingGroups = false,
    defaultId: defaultGroupId = '',
  } = props;

  const { languages, languagesLoading, languagesError } = useInternationalizationData();

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
    priceGroups,
    defaultGroupId,
  });

  const availableLanguages = React.useMemo(() => {
    const query = languageQuery.trim().toLowerCase();
    const selectedSet = new Set(
      selectedLanguageIds
        .map((id: string) => canonicalizeLanguageId(id))
        .filter((id: string) => Boolean(id))
    );
    return languages.filter(
      (l) =>
        !selectedSet.has(l.id) &&
        (!query || l.name.toLowerCase().includes(query) || l.code.toLowerCase().includes(query))
    );
  }, [languages, selectedLanguageIds, languageQuery, canonicalizeLanguageId]);

  const handleToggleLanguage = React.useCallback(
    (id: string): void => {
      setSelectedLanguageIds(
        toggleLanguage(selectedLanguageIds, id, defaultLanguageId, setDefaultLanguageId)
      );
    },
    [defaultLanguageId, selectedLanguageIds, setDefaultLanguageId, setSelectedLanguageIds]
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
      onSuccess?.();
    }
  };

  const handleChange = (vals: Partial<typeof form>) => {
    setForm((prev) => ({ ...prev, ...vals }));
  };

  const fields: SettingsPanelField<typeof form>[] = [
    {
      key: 'name',
      label: 'Catalog Name',
      type: 'text',
      placeholder: 'e.g. Main Catalog',
      required: true,
    },
    {
      key: 'isDefault',
      label: 'Set as default catalog',
      type: 'checkbox',
    },
    {
      key: 'name', // Using key for custom section
      label: 'Languages & Pricing',
      type: 'custom',
      render: () => (
        <CatalogModalProvider value={contextValue}>
          <div className='space-y-6'>
            <CatalogLanguagesSection />
            <CatalogPriceGroupsSection />
          </div>
        </CatalogModalProvider>
      ),
    },
  ];

  return (
    <>
      <SettingsPanelBuilder
        open={isOpen}
        onClose={onClose}
        title={catalog ? 'Edit Catalog' : 'Create Catalog'}
        onSave={handleSubmit}
        isSaving={saveMutation.isPending}
        fields={fields}
        values={form}
        onChange={handleChange}
        size='lg'
      />
      {error && (
        <div className='fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-4'>
          <Alert variant='error' className='shadow-2xl'>
            {error}
          </Alert>
        </div>
      )}
    </>
  );
}
