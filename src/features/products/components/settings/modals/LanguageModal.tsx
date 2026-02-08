'use client';

import React from 'react';

import { useInternationalizationContext } from '@/features/internationalization/context/InternationalizationContext';
import { useSaveLanguageMutation } from '@/features/internationalization/hooks/useInternationalizationMutations';
import { logClientError } from '@/features/observability';
import {
  Input,
  Label,
  Checkbox,
  useToast,
  FormModal,
} from '@/shared/ui';

export function LanguageModal(): React.JSX.Element {
  const {
    showLanguageModal: isOpen,
    setLanguageModalOpen,
    editingLanguage: language,
    countries,
  } = useInternationalizationContext();

  const onClose = () => setLanguageModalOpen(false);
  const onSuccess = () => setLanguageModalOpen(false);

  const { toast } = useToast();
  const saveMutation = useSaveLanguageMutation();
  const [form, setForm] = React.useState({
    code: '',
    name: '',
    nativeName: '',
  });
  const [selectedCountryIds, setSelectedCountryIds] = React.useState<string[]>(
    [],
  );

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
      onSuccess();
    } catch (err) {
      logClientError(err, { context: { source: 'LanguageModal', action: 'saveLanguage', languageId: language?.id } });
      toast('Failed to save language.', { variant: 'error' });
    }
  };

  const toggleCountry = (id: string): void => {
    setSelectedCountryIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={language ? 'Edit Language' : 'Add Language'}
      onSave={() => {
        void handleSubmit();
      }}
      isSaving={saveMutation.isPending}
      saveText={language ? 'Update' : 'Add'}
      cancelText='Close'
      size='md'
    >
      <div className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='lang-code'>Code</Label>
          <Input
            id='lang-code'
            value={form.code}
            onChange={(e) =>
              setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))
            }
            placeholder='e.g. EN'
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='lang-name'>Name</Label>
          <Input
            id='lang-name'
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder='e.g. English'
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='lang-native'>Native Name</Label>
          <Input
            id='lang-native'
            value={form.nativeName}
            onChange={(e) =>
              setForm((p) => ({ ...p, nativeName: e.target.value }))
            }
            placeholder='e.g. English'
          />
        </div>
        <div className='space-y-2'>
          <Label>Associated Countries</Label>
          <div className='mt-2 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-md border border-border bg-card/50 p-3'>
            {countries.map((country) => (
              <Label
                key={country.id}
                className='flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded transition-colors'
              >
                <Checkbox
                  checked={selectedCountryIds.includes(country.id)}
                  onCheckedChange={() => toggleCountry(country.id)}
                />
                <span className='text-xs text-gray-200'>
                  {country.name} ({country.code})
                </span>
              </Label>
            ))}
          </div>
        </div>
      </div>
    </FormModal>
  );
}