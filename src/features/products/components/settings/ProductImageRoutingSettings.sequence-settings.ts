'use client';

import { useEffect, useState } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { type ProductStudioSequenceGenerationMode } from '@/shared/contracts/products';
import type { SystemSetting } from '@/shared/contracts/settings';
import type { MutationResult } from '@/shared/contracts/ui/queries';
import { PRODUCT_STUDIO_SEQUENCE_GENERATION_MODE_SETTING_KEY } from '@/shared/lib/products/constants';
import type { Toast } from '@/shared/ui/toast';

type UpdateSettingMutation = MutationResult<SystemSetting, { key: string; value: string }>;

export const SEQUENCE_GENERATION_MODE_OPTIONS: Array<
  LabeledOptionDto<ProductStudioSequenceGenerationMode>
> = [
  {
    value: 'auto',
    label: 'Auto (Best Route)',
  },
  {
    value: 'studio_prompt_then_sequence',
    label: 'Prompt then Image Studio Sequencer',
  },
  {
    value: 'studio_native_sequencer_prior_generation',
    label: 'Native Sequencer (Prior Generation)',
  },
  {
    value: 'model_full_sequence',
    label: 'Model Full Sequence (if supported)',
  },
];

export type ProductStudioSequenceGenerationState = {
  isSequenceGenerationModeDirty: boolean;
  sequenceGenerationMode: ProductStudioSequenceGenerationMode;
  setSequenceGenerationMode: (mode: string) => void;
};

export type ProductStudioSequenceGenerationActions = {
  handleSaveSequenceGenerationMode: () => void;
};

type ProductStudioSequenceGenerationActionsArgs = ProductStudioSequenceGenerationState & {
  refetchSettings: () => void;
  toast: Toast;
  updateSequenceGenerationModeSetting: UpdateSettingMutation;
};

const isProductStudioSequenceGenerationMode = (
  value: string
): value is ProductStudioSequenceGenerationMode =>
  value === 'studio_prompt_then_sequence' ||
  value === 'model_full_sequence' ||
  value === 'studio_native_sequencer_prior_generation' ||
  value === 'auto';

export function useProductStudioSequenceGenerationState(
  persistedSequenceGenerationMode: ProductStudioSequenceGenerationMode
): ProductStudioSequenceGenerationState {
  const [sequenceGenerationMode, setSequenceGenerationModeState] =
    useState<ProductStudioSequenceGenerationMode>(persistedSequenceGenerationMode);
  const setSequenceGenerationMode = (mode: string): void => {
    if (isProductStudioSequenceGenerationMode(mode)) {
      setSequenceGenerationModeState(mode);
    }
  };

  useEffect(() => {
    setSequenceGenerationModeState(persistedSequenceGenerationMode);
  }, [persistedSequenceGenerationMode]);

  return {
    isSequenceGenerationModeDirty: sequenceGenerationMode !== persistedSequenceGenerationMode,
    sequenceGenerationMode,
    setSequenceGenerationMode,
  };
}

export function useProductStudioSequenceGenerationActions({
  refetchSettings,
  sequenceGenerationMode,
  toast,
  updateSequenceGenerationModeSetting,
}: ProductStudioSequenceGenerationActionsArgs): ProductStudioSequenceGenerationActions {
  const handleSaveSequenceGenerationMode = (): void => {
    updateSequenceGenerationModeSetting.mutate(
      {
        key: PRODUCT_STUDIO_SEQUENCE_GENERATION_MODE_SETTING_KEY,
        value: sequenceGenerationMode,
      },
      {
        onSuccess: () => {
          refetchSettings();
          toast('Image Studio sequence generation mode saved.', { variant: 'success' });
        },
        onError: () => {
          toast('Failed to save Image Studio sequence generation mode.', {
            variant: 'error',
          });
        },
      }
    );
  };

  return { handleSaveSequenceGenerationMode };
}
