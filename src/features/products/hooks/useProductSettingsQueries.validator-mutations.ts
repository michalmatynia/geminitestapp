import type {
  CreateProductValidationPatternInput as CreateValidationPatternPayload,
  ProductValidationPattern,
  ProductValidatorSettings,
  ReorderProductValidationPatternUpdate as ReorderValidationPatternUpdatePayload,
  UpdateProductValidationPatternInput as UpdateValidationPatternPayload,
} from '@/shared/contracts/products/validation';
import type { IdDataDto } from '@/shared/contracts/base';
import type { CreateMutation, DeleteMutation, UpdateMutation } from '@/shared/contracts/ui/queries';
import type {
  ProductValidatorImportRequest as ImportValidationPatternsPayload,
  ProductValidatorImportResult as ImportValidationPatternsResult,
} from '@/shared/contracts/validator-import';
import {
  createCreateMutationV2,
  createDeleteMutationV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { invalidateValidatorConfig } from '@/shared/lib/query-invalidation';
import { productSettingsKeys } from '@/shared/lib/query-key-exports';

import * as api from '../api/settings';

export function useUpdateValidatorSettingsMutation(): UpdateMutation<
  ProductValidatorSettings,
  Partial<ProductValidatorSettings>
> {
  const mutationKey = productSettingsKeys.validatorSettings();
  return createUpdateMutationV2({
    mutationFn: api.updateValidatorSettings,
    mutationKey,
    meta: {
      source: 'products.hooks.useUpdateValidatorSettingsMutation',
      operation: 'update',
      resource: 'products.settings.validator',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'validator', 'update'],
      description: 'Updates products settings validator.',
    },
    invalidate: async (queryClient) => {
      await invalidateValidatorConfig(queryClient);
    },
  });
}

export function useCreateValidationPatternMutation(): CreateMutation<
  ProductValidationPattern,
  CreateValidationPatternPayload
> {
  const mutationKey = productSettingsKeys.validatorPatterns();
  return createCreateMutationV2({
    mutationFn: api.createValidationPattern,
    mutationKey,
    meta: {
      source: 'products.hooks.useCreateValidationPatternMutation',
      operation: 'create',
      resource: 'products.settings.validator.patterns',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'validator', 'patterns', 'create'],
      description: 'Creates products settings validator patterns.',
    },
    invalidate: async (queryClient) => {
      await invalidateValidatorConfig(queryClient);
    },
  });
}

export function useUpdateValidationPatternMutation(): UpdateMutation<
  ProductValidationPattern,
  IdDataDto<UpdateValidationPatternPayload>
> {
  const mutationKey = productSettingsKeys.validatorPatterns();
  return createUpdateMutationV2({
    mutationFn: ({ id, data }: IdDataDto<UpdateValidationPatternPayload>) =>
      api.updateValidationPattern(id, data),
    mutationKey,
    meta: {
      source: 'products.hooks.useUpdateValidationPatternMutation',
      operation: 'update',
      resource: 'products.settings.validator.patterns',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'validator', 'patterns', 'update'],
      description: 'Updates products settings validator patterns.',
    },
    invalidate: async (queryClient) => {
      await invalidateValidatorConfig(queryClient);
    },
  });
}

export function useDeleteValidationPatternMutation(): DeleteMutation {
  const mutationKey = productSettingsKeys.validatorPatterns();
  return createDeleteMutationV2({
    mutationFn: (id: string) => api.deleteValidationPattern(id),
    mutationKey,
    meta: {
      source: 'products.hooks.useDeleteValidationPatternMutation',
      operation: 'delete',
      resource: 'products.settings.validator.patterns',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'validator', 'patterns', 'delete'],
      description: 'Deletes products settings validator patterns.',
    },
    invalidate: async (queryClient) => {
      await invalidateValidatorConfig(queryClient);
    },
  });
}

export function useReorderValidationPatternsMutation(): UpdateMutation<
  { updated: ProductValidationPattern[] },
  { updates: ReorderValidationPatternUpdatePayload[] }
> {
  const mutationKey = productSettingsKeys.validatorPatterns();
  return createUpdateMutationV2({
    mutationFn: (payload: { updates: ReorderValidationPatternUpdatePayload[] }) =>
      api.reorderValidationPatterns(payload),
    mutationKey,
    meta: {
      source: 'products.hooks.useReorderValidationPatternsMutation',
      operation: 'update',
      resource: 'products.settings.validator.patterns.reorder',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'validator', 'patterns', 'reorder'],
      description: 'Updates products settings validator patterns reorder.',
    },
    invalidate: async (queryClient) => {
      await invalidateValidatorConfig(queryClient);
    },
  });
}

export function useImportValidationPatternsMutation(): UpdateMutation<
  ImportValidationPatternsResult,
  ImportValidationPatternsPayload
> {
  const mutationKey = productSettingsKeys.validatorPatterns();
  return createUpdateMutationV2({
    mutationFn: (payload: ImportValidationPatternsPayload) => api.importValidationPatterns(payload),
    mutationKey,
    meta: {
      source: 'products.hooks.useImportValidationPatternsMutation',
      operation: 'update',
      resource: 'products.settings.validator.patterns.import',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'validator', 'patterns', 'import'],
      description: 'Updates products settings validator patterns import.',
    },
    invalidate: async (queryClient, _data, variables) => {
      if (variables.dryRun === true) return;
      await invalidateValidatorConfig(queryClient);
    },
  });
}
