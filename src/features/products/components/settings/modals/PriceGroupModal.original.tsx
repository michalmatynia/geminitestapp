'use client';

import React from 'react';

import { useInternationalizationContext } from '@/features/internationalization';
import { logClientError } from '@/features/observability';
import { useSavePriceGroupMutation } from '@/features/products/hooks/useProductSettingsQueries';
import type { PriceGroup } from '@/features/products/types';
import {
  Input,
  Label,
  useToast,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SettingsFormModal,
} from '@/shared/ui';

interface PriceGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  priceGroup?: PriceGroup | null;
  priceGroups: PriceGroup[];
}

export function PriceGroupModal({
  isOpen,
  onClose,
  onSuccess,
  priceGroup,
  priceGroups,
}: PriceGroupModalProps): React.JSX.Element {
  const {
    currencies: currencyOptions,
    loadingCurrencies,
  } = useInternationalizationContext();

  const { toast } = useToast();
  const saveMutation = useSavePriceGroupMutation();
  const [form, setForm] = React.useState({
    name: '',
    currencyCode: '',
    isDefault: false,
  });

  React.useEffect((): void => {
    if (priceGroup) {
      setForm({
        name: priceGroup.name,
        currencyCode: priceGroup.currencyCode,
        isDefault: priceGroup.isDefault,
      });
    } else {
      setForm({ name: '', currencyCode: 'PLN', isDefault: false });
    }
  }, [priceGroup]);

  const handleSubmit = async (): Promise<void> => {
    if (!form.name.trim() || !form.currencyCode) {
      toast('Name and currency are required.', { variant: 'error' });
      return;
    }

    try {
      await saveMutation.mutateAsync({
        ...(priceGroup?.id ? { id: priceGroup.id } : {}),
        data: {
          name: form.name.trim(),
          currencyCode: form.currencyCode,
          isDefault: form.isDefault || priceGroups.length === 0,
        },
      });

      toast('Price group saved.', { variant: 'success' });
      onSuccess();
    } catch (err) {
      logClientError(err, { context: { source: 'PriceGroupModal', action: 'savePriceGroup', groupId: priceGroup?.id } });
      toast('Failed to save price group.', { variant: 'error' });
    }
  };

  return (
    <SettingsFormModal
      open={isOpen}
      onClose={onClose}
      title={priceGroup ? 'Edit Price Group' : 'Create Price Group'}
      onSave={handleSubmit}
      isSaving={saveMutation.isPending}
      size='md'
    >
      <div className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='pg-name'>Name</Label>
          <Input
            id='pg-name'
            value={form.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setForm((p: typeof form) => ({ ...p, name: e.target.value }))}
            placeholder='e.g. Retail PLN'
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='pg-currency'>Currency</Label>
          <Select
            value={form.currencyCode}
            onValueChange={(v: string): void => {
              setForm((p: typeof form) => ({ ...p, currencyCode: v }));
            }}
            disabled={loadingCurrencies}
          >
            <SelectTrigger className='w-full bg-gray-900 border-border text-white'>
              <SelectValue placeholder='Select currency' />
            </SelectTrigger>
            <SelectContent>
              {currencyOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.code}>
                  {opt.code} ({opt.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </SettingsFormModal>
  );
}
