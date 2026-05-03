'use client';

import { useQueryClient } from '@tanstack/react-query';

import { useProducers } from '@/features/products/hooks/useProductMetadata';
import type { ValidatorSettingsController } from '@/shared/contracts/products/drafts';
import { useToast } from '@/shared/ui/toast';

import { useValidatorSettingsControllerActions } from './useValidatorSettingsController.actions';
import {
  useValidatorSettingsControllerData,
  useValidatorSettingsControllerMutations,
} from './useValidatorSettingsController.data';
import { useValidatorSettingsControllerDerivedState } from './useValidatorSettingsController.derived';
import { useValidatorSettingsControllerState } from './useValidatorSettingsController.state';
import { buildValidatorSettingsControllerValue } from './useValidatorSettingsController.value';

/**
 * Coordinates validator settings queries, pattern-editing state, and modal actions for the validator settings UI.
 */
export function useValidatorSettingsController(): ValidatorSettingsController {
  const queryClient = useQueryClient();
  const data = useValidatorSettingsControllerData();
  const producersQuery = useProducers();
  const mutations = useValidatorSettingsControllerMutations();
  const state = useValidatorSettingsControllerState();
  const { toast } = useToast();
  const derived = useValidatorSettingsControllerDerivedState({
    patterns: data.patterns,
    state,
    producers: producersQuery.data ?? [],
  });
  const actions = useValidatorSettingsControllerActions({
    data,
    derived,
    state,
    mutations,
    queryClient,
    toast,
  });

  return buildValidatorSettingsControllerValue({
    data,
    state,
    mutations,
    ...derived,
    ...actions,
  });
}
