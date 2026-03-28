'use client';

import { useCallback, useState, type SetStateAction } from 'react';
import {
  useProductValidatorConfig,
  useUpdateValidatorSettingsMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { resolveBooleanStateAction } from './validator-utils';

export function useProductFormValidatorSettings() {
  const validatorConfigQuery = useProductValidatorConfig();
  const configEnabledByDefault = validatorConfigQuery.data?.enabledByDefault;
  const configFormatterEnabledByDefault = validatorConfigQuery.data?.formatterEnabledByDefault;
  
  const defaultValidatorEnabled =
    typeof configEnabledByDefault === 'boolean' ? configEnabledByDefault : true;
  const defaultFormatterEnabled =
    defaultValidatorEnabled && typeof configFormatterEnabledByDefault === 'boolean'
      ? configFormatterEnabledByDefault
      : false;

  const [validatorEnabled, setValidatorEnabledState] = useState<boolean>(
    () => defaultValidatorEnabled
  );
  const [formatterEnabled, setFormatterEnabledState] = useState<boolean>(
    () => defaultFormatterEnabled
  );
  const [validatorInitialized, setValidatorInitialized] = useState<boolean>(
    () => typeof configEnabledByDefault === 'boolean'
  );
  const [validatorManuallyChanged, setValidatorManuallyChanged] = useState(false);
  const updateValidatorSettingsMutation = useUpdateValidatorSettingsMutation();

  const setValidatorEnabled = useCallback(
    (enabled: SetStateAction<boolean>): void => {
      const nextEnabled = Boolean(resolveBooleanStateAction(enabled, validatorEnabled));
      setValidatorManuallyChanged(true);
      setValidatorInitialized(true);
      setValidatorEnabledState(nextEnabled);
      if (!nextEnabled) {
        setFormatterEnabledState(false);
      }
      void updateValidatorSettingsMutation
        .mutateAsync(
          nextEnabled
            ? { enabledByDefault: true }
            : { enabledByDefault: false, formatterEnabledByDefault: false }
        )
        .catch((error: unknown) => {
          logClientError(error instanceof Error ? error : new Error(String(error)), {
            context: {
              source: 'ProductForm',
              action: 'setValidatorEnabledDefault',
              nextEnabled,
            },
          });
        });
    },
    [updateValidatorSettingsMutation, validatorEnabled]
  );

  const setFormatterEnabled = useCallback(
    (enabled: SetStateAction<boolean>): void => {
      const nextEnabled = validatorEnabled
        ? Boolean(resolveBooleanStateAction(enabled, formatterEnabled))
        : false;
      setValidatorManuallyChanged(true);
      setValidatorInitialized(true);
      setFormatterEnabledState(nextEnabled);
      void updateValidatorSettingsMutation
        .mutateAsync({ formatterEnabledByDefault: nextEnabled })
        .catch((error: unknown) => {
          logClientError(error instanceof Error ? error : new Error(String(error)), {
            context: {
              source: 'ProductForm',
              action: 'setFormatterEnabledDefault',
              nextEnabled,
            },
          });
        });
    },
    [formatterEnabled, updateValidatorSettingsMutation, validatorEnabled]
  );

  return {
    validatorEnabled,
    setValidatorEnabledState,
    formatterEnabled,
    setFormatterEnabledState,
    validatorInitialized,
    setValidatorInitialized,
    validatorManuallyChanged,
    setValidatorManuallyChanged,
    setValidatorEnabled,
    setFormatterEnabled,
    configEnabledByDefault,
    defaultValidatorEnabled,
    defaultFormatterEnabled,
    validatorConfigQuery,
  };
}
