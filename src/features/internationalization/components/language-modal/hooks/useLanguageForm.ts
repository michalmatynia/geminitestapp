'use client';

import React from 'react';

import { useInternationalizationUi } from '@/features/internationalization/context/InternationalizationContext';
import { useSaveLanguageMutation } from '@/features/internationalization/hooks/useInternationalizationMutations';
import type { Language } from '@/shared/contracts/internationalization';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type LanguageForm = { code: string; name: string; nativeName: string };

type UseLanguageFormResult = {
  form: LanguageForm;
  setForm: React.Dispatch<React.SetStateAction<LanguageForm>>;
  selectedCountryIds: string[];
  toggleCountry: (id: string) => void;
  isSaving: boolean;
  handleSubmit: () => Promise<void>;
};

function useLanguageFormState(language: Language | null): {
  form: LanguageForm;
  setForm: React.Dispatch<React.SetStateAction<LanguageForm>>;
  selectedCountryIds: string[];
  setSelectedCountryIds: React.Dispatch<React.SetStateAction<string[]>>;
} {
  const [form, setForm] = React.useState<LanguageForm>({
    code: '',
    name: '',
    nativeName: '',
  });
  const [selectedCountryIds, setSelectedCountryIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (language !== null) {
      setForm({
        code: language.code,
        name: language.name,
        nativeName: language.nativeName,
      });
      setSelectedCountryIds(language.countries.map((c) => c.id));
    } else {
      setForm({ code: '', name: '', nativeName: '' });
      setSelectedCountryIds([]);
    }
  }, [language]);

  return { form, setForm, selectedCountryIds, setSelectedCountryIds };
}

export function useLanguageForm(): UseLanguageFormResult {
  const { activeLanguage: language } = useInternationalizationUi();
  const { toast } = useToast();
  const saveMutation = useSaveLanguageMutation();

  const { form, setForm, selectedCountryIds, setSelectedCountryIds } =
    useLanguageFormState(language);

  const handleSubmit = async (): Promise<void> => {
    const trimmedCode = form.code.trim();
    const trimmedName = form.name.trim();

    if (trimmedCode.length === 0 || trimmedName.length === 0) {
      toast('Language code and name are required.', { variant: 'error' });
      return;
    }

    try {
      const trimmedNativeName = form.nativeName.trim();
      const payload: {
        id?: string;
        data: {
          code: string;
          name: string;
          nativeName: string | undefined;
          countryIds: string[];
        };
      } = {
        data: {
          code: trimmedCode,
          name: trimmedName,
          nativeName: trimmedNativeName.length > 0 ? trimmedNativeName : undefined,
          countryIds: selectedCountryIds,
        },
      };

      if (language?.id !== undefined) {
        payload.id = language.id;
      }

      await saveMutation.mutateAsync(payload);
      toast('Language saved.', { variant: 'success' });
    } catch (err) {
      logClientError(err);
      toast('Failed to save language.', { variant: 'error' });
      throw err;
    }
  };

  const toggleCountry = (id: string): void => {
    setSelectedCountryIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return {
    form,
    setForm,
    selectedCountryIds,
    toggleCountry,
    isSaving: saveMutation.isPending,
    handleSubmit,
  };
}

