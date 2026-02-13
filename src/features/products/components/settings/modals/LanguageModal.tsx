'use client';

import React from 'react';

import { useInternationalizationContext } from '@/features/internationalization/context/InternationalizationContext';
import { SettingsFormModal } from '@/shared/ui';

import { useLanguageForm } from '../../hooks/useLanguageForm';
import { LanguageFormFields } from './language-modal/LanguageFormFields';

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
        onCodeChange={(value) =>
          setForm((p) => ({ ...p, code: value }))
        }
        name={form.name}
        onNameChange={(value) =>
          setForm((p) => ({ ...p, name: value }))
        }
        nativeName={form.nativeName}
        onNativeNameChange={(value) =>
          setForm((p) => ({ ...p, nativeName: value }))
        }
        countries={countries}
        selectedCountryIds={selectedCountryIds}
        onCountryToggle={toggleCountry}
      />
    </SettingsFormModal>
  );
}
