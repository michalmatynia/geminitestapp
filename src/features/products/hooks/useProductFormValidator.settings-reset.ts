'use client';

import { useEffect, type MutableRefObject } from 'react';

import type { ProductFormValidatorSettingsResult } from './validator/useProductFormValidatorSettings';
import { clearAutoAcceptedForEntity } from './validator/validator-auto-accept-registry';

type UseProductFormValidatorSettingsResetArgs = Pick<
  ProductFormValidatorSettingsResult,
  | 'configEnabledByDefault'
  | 'defaultFormatterEnabled'
  | 'defaultValidatorEnabled'
  | 'setFormatterEnabledState'
  | 'setValidatorEnabledState'
  | 'setValidatorInitialized'
  | 'setValidatorManuallyChanged'
  | 'validatorManuallyChangedRef'
> & {
  entityIdentity: string;
  lastEntityIdentityRef: MutableRefObject<string>;
};

export const useProductFormValidatorSettingsReset = ({
  configEnabledByDefault,
  defaultFormatterEnabled,
  defaultValidatorEnabled,
  entityIdentity,
  lastEntityIdentityRef,
  setFormatterEnabledState,
  setValidatorEnabledState,
  setValidatorInitialized,
  setValidatorManuallyChanged,
  validatorManuallyChangedRef,
}: UseProductFormValidatorSettingsResetArgs): void => {
  const mutableLastEntityIdentityRef = lastEntityIdentityRef;
  useEffect(() => {
    if (mutableLastEntityIdentityRef.current === entityIdentity) return;
    const prevIdentity = mutableLastEntityIdentityRef.current;
    mutableLastEntityIdentityRef.current = entityIdentity;
    if (prevIdentity.length > 0) clearAutoAcceptedForEntity(prevIdentity);
    if (!validatorManuallyChangedRef.current) {
      setValidatorEnabledState(defaultValidatorEnabled);
      setFormatterEnabledState(defaultFormatterEnabled);
    }
    setValidatorInitialized(typeof configEnabledByDefault === 'boolean');
    setValidatorManuallyChanged(false);
  }, [
    configEnabledByDefault,
    defaultFormatterEnabled,
    defaultValidatorEnabled,
    entityIdentity,
    mutableLastEntityIdentityRef,
    setFormatterEnabledState,
    setValidatorEnabledState,
    setValidatorInitialized,
    setValidatorManuallyChanged,
    validatorManuallyChangedRef,
  ]);
};
