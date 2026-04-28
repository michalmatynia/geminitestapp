'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import {
  useProductValidatorConfig,
  useUpdateValidatorSettingsMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { resolveBooleanStateAction } from './validator-utils';

type ValidatorStateSetter = Dispatch<SetStateAction<boolean>>;
type ValidatorSettingsMutation = ReturnType<typeof useUpdateValidatorSettingsMutation>;

export type ProductFormValidatorSettingsResult = {
  validatorEnabled: boolean;
  setValidatorEnabledState: ValidatorStateSetter;
  formatterEnabled: boolean;
  setFormatterEnabledState: ValidatorStateSetter;
  validatorInitialized: boolean;
  setValidatorInitialized: ValidatorStateSetter;
  validatorManuallyChanged: boolean;
  validatorManuallyChangedRef: MutableRefObject<boolean>;
  setValidatorManuallyChanged: (changed: boolean) => void;
  setValidatorEnabled: (enabled: SetStateAction<boolean>) => void;
  setFormatterEnabled: (enabled: SetStateAction<boolean>) => void;
  configEnabledByDefault: boolean | undefined;
  defaultValidatorEnabled: boolean;
  defaultFormatterEnabled: boolean;
  validatorConfigQuery: ReturnType<typeof useProductValidatorConfig>;
};

type ValidatorToggleActionArgs = {
  formatterEnabled: boolean;
  setFormatterEnabledState: ValidatorStateSetter;
  setValidatorEnabledState: ValidatorStateSetter;
  setValidatorInitialized: ValidatorStateSetter;
  setValidatorManuallyChanged: (changed: boolean) => void;
  validatorEnabled: boolean;
};

function useSyncValidatorDefaults(args: {
  configEnabledByDefault: boolean | undefined;
  defaultFormatterEnabled: boolean;
  defaultValidatorEnabled: boolean;
  setFormatterEnabledState: ValidatorStateSetter;
  setValidatorEnabledState: ValidatorStateSetter;
  setValidatorInitialized: ValidatorStateSetter;
  validatorManuallyChangedRef: MutableRefObject<boolean>;
}): void {
  const {
    configEnabledByDefault,
    defaultFormatterEnabled,
    defaultValidatorEnabled,
    setFormatterEnabledState,
    setValidatorEnabledState,
    setValidatorInitialized,
    validatorManuallyChangedRef,
  } = args;

  useEffect(() => {
    if (typeof configEnabledByDefault !== 'boolean') return;
    if (validatorManuallyChangedRef.current) return;
    setValidatorEnabledState(defaultValidatorEnabled);
    setFormatterEnabledState(defaultFormatterEnabled);
    setValidatorInitialized(true);
  }, [
    configEnabledByDefault,
    defaultFormatterEnabled,
    defaultValidatorEnabled,
    setFormatterEnabledState,
    setValidatorEnabledState,
    setValidatorInitialized,
    validatorManuallyChangedRef,
  ]);
}

function reportValidatorSettingsUpdateError(
  error: unknown,
  action: string,
  nextEnabled: boolean
): void {
  logClientError(error instanceof Error ? error : new Error(String(error)), {
    context: {
      source: 'ProductForm',
      action,
      nextEnabled,
    },
  });
}

function buildValidatorDefaultPayload(nextEnabled: boolean): {
  enabledByDefault: boolean;
  formatterEnabledByDefault?: boolean;
} {
  return nextEnabled
    ? { enabledByDefault: true }
    : { enabledByDefault: false, formatterEnabledByDefault: false };
}

function persistValidatorDefault(
  updateValidatorSettingsMutation: ValidatorSettingsMutation,
  nextEnabled: boolean
): void {
  void updateValidatorSettingsMutation
    .mutateAsync(buildValidatorDefaultPayload(nextEnabled))
    .catch((error: unknown) => {
      reportValidatorSettingsUpdateError(error, 'setValidatorEnabledDefault', nextEnabled);
    });
}

function persistFormatterDefault(
  updateValidatorSettingsMutation: ValidatorSettingsMutation,
  nextEnabled: boolean
): void {
  void updateValidatorSettingsMutation
    .mutateAsync({ formatterEnabledByDefault: nextEnabled })
    .catch((error: unknown) => {
      reportValidatorSettingsUpdateError(error, 'setFormatterEnabledDefault', nextEnabled);
    });
}

