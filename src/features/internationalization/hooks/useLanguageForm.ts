import React from 'react';

import { useInternationalizationContext } from '@/features/internationalization/context/InternationalizationContext';
import { useSaveLanguageMutation } from '@/features/internationalization/hooks/useInternationalizationMutations';
import { useToast } from '@/shared/ui';

type UseLanguageFormResult = {
  form: {
    code: string;
    name: string;
    nativeName: string;
  };
  setForm: (value: React.SetStateAction<{ code: string; name: string; nativeName: string }>) => void;
  selectedCountryIds: string[];
  toggleCountry: (id: string) => void;
  isSaving: boolean;
  handleSubmit: () => Promise<void>;
};

export function useLanguageForm(): UseLanguageFormResult {
  const { editingLanguage: language } = useInternationalizationContext();
  const { toast } = useToast();
  const saveMutation = useSaveLanguageMutation();

  const [form, setForm] = React.useState({
    code: '',
    name: '',
    nativeName: '',
  });
  const [selectedCountryIds, setSelectedCountryIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (language) {
      setForm({
        code: language.code,
        name: language.name,
        nativeName: language.nativeName ?? '',
      });
      setSelectedCountryIds(language.countries?.map((c) => c.countryId) ?? []);
    } else {
      setForm({ code: '', name: '', nativeName: '' });
      setSelectedCountryIds([]);
    }
  }, [language]);

  const handleSubmit = async (): Promise<void> => {
    if (!form.code.trim() || !form.name.trim()) {
      toast('Language code and name are required.', { variant: 'error' });
      return;
    }

    try {
      await saveMutation.mutateAsync({
        id: language?.id,
        data: {
          code: form.code.trim(),
          name: form.name.trim(),
          nativeName: form.nativeName.trim() || null,
          countryIds: selectedCountryIds,
        },
      });

      toast('Language saved.', { variant: 'success' });
    } catch (err) {
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
