'use client';

import React from 'react';
import { useInternationalizationContext } from '@/features/internationalization/context/InternationalizationContext';
import { Alert, SettingsFormModal } from '@/shared/ui';
import { useCatalogForm } from './hooks/useCatalogForm';
import { CatalogFormFields } from './CatalogFormFields';
import { CatalogLanguagesSection } from './CatalogLanguagesSection';
import { CatalogPriceGroupsSection } from './CatalogPriceGroupsSection';
import { toggleLanguage, moveLanguage, togglePriceGroup } from './utils/catalogModalUtils';
import type { Catalog, PriceGroup } from '@/features/products/types';

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
    languageIdByAnyValue,
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
      <div className='space-y-6'>
        {error && (
          <Alert variant='error' className='p-3 text-xs'>
            {error}
          </Alert>
        )}

        <CatalogFormFields
          name={form.name}
          onNameChange={(name) => setForm((p) => ({ ...p, name }))}
          description={form.description}
          onDescriptionChange={(description) =>
            setForm((p) => ({ ...p, description }))
          }
          isDefault={form.isDefault}
          onIsDefaultChange={(isDefault) =>
            setForm((p) => ({ ...p, isDefault }))
          }
        />

        <CatalogLanguagesSection
          selectedLanguageIds={selectedLanguageIds}
          onToggleLanguage={(id) =>
            setSelectedLanguageIds(
              toggleLanguage(
                selectedLanguageIds,
                id,
                defaultLanguageId,
                setDefaultLanguageId
              )
            )
          }
          onMoveLanguage={(id, direction) =>
            setSelectedLanguageIds(moveLanguage(selectedLanguageIds, id, direction))
          }
          defaultLanguageId={defaultLanguageId}
          onSetDefaultLanguageId={setDefaultLanguageId}
          languageQuery={languageQuery}
          onLanguageQueryChange={setLanguageQuery}
          availableLanguages={availableLanguages}
          getLanguage={getLanguage}
          languagesLoading={languagesLoading}
          languagesError={languagesError}
        />

        <CatalogPriceGroupsSection
          catalogPriceGroupIds={catalogPriceGroupIds}
          onTogglePriceGroup={(id) =>
            setCatalogPriceGroupIds(
              togglePriceGroup(
                catalogPriceGroupIds,
                id,
                catalogDefaultPriceGroupId,
                setCatalogDefaultPriceGroupId
              )
            )
          }
          catalogDefaultPriceGroupId={catalogDefaultPriceGroupId}
          onSetDefaultPriceGroupId={setCatalogDefaultPriceGroupId}
          priceGroups={priceGroups}
          loadingGroups={loadingGroups}
        />
      </div>
    </SettingsFormModal>
  );
}
