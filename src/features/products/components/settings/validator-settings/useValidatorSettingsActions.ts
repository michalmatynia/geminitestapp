import { useCallback } from 'react';

import type {
  ProductValidationDenyBehavior,
  ProductValidationInstanceDenyBehaviorMap,
  ProductValidationInstanceScope,
  ProductValidatorSettings,
} from '@/shared/contracts/products/validation';
import { normalizeProductValidationInstanceDenyBehaviorMap } from '@/shared/lib/products/utils/validator-instance-behavior';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type {
  ValidatorSettingsActions,
  ValidatorSettingsMutations,
  ValidatorToast,
} from './useValidatorSettingsController.types';

type ValidatorSettingsActionsArgs = {
  settings: ProductValidatorSettings | undefined;
  updateSettings: ValidatorSettingsMutations['updateSettings'];
  toast: ValidatorToast;
};

type ValidatorSettingsUpdate = Partial<{
  enabledByDefault: boolean;
  formatterEnabledByDefault: boolean;
  instanceDenyBehavior: ProductValidationInstanceDenyBehaviorMap;
}>;

export function useValidatorSettingsActions({
  settings,
  updateSettings,
  toast,
}: ValidatorSettingsActionsArgs): ValidatorSettingsActions {
  const handleUpdateSettings = useCallback(
    async (updates: ValidatorSettingsUpdate): Promise<void> => {
      try {
        await updateSettings.mutateAsync(updates);
        toast('Settings updated.', { variant: 'success' });
      } catch (error) {
        logClientCatch(error, {
          source: 'useValidatorSettingsController',
          action: 'updateSettings',
        });
        toast(error instanceof Error ? error.message : 'Failed to update settings.', {
          variant: 'error',
        });
      }
    },
    [toast, updateSettings]
  );

  const handleToggleDefault = useCallback(
    async (enabled: boolean): Promise<void> => {
      await handleUpdateSettings({ enabledByDefault: enabled });
    },
    [handleUpdateSettings]
  );

  const handleToggleFormatterDefault = useCallback(
    async (enabled: boolean): Promise<void> => {
      await handleUpdateSettings({ formatterEnabledByDefault: enabled });
    },
    [handleUpdateSettings]
  );

  const handleInstanceBehaviorChange = useCallback(
    async (
      scope: ProductValidationInstanceScope,
      behavior: ProductValidationDenyBehavior
    ): Promise<void> => {
      const nextMap = normalizeProductValidationInstanceDenyBehaviorMap({
        ...(settings?.instanceDenyBehavior ?? {}),
        [scope]: behavior,
      });
      await handleUpdateSettings({ instanceDenyBehavior: nextMap });
    },
    [handleUpdateSettings, settings?.instanceDenyBehavior]
  );

  return {
    handleUpdateSettings,
    handleToggleDefault,
    handleToggleFormatterDefault,
    handleInstanceBehaviorChange,
  };
}
