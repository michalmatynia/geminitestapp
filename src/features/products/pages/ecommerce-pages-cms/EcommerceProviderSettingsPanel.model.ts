'use client';

import { type Dispatch, type SetStateAction, useCallback, useEffect, useState } from 'react';

import {
  DEFAULT_ECOMMERCE_PROVIDER_SETTINGS,
  type EcommerceProviderSettingsInput,
} from '@/shared/contracts/integrations/ecommerce-provider-settings';
import { api } from '@/shared/lib/api-client';
import { useToast } from '@/shared/ui/primitives.public';

import {
  PROVIDER_SETTINGS_ENDPOINT,
  type DpdSettings,
  type InpostSettings,
  type PayuSettings,
  type PocztaPolskaSettings,
  type ProviderSettingsMeta,
  type ProviderSettingsResponse,
  type ProviderSettingsTarget,
  type ProviderSettingsWriteResponse,
} from './EcommerceProviderSettingsPanel.types';

type SettingsSetter = Dispatch<SetStateAction<EcommerceProviderSettingsInput>>;
type Toast = ReturnType<typeof useToast>['toast'];
type ProviderSettingsPanelModel = {
  error: string | null;
  handleSave: () => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
  loadSettings: () => Promise<void>;
  meta: ProviderSettingsMeta;
  pushToEcommerce: boolean;
  setPushToEcommerce: (value: boolean) => void;
  settings: EcommerceProviderSettingsInput;
  targets: ProviderSettingsTarget[];
  updateDpd: <K extends keyof DpdSettings>(field: K, value: DpdSettings[K]) => void;
  updateInpost: <K extends keyof InpostSettings>(field: K, value: InpostSettings[K]) => void;
  updatePayu: <K extends keyof PayuSettings>(field: K, value: PayuSettings[K]) => void;
  updatePocztaPolska: <K extends keyof PocztaPolskaSettings>(
    field: K,
    value: PocztaPolskaSettings[K]
  ) => void;
};

export const cloneProviderSettings = (
  settings: EcommerceProviderSettingsInput = DEFAULT_ECOMMERCE_PROVIDER_SETTINGS
): EcommerceProviderSettingsInput => ({
  payment: {
    payu: { ...settings.payment.payu },
  },
  shipping: {
    dpd: { ...settings.shipping.dpd },
    inpost: { ...settings.shipping.inpost },
    pocztaPolska: { ...settings.shipping.pocztaPolska },
  },
});

export const toProviderSettingsErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

function useLoadProviderSettings(args: {
  setError: Dispatch<SetStateAction<string | null>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setMeta: Dispatch<SetStateAction<ProviderSettingsMeta>>;
  setSettings: SettingsSetter;
  toast: Toast;
}): () => Promise<void> {
  const { setError, setIsLoading, setMeta, setSettings, toast } = args;
  return useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<ProviderSettingsResponse>(PROVIDER_SETTINGS_ENDPOINT, {
        logError: false,
        timeout: 120_000,
      });
      setSettings(cloneProviderSettings(response.settings));
      setMeta({
        lastPushedAt: response.lastPushedAt,
        updatedAt: response.updatedAt,
        updatedBy: response.updatedBy,
      });
    } catch (loadError: unknown) {
      const message = toProviderSettingsErrorMessage(loadError);
      setError(message);
      toast(message, { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [setError, setIsLoading, setMeta, setSettings, toast]);
}

function useSaveProviderSettings(args: {
  pushToEcommerce: boolean;
  setError: Dispatch<SetStateAction<string | null>>;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
  setMeta: Dispatch<SetStateAction<ProviderSettingsMeta>>;
  setSettings: SettingsSetter;
  setTargets: Dispatch<SetStateAction<ProviderSettingsTarget[]>>;
  settings: EcommerceProviderSettingsInput;
  toast: Toast;
}): () => Promise<void> {
  const {
    pushToEcommerce,
    setError,
    setIsSaving,
    setMeta,
    setSettings,
    setTargets,
    settings,
    toast,
  } = args;
  return useCallback(async (): Promise<void> => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await api.put<ProviderSettingsWriteResponse>(
        PROVIDER_SETTINGS_ENDPOINT,
        { pushToEcommerce, settings },
        { logError: false, timeout: 120_000 }
      );
      setSettings(cloneProviderSettings(response.settings));
      setMeta({
        lastPushedAt: response.lastPushedAt,
        updatedAt: response.updatedAt,
        updatedBy: response.updatedBy,
      });
      setTargets(response.targets);
      toast(
        response.pushed
          ? 'Provider settings saved and pushed to ecommerce databases.'
          : 'Provider settings saved.',
        { variant: 'success' }
      );
    } catch (saveError: unknown) {
      const message = toProviderSettingsErrorMessage(saveError);
      setError(message);
      toast(message, { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [
    pushToEcommerce,
    setError,
    setIsSaving,
    setMeta,
    setSettings,
    setTargets,
    settings,
    toast,
  ]);
}

function useProviderSettingsUpdaters(setSettings: SettingsSetter): {
  updateDpd: <K extends keyof DpdSettings>(field: K, value: DpdSettings[K]) => void;
  updateInpost: <K extends keyof InpostSettings>(field: K, value: InpostSettings[K]) => void;
  updatePayu: <K extends keyof PayuSettings>(field: K, value: PayuSettings[K]) => void;
  updatePocztaPolska: <K extends keyof PocztaPolskaSettings>(
    field: K,
    value: PocztaPolskaSettings[K]
  ) => void;
} {
  const updatePayu = useCallback(<K extends keyof PayuSettings>(
    field: K,
    value: PayuSettings[K]
  ): void => {
    setSettings((current) => ({
      ...current,
      payment: { ...current.payment, payu: { ...current.payment.payu, [field]: value } },
    }));
  }, [setSettings]);

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

  return { updateDpd, updateInpost, updatePayu, updatePocztaPolska };
}

export function useProviderSettingsPanelModel(): ProviderSettingsPanelModel {
  const { toast } = useToast();
  const [settings, setSettings] = useState<EcommerceProviderSettingsInput>(() =>
    cloneProviderSettings()
  );
  const [meta, setMeta] = useState<ProviderSettingsMeta>({
    lastPushedAt: null,
    updatedAt: null,
    updatedBy: null,
  });
  const [targets, setTargets] = useState<ProviderSettingsTarget[]>([]);
  const [pushToEcommerce, setPushToEcommerce] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadSettings = useLoadProviderSettings({ setError, setIsLoading, setMeta, setSettings, toast });
  const handleSave = useSaveProviderSettings({
    pushToEcommerce,
    setError,
    setIsSaving,
    setMeta,
    setSettings,
    setTargets,
    settings,
    toast,
  });
  const updaters = useProviderSettingsUpdaters(setSettings);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  return {
    error,
    handleSave,
    isLoading,
    isSaving,
    loadSettings,
    meta,
    pushToEcommerce,
    setPushToEcommerce,
    settings,
    targets,
    ...updaters,
  };
}