function useValidatorManualChangeState(): {
  validatorManuallyChanged: boolean;
  validatorManuallyChangedRef: MutableRefObject<boolean>;
  setValidatorManuallyChanged: (changed: boolean) => void;
} {
  const [validatorManuallyChanged, setValidatorManuallyChangedState] = useState(false);
  const validatorManuallyChangedRef = useRef(false);
  const setValidatorManuallyChanged = useCallback((changed: boolean): void => {
    validatorManuallyChangedRef.current = changed;
    setValidatorManuallyChangedState(changed);
  }, []);

  return { validatorManuallyChanged, validatorManuallyChangedRef, setValidatorManuallyChanged };
}

function useValidatorToggleActions(args: ValidatorToggleActionArgs): {
  setValidatorEnabled: (enabled: SetStateAction<boolean>) => void;
  setFormatterEnabled: (enabled: SetStateAction<boolean>) => void;
} {
  const updateValidatorSettingsMutation = useUpdateValidatorSettingsMutation();
  const {
    formatterEnabled,
    setFormatterEnabledState,
    setValidatorEnabledState,
    setValidatorInitialized,
    setValidatorManuallyChanged,
    validatorEnabled,
  } = args;

  const setValidatorEnabled = useCallback(
    (enabled: SetStateAction<boolean>): void => {
      const nextEnabled = Boolean(resolveBooleanStateAction(enabled, validatorEnabled));
      setValidatorManuallyChanged(true);
      setValidatorInitialized(true);
      setValidatorEnabledState(nextEnabled);
      if (!nextEnabled) {
        setFormatterEnabledState(false);
      }
      persistValidatorDefault(updateValidatorSettingsMutation, nextEnabled);
    },
    [
      setFormatterEnabledState,
      setValidatorEnabledState,
      setValidatorInitialized,
      setValidatorManuallyChanged,
      updateValidatorSettingsMutation,
      validatorEnabled,
    ]
  );

  const setFormatterEnabled = useCallback(
    (enabled: SetStateAction<boolean>): void => {
      const nextEnabled = validatorEnabled
        ? Boolean(resolveBooleanStateAction(enabled, formatterEnabled))
        : false;
      setValidatorManuallyChanged(true);
      setValidatorInitialized(true);
      setFormatterEnabledState(nextEnabled);
      persistFormatterDefault(updateValidatorSettingsMutation, nextEnabled);
    },
    [
      formatterEnabled,
      setFormatterEnabledState,
      setValidatorInitialized,
      setValidatorManuallyChanged,
      updateValidatorSettingsMutation,
      validatorEnabled,
    ]
  );

  return { setValidatorEnabled, setFormatterEnabled };
}

export function useProductFormValidatorSettings(): ProductFormValidatorSettingsResult {
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
  const manualState = useValidatorManualChangeState();
  useSyncValidatorDefaults({
    configEnabledByDefault,
    defaultFormatterEnabled,
    defaultValidatorEnabled,
    setFormatterEnabledState,
    setValidatorEnabledState,
    setValidatorInitialized,
    validatorManuallyChangedRef: manualState.validatorManuallyChangedRef,
  });
  const toggleActions = useValidatorToggleActions({
    formatterEnabled,
    setFormatterEnabledState,
    setValidatorEnabledState,
    setValidatorInitialized,
    setValidatorManuallyChanged: manualState.setValidatorManuallyChanged,
    validatorEnabled,
  });

  return {
    validatorEnabled,
    setValidatorEnabledState,
    formatterEnabled,
    setFormatterEnabledState,
    validatorInitialized,
    setValidatorInitialized,
    validatorManuallyChanged: manualState.validatorManuallyChanged,
    validatorManuallyChangedRef: manualState.validatorManuallyChangedRef,
    setValidatorManuallyChanged: manualState.setValidatorManuallyChanged,
    setValidatorEnabled: toggleActions.setValidatorEnabled,
    setFormatterEnabled: toggleActions.setFormatterEnabled,
    configEnabledByDefault,
    defaultValidatorEnabled,
    defaultFormatterEnabled,
    validatorConfigQuery,
  };
}
