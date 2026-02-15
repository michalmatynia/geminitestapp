'use client';

import React from 'react';

import { LanguageFormFields } from '@/features/internationalization/components/language-modal/LanguageFormFields';
import { LanguageModalProvider } from '@/features/internationalization/components/language-modal/LanguageModalContext';
import { useLanguageForm } from '@/features/internationalization/hooks/useLanguageForm';
import type { CountryOption, Language } from '@/shared/types/domain/internationalization';
import type { EntityModalProps } from '@/shared/types/modal-props';
import { SettingsFormModal } from '@/shared/ui';

interface LanguageModalProps extends EntityModalProps<Language, CountryOption> {}

export function LanguageModal({
  isOpen,
  onClose,
  onSuccess,
  item: language,
  items: countries = [],
}: LanguageModalProps): React.JSX.Element {
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
