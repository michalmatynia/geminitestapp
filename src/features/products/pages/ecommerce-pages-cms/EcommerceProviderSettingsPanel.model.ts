'use client';

import { type Dispatch, type SetStateAction, useCallback, useEffect, useState } from 'react';

import {
  DEFAULT_ECOMMERCE_PROVIDER_SETTINGS,
  type EcommerceProviderSettingsInput,
} from '@/shared/contracts/integrations/ecommerce-provider-settings';
import { api } from '@/shared/lib/api-client';
import type { SingleQuery } from '@/shared/contracts/ui/queries';
import { useMutationV2, useSingleQueryV2 } from '@/shared/lib/query-factories-v2';
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
type SaveProviderSettingsVariables = {
  pushToEcommerce: boolean;
  settings: EcommerceProviderSettingsInput;
};
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

const PROVIDER_SETTINGS_QUERY_KEY = [
  'products',
  'ecommerce-pages-cms',
  'provider-settings',
] as const;

const fetchProviderSettings = (): Promise<ProviderSettingsResponse> =>
  api.get<ProviderSettingsResponse>(PROVIDER_SETTINGS_ENDPOINT, {
    logError: false,
    timeout: 120_000,
  });

const saveProviderSettings = ({
  pushToEcommerce,
  settings,
}: SaveProviderSettingsVariables): Promise<ProviderSettingsWriteResponse> =>
  api.put<ProviderSettingsWriteResponse>(
    PROVIDER_SETTINGS_ENDPOINT,
    { pushToEcommerce, settings },
    { logError: false, timeout: 120_000 }
  );

const useProviderSettingsQuery = (): SingleQuery<ProviderSettingsResponse> =>
  useSingleQueryV2({
    id: 'ecommerce-pages-provider-settings',
    queryKey: PROVIDER_SETTINGS_QUERY_KEY,
    queryFn: fetchProviderSettings,
    meta: {
      source: 'products.ecommercePagesCms.providerSettings.load',
      operation: 'detail',
      resource: 'products.ecommerce-pages-cms.provider-settings',
      domain: 'products',
      description: 'Loads ecommerce provider settings for page CMS.',
    },
  });

function applyProviderSettingsResponse(
  response: Pick<
    ProviderSettingsResponse,
    'lastPushedAt' | 'settings' | 'updatedAt' | 'updatedBy'
  >,
  setters: {
    setMeta: Dispatch<SetStateAction<ProviderSettingsMeta>>;
    setSettings: SettingsSetter;
  }
): void {
  setters.setSettings(cloneProviderSettings(response.settings));
  setters.setMeta({
    lastPushedAt: response.lastPushedAt,
    updatedAt: response.updatedAt,
    updatedBy: response.updatedBy,
  });
}

function useLoadProviderSettings(args: {
  setError: Dispatch<SetStateAction<string | null>>;
  setMeta: Dispatch<SetStateAction<ProviderSettingsMeta>>;
  setSettings: SettingsSetter;
  toast: Toast;
}): { isLoading: boolean; loadSettings: () => Promise<void>; queryError: string | null } {
  const { setError, setMeta, setSettings, toast } = args;
  const query = useProviderSettingsQuery();

  useEffect(() => {
    if (query.data === undefined) return;
    applyProviderSettingsResponse(query.data, { setMeta, setSettings });
  }, [query.data, setMeta, setSettings]);

  useEffect(() => {
    if (!query.error) return;
    const message = toProviderSettingsErrorMessage(query.error);
    setError(message);
    toast(message, { variant: 'error' });
  }, [query.error, setError, toast]);

  const queryError = query.error ? toProviderSettingsErrorMessage(query.error) : null;
  const loadSettings = useCallback(async (): Promise<void> => {
    setError(null);
    await query.refetch();
  }, [query, setError]);

  return { isLoading: query.isLoading, loadSettings, queryError };
}

function useSaveProviderSettings(args: {
  pushToEcommerce: boolean;
  setError: Dispatch<SetStateAction<string | null>>;
  setMeta: Dispatch<SetStateAction<ProviderSettingsMeta>>;
  setSettings: SettingsSetter;
  setTargets: Dispatch<SetStateAction<ProviderSettingsTarget[]>>;
  settings: EcommerceProviderSettingsInput;
  toast: Toast;
}): { handleSave: () => Promise<void>; isSaving: boolean } {
  const {
    pushToEcommerce,
    setError,
    setMeta,
    setSettings,
    setTargets,
    settings,
    toast,
  } = args;
  const saveMutation = useMutationV2<
    ProviderSettingsWriteResponse,
    SaveProviderSettingsVariables
  >({
    mutationKey: ['products', 'ecommerce-pages-cms', 'provider-settings', 'save'],
    mutationFn: saveProviderSettings,
    onSuccess: (response: ProviderSettingsWriteResponse): void => {
      applyProviderSettingsResponse(response, { setMeta, setSettings });
      setTargets(response.targets);
      toast(
        response.pushed
          ? 'Provider settings saved and pushed to ecommerce databases.'
          : 'Provider settings saved.',
        { variant: 'success' }
      );
    },
    onError: (saveError: Error): void => {
      const message = toProviderSettingsErrorMessage(saveError);
      setError(message);
      toast(message, { variant: 'error' });
    },
    invalidateKeys: [PROVIDER_SETTINGS_QUERY_KEY],
    meta: {
      source: 'products.ecommercePagesCms.providerSettings.save',
      operation: 'update',
      resource: 'products.ecommerce-pages-cms.provider-settings',
      domain: 'products',
      description: 'Saves ecommerce provider settings for page CMS.',
      errorPresentation: 'toast',
    },
  });

  const handleSave = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      await saveMutation.mutateAsync({ pushToEcommerce, settings });
    } catch {
      // Error presentation is handled by the mutation callback.
    }
  }, [pushToEcommerce, saveMutation, setError, settings]);

  return { handleSave, isSaving: saveMutation.isPending };
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
  const [error, setError] = useState<string | null>(null);
  const loadState = useLoadProviderSettings({ setError, setMeta, setSettings, toast });
  const saveAction = useSaveProviderSettings({
    pushToEcommerce,
    setError,
    setMeta,
    setSettings,
    setTargets,
    settings,
    toast,
  });
  const updaters = useProviderSettingsUpdaters(setSettings);

  return {
    error: error ?? loadState.queryError,
    handleSave: saveAction.handleSave,
    isLoading: loadState.isLoading,
    isSaving: saveAction.isSaving,
    loadSettings: loadState.loadSettings,
    meta,
    pushToEcommerce,
    setPushToEcommerce,
    settings,
    targets,
    ...updaters,
  };
}
