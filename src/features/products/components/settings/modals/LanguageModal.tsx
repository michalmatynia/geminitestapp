'use client';

import React from 'react';

import { useInternationalizationContext } from '@/features/internationalization/context/InternationalizationContext';
import { useLanguageForm } from '@/features/internationalization/hooks/useLanguageForm';
import { LanguageFormFields } from '@/features/internationalization/components/language-modal/LanguageFormFields';
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
      <LanguageFormFields
        code={form.code}
        onCodeChange={(value: string) =>
          setForm({ ...form, code: value })
        }
        name={form.name}
        onNameChange={(value: string) =>
          setForm({ ...form, name: value })
        }
        nativeName={form.nativeName}
        onNativeNameChange={(value: string) =>
          setForm({ ...form, nativeName: value })
        }
        countries={countries}
        selectedCountryIds={selectedCountryIds}
        onCountryToggle={toggleCountry}
      />
    </SettingsFormModal>
  );
}
