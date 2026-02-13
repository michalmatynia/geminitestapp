'use client';

import React from 'react';

import { LanguageFormFields } from '@/features/internationalization/components/language-modal/LanguageFormFields';
import { LanguageModalProvider } from '@/features/internationalization/components/language-modal/LanguageModalContext';
import { useInternationalizationContext } from '@/features/internationalization/context/InternationalizationContext';
import { useLanguageForm } from '@/features/internationalization/hooks/useLanguageForm';
import { SettingsFormModal } from '@/shared/ui';

export function LanguageModal(): React.JSX.Element {
  const {
    showLanguageModal: isOpen,
    setLanguageModalOpen,
    editingLanguage: language,
    countries,
  } = useInternationalizationContext();

  const onClose = () => setLanguageModalOpen(false);
  const onSuccess = () => setLanguageModalOpen(false);

  const {
    form,
    setForm,
    selectedCountryIds,
    toggleCountry,
    isSaving,
    handleSubmit,
  } = useLanguageForm();

  const handleSaveClick = async (): Promise<void> => {
    await handleSubmit();
    onSuccess();
  };

  return (
    <SettingsFormModal
      open={isOpen}
      onClose={onClose}
      title={language ? 'Edit Language' : 'Add Language'}
      onSave={handleSaveClick}
      isSaving={isSaving}
      size='md'
    >
      <LanguageModalProvider
        value={{
          form,
          setForm,
          countries,
          selectedCountryIds,
          toggleCountry,
        }}
      >
        <LanguageFormFields />
      </LanguageModalProvider>
    </SettingsFormModal>
  );
}
