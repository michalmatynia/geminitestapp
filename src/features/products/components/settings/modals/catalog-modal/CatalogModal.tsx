'use client';

import React from 'react';

import { useInternationalizationData } from '@/features/internationalization/public';
import type { Language } from '@/shared/contracts/internationalization';
import type { Catalog, PriceGroup } from '@/shared/contracts/products/catalogs';
import type { EntityModalProps } from '@/shared/contracts/ui/modals';
import { Alert } from '@/shared/ui/alert';
import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';

import type { SettingsPanelField } from '@/shared/contracts/ui/settings';

import { CatalogLanguagesSection } from './CatalogLanguagesSection';
import { CatalogPriceGroupsSection } from './CatalogPriceGroupsSection';
import { CatalogModalProvider } from './context/CatalogModalContext';
import { useCatalogForm } from './hooks/useCatalogForm';
import { toggleLanguage, moveLanguage, togglePriceGroup } from './utils/catalogModalUtils';

interface CatalogModalProps extends EntityModalProps<Catalog, PriceGroup> {
  defaultId?: string;
}

type CatalogFormController = ReturnType<typeof useCatalogForm>;
type CatalogModalProviderValue = Parameters<typeof CatalogModalProvider>[0]['value'];

type CatalogLanguageHandlers = {
  handleMoveLanguage: (id: string, direction: 'up' | 'down') => void;
  handleToggleLanguage: (id: string) => void;
};

type CatalogModalController = {
  catalog?: Catalog | null | undefined;
  error: string | null;
  fields: Array<SettingsPanelField<CatalogFormController['form']>>;
  form: CatalogFormController['form'];
  handleChange: (vals: Partial<CatalogFormController['form']>) => void;
  handleSubmit: () => Promise<void>;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
};

function useAvailableCatalogLanguages(
  catalogForm: CatalogFormController,
  languages: Language[]
): Language[] {
  return React.useMemo(() => {
    const query = catalogForm.languageQuery.trim().toLowerCase();
    const selectedSet = new Set(
      catalogForm.selectedLanguageIds
        .map((id: string) => catalogForm.canonicalizeLanguageId(id))
        .filter((id: string) => id !== '')
    );
    return languages.filter(
      (language) =>
        !selectedSet.has(language.id) &&
        (query === '' || language.name.toLowerCase().includes(query) || language.code.toLowerCase().includes(query))
    );
  }, [catalogForm, languages]);
}

function useCatalogLanguageHandlers(catalogForm: CatalogFormController): CatalogLanguageHandlers {
  const handleToggleLanguage = React.useCallback(
    (id: string): void => {
      catalogForm.setSelectedLanguageIds(
        toggleLanguage(
          catalogForm.selectedLanguageIds,
          id,
          catalogForm.defaultLanguageId,
          catalogForm.setDefaultLanguageId
        )
      );
    },
    [catalogForm]
  );

  const handleMoveLanguage = React.useCallback(
    (id: string, direction: 'up' | 'down'): void => {
      catalogForm.setSelectedLanguageIds(
        moveLanguage(catalogForm.selectedLanguageIds, id, direction)
      );
    },
    [catalogForm]
  );

  return { handleMoveLanguage, handleToggleLanguage };
}

function useCatalogPriceGroupHandler(catalogForm: CatalogFormController): (id: string) => void {
  return React.useCallback(
    (id: string): void => {
      catalogForm.setCatalogPriceGroupIds(
        togglePriceGroup(
          catalogForm.catalogPriceGroupIds,
          id,
          catalogForm.catalogDefaultPriceGroupId,
          catalogForm.setCatalogDefaultPriceGroupId
        )
      );
    },
    [catalogForm]
  );
}

