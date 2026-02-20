import React from 'react';

import { logClientError } from '@/features/observability';
import { useSavePriceGroupMutation } from '@/features/products/hooks/useProductSettingsQueries';
import type { PriceGroup } from '@/shared/contracts/products';
import { useToast } from '@/shared/ui';

interface PriceGroupFormState {
  name: string;
  currencyCode: string;
  isDefault: boolean;
}

interface UsePriceGroupFormProps {
  priceGroup?: PriceGroup | null | undefined;
}

interface UsePriceGroupFormReturn {
  form: PriceGroupFormState;
  setForm: React.Dispatch<React.SetStateAction<PriceGroupFormState>>;
  saveMutation: ReturnType<typeof useSavePriceGroupMutation>;
  handleSubmit: () => Promise<void>;
}

export function usePriceGroupForm({
  priceGroup,
}: UsePriceGroupFormProps): UsePriceGroupFormReturn {
  const [form, setForm] = React.useState<PriceGroupFormState>({
    name: '',
    currencyCode: '',
    isDefault: false,
  });
  const { toast } = useToast();
  const saveMutation = useSavePriceGroupMutation();

  React.useEffect(() => {
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
    const name = form.name.trim();
    if (!name || !form.currencyCode.trim()) {
      toast('Name and currency are required.', { variant: 'error' });
      return;
    }

    try {
      await saveMutation.mutateAsync({
        ...(priceGroup?.id ? { id: priceGroup.id } : {}),
        data: {
          name,
          currencyCode: form.currencyCode.trim(),
          isDefault: form.isDefault,
        },
      });

      toast('Price group saved.', { variant: 'success' });
    } catch (err) {
      logClientError(err, { context: { source: 'PriceGroupModal', action: 'savePriceGroup', priceGroupId: priceGroup?.id } });
      toast('Failed to save price group.', { variant: 'error' });
    }
  };

  return {
    form,
    setForm,
    saveMutation,
    handleSubmit,
  };
}
