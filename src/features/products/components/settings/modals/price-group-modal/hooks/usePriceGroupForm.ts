'use client';

import React from 'react';

import { useSavePriceGroupMutation } from '@/features/products/hooks/useProductSettingsQueries';
import {
  PRICE_GROUP_BASE_PRICE_FIELD,
  PRICE_GROUP_SOURCE_PRICE_FIELD,
  type PriceGroup,
} from '@/shared/contracts/products/catalogs';
import { useToast } from '@/shared/ui/toast';

import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import {
  isProductSourcePriceSelected,
  normalizeSourceGroupId,
  resolveInitialSourceGroupId,
  wouldCreateSourceGroupCycle,
} from './priceGroupSourceSelection';

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
  handleSubmit: () => Promise<boolean>;
}

const EMPTY_PRICE_GROUPS: PriceGroup[] = [];

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.length > 0;

const coerceFiniteNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const buildInitialFormState = (
  priceGroup?: PriceGroup | null,
  priceGroups: PriceGroup[] = []
): PriceGroupFormState => {
  if (priceGroup === null || priceGroup === undefined) {
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
    type: hasText(toTrimmedString(priceGroup.type)) ? toTrimmedString(priceGroup.type) : 'standard',
    sourceGroupId: resolveInitialSourceGroupId(priceGroup, priceGroups),
    priceMultiplier: coerceFiniteNumber(priceGroup.priceMultiplier, 1),
    addToPrice: coerceFiniteNumber(priceGroup.addToPrice, 0),
  };
};

type PriceGroupFormValidationResult =
  | {
      ok: true;
      name: string;
      currencyCode: string;
      groupType: string;
      normalizedSourceGroupId: string | null;
      basePriceField: string;
    }
  | { ok: false; message: string };

type PriceGroupSaveMutation = ReturnType<typeof useSavePriceGroupMutation>;
type ToastFn = ReturnType<typeof useToast>['toast'];

type DependentSourceValidation = {
  normalizedSourceGroupId: string | null;
  basePriceField: string;
};

type PriceGroupFormValidationError = Extract<PriceGroupFormValidationResult, { ok: false }>;

const normalizeGroupType = (value: string): string => {
  const groupType = toTrimmedString(value);
  return groupType.length > 0 ? groupType : 'standard';
};

const resolveDependentSourceValidation = (
  form: PriceGroupFormState,
  priceGroups: PriceGroup[]
): DependentSourceValidation => {
  const rawSourceGroupId = normalizeSourceGroupId(form.sourceGroupId, priceGroups);
  if (isProductSourcePriceSelected(rawSourceGroupId)) {
    return {
      normalizedSourceGroupId: null,
      basePriceField: PRICE_GROUP_SOURCE_PRICE_FIELD,
    };
  }

  return {
    normalizedSourceGroupId: rawSourceGroupId,
    basePriceField: PRICE_GROUP_BASE_PRICE_FIELD,
  };
};

const validateDependentSourceSelection = ({
  groupType,
  normalizedSourceGroupId,
  priceGroup,
  priceGroups,
}: {
  groupType: string;
  normalizedSourceGroupId: string | null;
  priceGroup?: PriceGroup | null | undefined;
  priceGroups: PriceGroup[];
}): PriceGroupFormValidationError | null => {
  if (groupType !== 'dependent') return null;
  if (normalizedSourceGroupId === '') {
    return { ok: false, message: 'Dependent price groups require a source price.' };
  }
  if (
    normalizedSourceGroupId !== null &&
    wouldCreateSourceGroupCycle({
      currentPriceGroup: priceGroup,
      sourceGroupId: normalizedSourceGroupId,
      priceGroups,
    })
  ) {
    return {
      ok: false,
      message: 'Dependent price groups cannot reference themselves through a source-group cycle.',
    };
  }
  return null;
};

const validatePriceGroupForm = ({
  form,
  priceGroup,
  priceGroups,
}: {
  form: PriceGroupFormState;
  priceGroup?: PriceGroup | null | undefined;
  priceGroups: PriceGroup[];
}): PriceGroupFormValidationResult => {
  const name = form.name.trim();
  const currencyCode = form.currencyCode.trim();
  if (name.length === 0 || currencyCode.length === 0) {
    return { ok: false, message: 'Name and currency are required.' };
  }

  const groupType = normalizeGroupType(form.type);
  const { normalizedSourceGroupId, basePriceField } =
    groupType === 'dependent'
      ? resolveDependentSourceValidation(form, priceGroups)
      : { normalizedSourceGroupId: null, basePriceField: PRICE_GROUP_BASE_PRICE_FIELD };
  const dependentSourceError = validateDependentSourceSelection({
    groupType,
    normalizedSourceGroupId,
    priceGroup,
    priceGroups,
  });
  if (dependentSourceError !== null) return dependentSourceError;

  return { ok: true, name, currencyCode, groupType, normalizedSourceGroupId, basePriceField };
};

const usePriceGroupFormSubmit = ({
  form,
  priceGroup,
  priceGroups,
  saveMutation,
  toast,
}: {
  form: PriceGroupFormState;
  priceGroup?: PriceGroup | null | undefined;
  priceGroups: PriceGroup[];
  saveMutation: PriceGroupSaveMutation;
  toast: ToastFn;
}): (() => Promise<boolean>) =>
  React.useCallback(async (): Promise<boolean> => {
    const validation = validatePriceGroupForm({ form, priceGroup, priceGroups });
    if (!validation.ok) {
      toast(validation.message, { variant: 'error' });
      return false;
    }

    const priceMultiplier = coerceFiniteNumber(form.priceMultiplier, 1);
    const addToPrice = coerceFiniteNumber(form.addToPrice, 0);

    try {
      await saveMutation.mutateAsync({
        ...(hasText(priceGroup?.id) ? { id: priceGroup.id } : {}),
        data: {
          name: validation.name,
          currencyCode: validation.currencyCode,
          isDefault: form.isDefault,
          type: validation.groupType,
          basePriceField: validation.basePriceField,
          sourceGroupId:
            validation.groupType === 'dependent' ? validation.normalizedSourceGroupId : null,
          priceMultiplier,
          addToPrice,
        },
      });

      toast('Price group saved.', { variant: 'success' });
      return true;
    } catch (err) {
      logClientCatch(err, {
        source: 'PriceGroupModal',
        action: 'savePriceGroup',
        priceGroupId: priceGroup?.id,
      });
      toast('Failed to save price group.', { variant: 'error' });
      return false;
    }
  }, [form, priceGroup, priceGroups, saveMutation, toast]);

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

  const handleSubmit = usePriceGroupFormSubmit({
    form,
    priceGroup,
    priceGroups,
    saveMutation,
    toast,
  });

  return {
    form,
    setForm,
    saveMutation,
    handleSubmit,
  };
}
