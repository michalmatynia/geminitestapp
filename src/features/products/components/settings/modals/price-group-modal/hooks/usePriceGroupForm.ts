'use client';

import React from 'react';

import { useSavePriceGroupMutation } from '@/features/products/hooks/useProductSettingsQueries';
import type { PriceGroup } from '@/shared/contracts/products/catalogs';
import { useToast } from '@/shared/ui/toast';

import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

interface PriceGroupFormState {
  name: string;
  currencyCode: string;
  isDefault: boolean;
  type: string;
  sourceGroupId: string;
  priceMultiplier: number;
  addToPrice: number;
}

interface UsePriceGroupFormProps {
  priceGroup?: PriceGroup | null | undefined;
  priceGroups?: PriceGroup[] | undefined;
}

interface UsePriceGroupFormReturn {
  form: PriceGroupFormState;
  setForm: React.Dispatch<React.SetStateAction<PriceGroupFormState>>;
  saveMutation: ReturnType<typeof useSavePriceGroupMutation>;
  handleSubmit: () => Promise<void>;
}

const EMPTY_PRICE_GROUPS: PriceGroup[] = [];

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeSourceGroupId = (
  sourceGroupId: string | null | undefined,
  priceGroups: PriceGroup[]
): string => {
  const normalizedSourceGroupId = toTrimmedString(sourceGroupId);
  if (!normalizedSourceGroupId) {
    return '';
  }

  const matchingGroup = priceGroups.find((group) => {
    const groupId = toTrimmedString(group.id);
    const legacyGroupId = toTrimmedString(group.groupId);
    return normalizedSourceGroupId === groupId || normalizedSourceGroupId === legacyGroupId;
  });

  return matchingGroup ? toTrimmedString(matchingGroup.id) : normalizedSourceGroupId;
};

const wouldCreateSourceGroupCycle = ({
  currentPriceGroup,
  sourceGroupId,
  priceGroups,
}: {
  currentPriceGroup?: PriceGroup | null | undefined;
  sourceGroupId: string;
  priceGroups: PriceGroup[];
}): boolean => {
  const normalizedSourceGroupId = normalizeSourceGroupId(sourceGroupId, priceGroups);
  if (!normalizedSourceGroupId) {
    return false;
  }

  const selfIdentifiers = new Set(
    [currentPriceGroup?.id, currentPriceGroup?.groupId]
      .map((value) => toTrimmedString(value))
      .filter(Boolean)
  );
  const groupByIdentifier = new Map<string, PriceGroup>();

  priceGroups.forEach((group) => {
    const id = toTrimmedString(group.id);
    const groupId = toTrimmedString(group.groupId);
    if (id) {
      groupByIdentifier.set(id, group);
    }
    if (groupId) {
      groupByIdentifier.set(groupId, group);
    }
  });

  const visited = new Set<string>();
  let currentIdentifier = normalizedSourceGroupId;

  while (currentIdentifier) {
    if (selfIdentifiers.has(currentIdentifier) || visited.has(currentIdentifier)) {
      return true;
    }

    visited.add(currentIdentifier);
    const currentGroup = groupByIdentifier.get(currentIdentifier);
    currentIdentifier = toTrimmedString(currentGroup?.sourceGroupId);
  }

  return false;
};

const buildInitialFormState = (
  priceGroup?: PriceGroup | null,
  priceGroups: PriceGroup[] = []
): PriceGroupFormState => {
  if (!priceGroup) {
    return {
      name: '',
      currencyCode: 'PLN',
      isDefault: false,
      type: 'standard',
      sourceGroupId: '',
      priceMultiplier: 1,
      addToPrice: 0,
    };
  }

  return {
    name: priceGroup.name,
    currencyCode: priceGroup.currencyCode,
    isDefault: priceGroup.isDefault,
    type: toTrimmedString(priceGroup.type) || 'standard',
    sourceGroupId: normalizeSourceGroupId(priceGroup.sourceGroupId, priceGroups),
    priceMultiplier:
      typeof priceGroup.priceMultiplier === 'number' ? priceGroup.priceMultiplier : 1,
    addToPrice: typeof priceGroup.addToPrice === 'number' ? priceGroup.addToPrice : 0,
  };
};

export function usePriceGroupForm({
  priceGroup,
  priceGroups = EMPTY_PRICE_GROUPS,
}: UsePriceGroupFormProps): UsePriceGroupFormReturn {
  const [form, setForm] = React.useState<PriceGroupFormState>(() =>
    buildInitialFormState(priceGroup ?? null, priceGroups)
  );
  const { toast } = useToast();
  const saveMutation = useSavePriceGroupMutation();

  React.useEffect(() => {
    setForm(buildInitialFormState(priceGroup ?? null, priceGroups));
  }, [priceGroup, priceGroups]);

  React.useEffect(() => {
    setForm((currentForm) => {
      const normalizedSourceGroupId = normalizeSourceGroupId(
        currentForm.sourceGroupId,
        priceGroups
      );
      if (normalizedSourceGroupId === currentForm.sourceGroupId) {
        return currentForm;
      }
      return {
        ...currentForm,
        sourceGroupId: normalizedSourceGroupId,
      };
    });
  }, [priceGroups]);

  const handleSubmit = async (): Promise<void> => {
    const name = form.name.trim();
    const currencyCode = form.currencyCode.trim();
    if (!name || !currencyCode) {
      toast('Name and currency are required.', { variant: 'error' });
      return;
    }

    const groupType = toTrimmedString(form.type) || 'standard';
    const normalizedSourceGroupId =
      groupType === 'dependent'
        ? normalizeSourceGroupId(form.sourceGroupId, priceGroups)
        : '';

    if (groupType === 'dependent' && !normalizedSourceGroupId) {
      toast('Dependent price groups require a source price group.', { variant: 'error' });
      return;
    }

    if (
      groupType === 'dependent' &&
      wouldCreateSourceGroupCycle({
        currentPriceGroup: priceGroup,
        sourceGroupId: normalizedSourceGroupId,
        priceGroups,
      })
    ) {
      toast('Dependent price groups cannot reference themselves through a source-group cycle.', {
        variant: 'error',
      });
      return;
    }

    try {
      await saveMutation.mutateAsync({
        ...(priceGroup?.id ? { id: priceGroup.id } : {}),
        data: {
          name,
          currencyCode,
          isDefault: form.isDefault,
          type: groupType,
          sourceGroupId: groupType === 'dependent' ? normalizedSourceGroupId : null,
          priceMultiplier: form.priceMultiplier,
          addToPrice: form.addToPrice,
        },
      });

      toast('Price group saved.', { variant: 'success' });
    } catch (err) {
      logClientCatch(err, {
        source: 'PriceGroupModal',
        action: 'savePriceGroup',
        priceGroupId: priceGroup?.id,
      });
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
