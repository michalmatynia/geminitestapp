'use client';

import React from 'react';

import { useSaveCountryMutation } from '@/features/internationalization/hooks/useInternationalizationMutations';
import type { CountryOption, CurrencyOption } from '@/shared/contracts/internationalization';
import { useToast } from '@/shared/ui';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

interface CountryFormState {
  code: string;
  name: string;
}

interface UseCountryFormProps {
  country?: CountryOption | null;
  defaultCountryCode: string;
  defaultCountryName: string;
}

interface UseCountryFormReturn {
  form: CountryFormState;
  setForm: React.Dispatch<React.SetStateAction<CountryFormState>>;
  selectedCurrencyIds: string[];
  setSelectedCurrencyIds: React.Dispatch<React.SetStateAction<string[]>>;
  saveMutation: ReturnType<typeof useSaveCountryMutation>;
  handleSubmit: (currencies: CurrencyOption[]) => Promise<void>;
}

export function useCountryForm({
  country,
  defaultCountryCode,
  defaultCountryName,
}: UseCountryFormProps): UseCountryFormReturn {
  const [form, setForm] = React.useState<CountryFormState>({
    code: defaultCountryCode,
    name: defaultCountryName,
  });
  const [selectedCurrencyIds, setSelectedCurrencyIds] = React.useState<string[]>([]);
  const { toast } = useToast();
  const saveMutation = useSaveCountryMutation();

  React.useEffect(() => {
    if (country) {
      setForm({ code: country.code, name: country.name });
      setSelectedCurrencyIds(
        country.currencies?.map((c: { currencyId: string }) => c.currencyId) ?? []
      );
    } else {
      setForm({
        code: defaultCountryCode,
        name: defaultCountryName,
      });
      setSelectedCurrencyIds([]);
    }
  }, [country, defaultCountryCode, defaultCountryName]);

  const handleSubmit = async (_currencies: CurrencyOption[]): Promise<void> => {
    if (!form.code.trim() || !form.name.trim()) {
      toast('Required fields missing.', { variant: 'error' });
      return;
    }

    try {
      const payload: { id?: string; data: { code: string; name: string; currencyIds: string[] } } =
        {
          data: {
            code: form.code.trim().toUpperCase(),
            name: form.name.trim(),
            currencyIds: selectedCurrencyIds,
          },
        };
      if (country?.id) {
        payload.id = country.id;
      }

      await saveMutation.mutateAsync(payload);

      toast('Country saved.', { variant: 'success' });
    } catch (err) {
      logClientCatch(err, {
        source: 'CountryModal',
        action: 'saveCountry',
        countryId: country?.id,
      });
      toast('Failed to save country.', { variant: 'error' });
    }
  };

  return {
    form,
    setForm,
    selectedCurrencyIds,
    setSelectedCurrencyIds,
    saveMutation,
    handleSubmit,
  };
}
