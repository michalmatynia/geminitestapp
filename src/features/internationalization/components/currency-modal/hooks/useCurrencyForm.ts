import React from 'react';

import { useSaveCurrencyMutation } from '@/features/internationalization/hooks/useInternationalizationMutations';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { CurrencyOption } from '@/shared/contracts/internationalization';
import { useToast } from '@/shared/ui';

interface CurrencyFormState {
  code: string;
  name: string;
  symbol: string;
}

interface UseCurrencyFormProps {
  currency?: CurrencyOption | null;
}

interface UseCurrencyFormReturn {
  form: CurrencyFormState;
  setForm: React.Dispatch<React.SetStateAction<CurrencyFormState>>;
  saveMutation: ReturnType<typeof useSaveCurrencyMutation>;
  handleSubmit: () => Promise<void>;
}

export function useCurrencyForm({ currency }: UseCurrencyFormProps): UseCurrencyFormReturn {
  const [form, setForm] = React.useState<CurrencyFormState>({
    code: '',
    name: '',
    symbol: '',
  });
  const { toast } = useToast();
  const saveMutation = useSaveCurrencyMutation();

  React.useEffect(() => {
    if (currency) {
      setForm({
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol ?? '',
      });
    } else {
      setForm({ code: 'PLN', name: 'Polish Zloty', symbol: 'zł' });
    }
  }, [currency]);

  const handleSubmit = async (): Promise<void> => {
    if (!form.code.trim() || !form.name.trim()) {
      toast('Required fields missing.', { variant: 'error' });
      return;
    }

    try {
      const payload: { id?: string; data: { code: string; name: string; symbol: string } } = {
        data: {
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
          symbol: form.symbol.trim(),
        },
      };
      if (currency?.id) {
        payload.id = currency.id;
      }

      await saveMutation.mutateAsync(payload);

      toast('Currency saved.', { variant: 'success' });
    } catch (err) {
      logClientError(err, {
        context: { source: 'CurrencyModal', action: 'saveCurrency', currencyId: currency?.id },
      });
      toast('Failed to save currency.', { variant: 'error' });
    }
  };

  return {
    form,
    setForm,
    saveMutation,
    handleSubmit,
  };
}
