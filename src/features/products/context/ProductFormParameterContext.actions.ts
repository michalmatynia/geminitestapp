import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';

import type { ProductParameterValue } from '@/shared/contracts/products/product';
import { decodeSimpleParameterStorageId } from '@/shared/lib/products/utils/parameter-partition';
import { normalizeParameterValuesByLanguage } from '@/shared/lib/products/utils/parameter-values';

import type { ProductFormParameterActionsContextType } from './ProductFormParameterContext';
import { resolveEditableLocalizedParameterEntry } from './ProductFormParameterContext.utils';

type LocalizedParameterUpdate = {
  parameterId: string;
  languageCode: string;
  value: string;
};

type ParameterValueActionsArgs = {
  parameterValueIndexMap: number[];
  setBaseParameterValues: Dispatch<SetStateAction<ProductParameterValue[]>>;
  onInteraction?: () => void;
};

const normalizeLocalizedUpdates = (
  updates: LocalizedParameterUpdate[]
): LocalizedParameterUpdate[] =>
  updates
    .map((entry) => ({
      parameterId: decodeSimpleParameterStorageId(entry.parameterId),
      languageCode: entry.languageCode.trim().toLowerCase(),
      value: entry.value.trim(),
    }))
    .filter(
      (entry): entry is LocalizedParameterUpdate =>
        entry.parameterId.length > 0 && entry.languageCode.length > 0 && entry.value.length > 0
    );

const buildLocalizedUpdateMap = (
  updates: LocalizedParameterUpdate[]
): Map<string, LocalizedParameterUpdate> =>
  new Map(updates.map((entry) => [entry.parameterId, entry]));

const applyLocalizedUpdate = (
  current: ProductParameterValue,
  match: LocalizedParameterUpdate
): ProductParameterValue | null => {
  const normalizedParameterId = decodeSimpleParameterStorageId(current.parameterId);
  const currentValues = normalizeParameterValuesByLanguage(current.valuesByLanguage);
  const previousLocalizedValue = currentValues[match.languageCode] ?? '';
  if (previousLocalizedValue === match.value) return null;

  const currentScalarValue = typeof current.value === 'string' ? current.value.trim() : '';
  const nextScalarValue =
    currentScalarValue.length > 0 && currentScalarValue !== previousLocalizedValue
      ? currentScalarValue
      : match.value;
  return {
    ...current,
    parameterId: normalizedParameterId,
    value: nextScalarValue,
    valuesByLanguage: {
      ...currentValues,
      [match.languageCode]: match.value,
    },
  };
};

const applyLocalizedUpdatesToValues = (
  values: ProductParameterValue[],
  updates: Map<string, LocalizedParameterUpdate>
): ProductParameterValue[] => {
  const next = values.map((current) => {
    const normalizedParameterId = decodeSimpleParameterStorageId(current.parameterId);
    const match = updates.get(normalizedParameterId);
    if (match === undefined) return current;

    const nextValue = applyLocalizedUpdate(current, match);
    if (nextValue === null) return current;
    return nextValue;
  });
  return next.some((value, index) => value !== values[index]) ? next : values;
};

const resolveBaseIndex = (index: number, parameterValueIndexMap: number[]): number =>
  parameterValueIndexMap[index] ?? index;

const updateIndexedParameterValue = (
  values: ProductParameterValue[],
  index: number,
  parameterValueIndexMap: number[],
  updater: (current: ProductParameterValue) => ProductParameterValue | null
): ProductParameterValue[] => {
  const baseIndex = resolveBaseIndex(index, parameterValueIndexMap);
  if (baseIndex < 0) return values;

  const current = values[baseIndex];
  if (current === undefined) return values;
  const nextEntry = updater(current);
  if (nextEntry === null) return values;

  const next = [...values];
  next[baseIndex] = nextEntry;
  return next;
};

const useAddParameterValueAction = ({
  setBaseParameterValues,
  onInteraction,
}: Pick<ParameterValueActionsArgs, 'setBaseParameterValues' | 'onInteraction'>): (() => void) =>
  useCallback((): void => {
    onInteraction?.();
    setBaseParameterValues((prev) => [...prev, { parameterId: '', value: '' }]);
  }, [onInteraction, setBaseParameterValues]);

const useApplyLocalizedParameterValuesAction = ({
  setBaseParameterValues,
  onInteraction,
}: Pick<
  ParameterValueActionsArgs,
  'setBaseParameterValues' | 'onInteraction'
>): ProductFormParameterActionsContextType['applyLocalizedParameterValues'] =>
  useCallback(
    (updates: LocalizedParameterUpdate[]): void => {
      const normalizedUpdates = normalizeLocalizedUpdates(updates);
      if (normalizedUpdates.length === 0) return;
      onInteraction?.();
      const updateMap = buildLocalizedUpdateMap(normalizedUpdates);
      setBaseParameterValues((prev) => applyLocalizedUpdatesToValues(prev, updateMap));
    },
    [onInteraction, setBaseParameterValues]
  );

