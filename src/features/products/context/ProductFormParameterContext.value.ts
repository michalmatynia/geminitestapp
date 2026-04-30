import { useMemo, type Dispatch, type SetStateAction } from 'react';

import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue } from '@/shared/contracts/products/product';

import type { ProductFormParameterContextType } from './ProductFormParameterContext';
import { useProductParameterValueActions } from './ProductFormParameterContext.actions';

type ProductFormParameterContextValueArgs = {
  parameterDefinitions: ProductParameter[];
  parametersLoading: boolean;
  parameterValues: ProductParameterValue[];
  parameterValueIndexMap: number[];
  setBaseParameterValues: Dispatch<SetStateAction<ProductParameterValue[]>>;
  onInteraction?: () => void;
};

export function useProductFormParameterContextValue({
  parameterDefinitions,
  parametersLoading,
  parameterValues,
  parameterValueIndexMap,
  setBaseParameterValues,
  onInteraction,
}: ProductFormParameterContextValueArgs): ProductFormParameterContextType {
  const actions = useProductParameterValueActions({
    parameterValueIndexMap,
    setBaseParameterValues,
    onInteraction,
  });

  return useMemo(
    () => ({
      parameters: parameterDefinitions,
      parametersLoading,
      parameterValues,
      ...actions,
    }),
    [actions, parameterDefinitions, parameterValues, parametersLoading]
  );
}
