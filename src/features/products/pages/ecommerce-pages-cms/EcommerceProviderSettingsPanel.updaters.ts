'use client';

import { type Dispatch, type SetStateAction, useCallback } from 'react';

import type { EcommerceProviderSettingsInput } from '@/shared/contracts/integrations/ecommerce-provider-settings';

import type {
  BankTransferSettings,
  DpdSettings,
  InpostSettings,
  PayPalSettings,
  PayuSettings,
  PocztaPolskaSettings,
  StripeSettings,
} from './EcommerceProviderSettingsPanel.types';

type SettingsSetter = Dispatch<SetStateAction<EcommerceProviderSettingsInput>>;

export type ProviderSettingsUpdaters = {
  updateBankTransfer: <K extends keyof BankTransferSettings>(
    field: K,
    value: BankTransferSettings[K]
  ) => void;
  updateDpd: <K extends keyof DpdSettings>(field: K, value: DpdSettings[K]) => void;
  updateInpost: <K extends keyof InpostSettings>(field: K, value: InpostSettings[K]) => void;
  updatePayPal: <K extends keyof PayPalSettings>(field: K, value: PayPalSettings[K]) => void;
  updatePayu: <K extends keyof PayuSettings>(field: K, value: PayuSettings[K]) => void;
  updatePocztaPolska: <K extends keyof PocztaPolskaSettings>(
    field: K,
    value: PocztaPolskaSettings[K]
  ) => void;
  updateStripe: <K extends keyof StripeSettings>(field: K, value: StripeSettings[K]) => void;
};

type PaymentProviderSettingsUpdaters = Pick<
  ProviderSettingsUpdaters,
  'updateBankTransfer' | 'updatePayPal' | 'updatePayu' | 'updateStripe'
>;

type ShippingProviderSettingsUpdaters = Pick<
  ProviderSettingsUpdaters,
  'updateDpd' | 'updateInpost' | 'updatePocztaPolska'
>;

function usePaymentProviderSettingsUpdaters(
  setSettings: SettingsSetter
): PaymentProviderSettingsUpdaters {
  const updatePayu = useCallback(<K extends keyof PayuSettings>(
    field: K,
    value: PayuSettings[K]
  ): void => {
    setSettings((current) => ({
      ...current,
      payment: { ...current.payment, payu: { ...current.payment.payu, [field]: value } },
    }));
  }, [setSettings]);

  const updateStripe = useCallback(<K extends keyof StripeSettings>(
    field: K,
    value: StripeSettings[K]
  ): void => {
    setSettings((current) => ({
      ...current,
      payment: { ...current.payment, stripe: { ...current.payment.stripe, [field]: value } },
    }));
  }, [setSettings]);

  const updatePayPal = useCallback(<K extends keyof PayPalSettings>(
    field: K,
    value: PayPalSettings[K]
  ): void => {
    setSettings((current) => ({
      ...current,
      payment: { ...current.payment, paypal: { ...current.payment.paypal, [field]: value } },
    }));
  }, [setSettings]);

  const updateBankTransfer = useCallback(<K extends keyof BankTransferSettings>(
    field: K,
    value: BankTransferSettings[K]
  ): void => {
    setSettings((current) => ({
      ...current,
      payment: {
        ...current.payment,
        bankTransfer: { ...current.payment.bankTransfer, [field]: value },
      },
    }));
  }, [setSettings]);

  return {
    updateBankTransfer,
    updatePayPal,
    updatePayu,
    updateStripe,
  };
}

function useShippingProviderSettingsUpdaters(
  setSettings: SettingsSetter
): ShippingProviderSettingsUpdaters {
  const updateInpost = useCallback(<K extends keyof InpostSettings>(
    field: K,
    value: InpostSettings[K]
  ): void => {
    setSettings((current) => ({
      ...current,
      shipping: { ...current.shipping, inpost: { ...current.shipping.inpost, [field]: value } },
    }));
  }, [setSettings]);

  const updateDpd = useCallback(<K extends keyof DpdSettings>(
    field: K,
    value: DpdSettings[K]
  ): void => {
    setSettings((current) => ({
      ...current,
      shipping: { ...current.shipping, dpd: { ...current.shipping.dpd, [field]: value } },
    }));
  }, [setSettings]);

  const updatePocztaPolska = useCallback(<K extends keyof PocztaPolskaSettings>(
    field: K,
    value: PocztaPolskaSettings[K]
  ): void => {
    setSettings((current) => ({
      ...current,
      shipping: {
        ...current.shipping,
        pocztaPolska: { ...current.shipping.pocztaPolska, [field]: value },
      },
    }));
  }, [setSettings]);

  return { updateDpd, updateInpost, updatePocztaPolska };
}

export function useProviderSettingsUpdaters(setSettings: SettingsSetter): ProviderSettingsUpdaters {
  const paymentUpdaters = usePaymentProviderSettingsUpdaters(setSettings);
  const shippingUpdaters = useShippingProviderSettingsUpdaters(setSettings);

  return {
    ...paymentUpdaters,
    ...shippingUpdaters,
  };
}