const useUpdateParameterIdAction = ({
  parameterValueIndexMap,
  setBaseParameterValues,
  onInteraction,
}: ParameterValueActionsArgs): ProductFormParameterActionsContextType['updateParameterId'] =>
  useCallback(
    (index: number, parameterId: string): void => {
      onInteraction?.();
      setBaseParameterValues((prev) =>
        updateIndexedParameterValue(prev, index, parameterValueIndexMap, (current) => ({
          ...current,
          parameterId,
        }))
      );
    },
    [onInteraction, parameterValueIndexMap, setBaseParameterValues]
  );

const useUpdateParameterValueAction = ({
  parameterValueIndexMap,
  setBaseParameterValues,
  onInteraction,
}: ParameterValueActionsArgs): ProductFormParameterActionsContextType['updateParameterValue'] =>
  useCallback(
    (index: number, value: string): void => {
      onInteraction?.();
      setBaseParameterValues((prev) =>
        updateIndexedParameterValue(prev, index, parameterValueIndexMap, (current) => ({
          ...current,
          value,
        }))
      );
    },
    [onInteraction, parameterValueIndexMap, setBaseParameterValues]
  );

const useUpdateParameterValueByLanguageAction = ({
  parameterValueIndexMap,
  setBaseParameterValues,
  onInteraction,
}: ParameterValueActionsArgs): ProductFormParameterActionsContextType['updateParameterValueByLanguage'] =>
  useCallback(
    (index: number, languageCode: string, nextValue: string): void => {
      onInteraction?.();
      setBaseParameterValues((prev) =>
        updateIndexedParameterValue(prev, index, parameterValueIndexMap, (current) =>
          resolveEditableLocalizedParameterEntry({ current, languageCode, nextValue })
        )
      );
    },
    [onInteraction, parameterValueIndexMap, setBaseParameterValues]
  );

const useUpdateParameterInferenceSkipAction = ({
  parameterValueIndexMap,
  setBaseParameterValues,
  onInteraction,
}: ParameterValueActionsArgs): ProductFormParameterActionsContextType['updateParameterInferenceSkip'] =>
  useCallback(
    (index: number, skip: boolean): void => {
      onInteraction?.();
      setBaseParameterValues((prev) =>
        updateIndexedParameterValue(prev, index, parameterValueIndexMap, (current) => {
          if (current.skipParameterInference === skip) return null;
          if (skip) return { ...current, skipParameterInference: true };
          const nextEntry = { ...current };
          delete nextEntry.skipParameterInference;
          return nextEntry;
        })
      );
    },
    [onInteraction, parameterValueIndexMap, setBaseParameterValues]
  );

const useRemoveParameterValueAction = ({
  parameterValueIndexMap,
  setBaseParameterValues,
  onInteraction,
}: ParameterValueActionsArgs): ProductFormParameterActionsContextType['removeParameterValue'] =>
  useCallback(
    (index: number): void => {
      onInteraction?.();
      const baseIndex = resolveBaseIndex(index, parameterValueIndexMap);
      if (baseIndex < 0) return;
      setBaseParameterValues((prev) => prev.filter((_, valueIndex) => valueIndex !== baseIndex));
    },
    [onInteraction, parameterValueIndexMap, setBaseParameterValues]
  );

export function useProductParameterValueActions(
  args: ParameterValueActionsArgs
): ProductFormParameterActionsContextType {
  const addParameterValue = useAddParameterValueAction(args);
  const applyLocalizedParameterValues = useApplyLocalizedParameterValuesAction(args);
  const updateParameterId = useUpdateParameterIdAction(args);
  const updateParameterValue = useUpdateParameterValueAction(args);
  const updateParameterValueByLanguage = useUpdateParameterValueByLanguageAction(args);
  const updateParameterInferenceSkip = useUpdateParameterInferenceSkipAction(args);
  const removeParameterValue = useRemoveParameterValueAction(args);

  return useMemo(
    () => ({
      addParameterValue,
      applyLocalizedParameterValues,
      updateParameterId,
      updateParameterValue,
      updateParameterValueByLanguage,
      updateParameterInferenceSkip,
      removeParameterValue,
    }),
    [
      addParameterValue,
      applyLocalizedParameterValues,
      removeParameterValue,
      updateParameterId,
      updateParameterInferenceSkip,
      updateParameterValue,
      updateParameterValueByLanguage,
    ]
  );
}
