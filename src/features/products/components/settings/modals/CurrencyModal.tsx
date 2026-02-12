import React from 'react';

import { useInternationalizationContext } from '@/features/internationalization/context/InternationalizationContext';
import { useSaveCurrencyMutation } from '@/features/internationalization/hooks/useInternationalizationMutations';
import { logClientError } from '@/features/observability';
import {
  Input,
  Label,
  useToast,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  FormModal,
} from '@/shared/ui';

export function CurrencyModal(): React.JSX.Element {
  const {
    showCurrencyModal: isOpen,
    setCurrencyModalOpen,
    editingCurrency: currency,
  } = useInternationalizationContext();

  const onClose = () => setCurrencyModalOpen(false);
  const onSuccess = () => setCurrencyModalOpen(false);

  const { toast } = useToast();
  const saveMutation = useSaveCurrencyMutation();
  const [form, setForm] = React.useState({
    code: '',
    name: '',
    symbol: '',
  });

  React.useEffect((): void => {
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
      await saveMutation.mutateAsync({
        id: currency?.id,
        data: {
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
          symbol: form.symbol.trim() || null,
        },
      });

      toast('Currency saved.', { variant: 'success' });
      onSuccess();
    } catch (err) {
      logClientError(err, { context: { source: 'CurrencyModal', action: 'saveCurrency', currencyId: currency?.id } });
      toast('Failed to save currency.', { variant: 'error' });
    }
  };

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title={currency ? 'Edit Currency' : 'Add Currency'}
      onSave={(): void => {
        void handleSubmit();
      }}
      isSaving={saveMutation.isPending}
      saveText={currency ? 'Update' : 'Add'}
      cancelText='Close'
      size='md'
    >
      <div className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='currency-code'>Code</Label>
          <Select
            value={form.code}
            onValueChange={(value: string): void => {
              setForm((p: typeof form) => ({ ...p, code: value }));
            }}
          >
            <SelectTrigger className='w-full bg-gray-900 border-border text-white'>
              <SelectValue placeholder='Select code' />
            </SelectTrigger>
            <SelectContent>
              {['PLN', 'EUR', 'USD', 'GBP', 'SEK'].map((code: string) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='space-y-2'>
          <Label htmlFor='currency-name'>Name</Label>
          <Input
            id='currency-name'
            value={form.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setForm((p: typeof form) => ({ ...p, name: e.target.value }))}
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='currency-symbol'>Symbol (optional)</Label>
          <Input
            id='currency-symbol'
            value={form.symbol}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setForm((p: typeof form) => ({ ...p, symbol: e.target.value }))}
            placeholder='$'
          />
        </div>
      </div>
    </FormModal>
  );
}