function buildCatalogModalContextValue({
  availableLanguages,
  catalogForm,
  handleMoveLanguage,
  handleToggleLanguage,
  handleTogglePriceGroup,
  intl,
  loadingGroups,
  priceGroups,
}: {
  availableLanguages: Language[];
  catalogForm: CatalogFormController;
  handleMoveLanguage: CatalogLanguageHandlers['handleMoveLanguage'];
  handleToggleLanguage: CatalogLanguageHandlers['handleToggleLanguage'];
  handleTogglePriceGroup: (id: string) => void;
  intl: ReturnType<typeof useInternationalizationData>;
  loadingGroups: boolean;
  priceGroups: PriceGroup[];
}): CatalogModalProviderValue {
  return {
    form: catalogForm.form,
    setForm: catalogForm.setForm,
    selectedLanguageIds: catalogForm.selectedLanguageIds,
    toggleLanguage: handleToggleLanguage,
    moveLanguage: handleMoveLanguage,
    defaultLanguageId: catalogForm.defaultLanguageId,
    setDefaultLanguageId: catalogForm.setDefaultLanguageId,
    languageQuery: catalogForm.languageQuery,
    setLanguageQuery: catalogForm.setLanguageQuery,
    availableLanguages,
    getLanguage: catalogForm.getLanguage,
    languagesLoading: intl.languagesLoading,
    languagesError: intl.languagesError,
    error: catalogForm.error,
    catalogPriceGroupIds: catalogForm.catalogPriceGroupIds,
    togglePriceGroup: handleTogglePriceGroup,
    catalogDefaultPriceGroupId: catalogForm.catalogDefaultPriceGroupId,
    setCatalogDefaultPriceGroupId: catalogForm.setCatalogDefaultPriceGroupId,
    priceGroups,
    loadingGroups,
  };
}

function useCatalogFields(
  contextValue: CatalogModalProviderValue
): Array<SettingsPanelField<CatalogFormController['form']>> {
  return React.useMemo(
    () => [
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
      key: 'name',
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
    ],
    [contextValue]
  );
}

function useCatalogSubmitHandler({
  error,
  handleFormSubmit,
  onSuccess,
}: {
  error: string | null;
  handleFormSubmit: () => Promise<void>;
  onSuccess?: (() => void) | undefined;
}): () => Promise<void> {
  return React.useCallback(async (): Promise<void> => {
    await handleFormSubmit();
    if (error === null) {
      onSuccess?.();
    }
  }, [error, handleFormSubmit, onSuccess]);
}

function useCatalogChangeHandler(
  setForm: CatalogFormController['setForm']
): (vals: Partial<CatalogFormController['form']>) => void {
  return React.useCallback(
    (vals: Partial<CatalogFormController['form']>): void => {
      setForm((prev) => ({ ...prev, ...vals }));
    },
    [setForm]
  );
}

function useCatalogModalController(props: CatalogModalProps): CatalogModalController {
  const priceGroups = props.items ?? [];
  const loadingGroups = props.loading ?? false;
  const intl = useInternationalizationData();
  const catalogForm = useCatalogForm({
    catalog: props.item,
    languages: intl.languages,
    priceGroups,
    defaultGroupId: props.defaultId ?? '',
  });
  const availableLanguages = useAvailableCatalogLanguages(catalogForm, intl.languages);
  const { handleMoveLanguage, handleToggleLanguage } = useCatalogLanguageHandlers(catalogForm);
  const handleTogglePriceGroup = useCatalogPriceGroupHandler(catalogForm);
  const contextValue = buildCatalogModalContextValue({
    availableLanguages,
    catalogForm,
    handleMoveLanguage,
    handleToggleLanguage,
    handleTogglePriceGroup,
    intl,
    loadingGroups,
    priceGroups,
  });
  const fields = useCatalogFields(contextValue);
  const handleChange = useCatalogChangeHandler(catalogForm.setForm);
  const handleSubmit = useCatalogSubmitHandler({
    error: catalogForm.error,
    handleFormSubmit: catalogForm.handleSubmit,
    onSuccess: props.onSuccess,
  });

  return {
    catalog: props.item,
    error: catalogForm.error,
    fields,
    form: catalogForm.form,
    handleChange,
    handleSubmit,
    isOpen: props.isOpen,
    isSaving: catalogForm.saveMutation.isPending,
    onClose: props.onClose,
  };
}

export function CatalogModal(props: CatalogModalProps): React.JSX.Element {
  const controller = useCatalogModalController(props);

  return (
    <>
      <SettingsPanelBuilder
        open={controller.isOpen}
        onClose={controller.onClose}
        title={controller.catalog ? 'Edit Catalog' : 'Create Catalog'}
        onSave={controller.handleSubmit}
        isSaving={controller.isSaving}
        fields={controller.fields}
        values={controller.form}
        onChange={controller.handleChange}
        size='lg'
      />
      {controller.error !== null && (
        <div className='fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-4'>
          <Alert variant='error' className='shadow-2xl'>
            {controller.error}
          </Alert>
        </div>
      )}
    </>
  );
}
