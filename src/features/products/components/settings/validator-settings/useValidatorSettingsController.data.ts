import {
  useCreateValidationPatternMutation,
  useDeleteValidationPatternMutation,
  useReorderValidationPatternsMutation,
  useUpdateValidationPatternMutation,
  useUpdateValidatorSettingsMutation,
  useValidationPatterns,
  useValidatorSettings,
} from '@/features/products/hooks/useProductSettingsQueries';
import type {
  ProductValidationPattern,
  ProductValidatorSettings,
} from '@/shared/contracts/products/validation';
import type { ListQuery, SingleQuery } from '@/shared/contracts/ui/queries';

import type { ValidatorSettingsMutations } from './useValidatorSettingsController.types';

export type ValidatorSettingsData = {
  patternsQuery: ListQuery<ProductValidationPattern>;
  settingsQuery: SingleQuery<ProductValidatorSettings>;
  patterns: ProductValidationPattern[];
  settings: ProductValidatorSettings | undefined;
};

export function useValidatorSettingsControllerData(): ValidatorSettingsData {
  const patternsQuery = useValidationPatterns();
  const settingsQuery = useValidatorSettings();

  return {
    patternsQuery,
    settingsQuery,
    patterns: patternsQuery.data ?? [],
    settings: settingsQuery.data,
  };
}

export function useValidatorSettingsControllerMutations(): ValidatorSettingsMutations {
  return {
    createPattern: useCreateValidationPatternMutation(),
    updatePattern: useUpdateValidationPatternMutation(),
    deletePattern: useDeleteValidationPatternMutation(),
    reorderPatterns: useReorderValidationPatternsMutation(),
    updateSettings: useUpdateValidatorSettingsMutation(),
  };
}
