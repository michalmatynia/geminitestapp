import { useEffect, useMemo, useState } from 'react';

import { usePlaywrightPersonas } from '@/features/playwright/public';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { useBrainModelOptions } from '@/shared/lib/ai-brain/hooks/useBrainModelOptions';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import {
  buildPersistedProductScannerSettings,
  buildProductScannerSettingsDraft,
  PRODUCT_SCANNER_SETTINGS_KEY,
  parseProductScannerSettings,
  serializeProductScannerSettings,
  type ProductScannerSettingsDraft,
} from '../../scanner-settings';
import { CUSTOM_PERSONA_VALUE } from './adminProductScannerSettings.copy';
import type {
  BrainModelOptionsView,
  ScannerDraftSetter,
  SelectOption,
} from './adminProductScannerSettings.types';

type AdminProductScannerSettingsState = {
  amazonBrain: BrainModelOptionsView;
  dirty: boolean;
  draft: ProductScannerSettingsDraft;
  handleSave: () => Promise<void>;
  isSaving: boolean;
  personaOptions: SelectOption[];
  personas: Parameters<typeof buildProductScannerSettingsDraft>[1];
  selectedPersona: { name: string } | null;
  setDraft: ScannerDraftSetter;
  supplier1688Brain: BrainModelOptionsView;
};

const usePersistedProductScannerDraft = (
  rawSettings: string | null,
  personas: Parameters<typeof buildProductScannerSettingsDraft>[1]
): ProductScannerSettingsDraft => {
  const persistedSettings = useMemo(
    () => parseProductScannerSettings(rawSettings),
    [rawSettings]
  );
  return useMemo(
    () => buildProductScannerSettingsDraft(persistedSettings, personas),
    [persistedSettings, personas]
  );
};

const buildPersonaOptions = (
  personas: ReturnType<typeof usePlaywrightPersonas>['data']
): SelectOption[] => [
  { value: CUSTOM_PERSONA_VALUE, label: 'Custom overrides only' },
  ...(personas ?? []).map((persona) => ({ value: persona.id, label: persona.name })),
];

const resolveDirtyState = (input: {
  serializedDraft: string;
  serializedPersisted: string;
  lastSavedSerialized: string | null;
}): boolean => input.serializedDraft !== (input.lastSavedSerialized ?? input.serializedPersisted);

const useScannerBrainOptions = (enabled: boolean): {
  amazonBrain: BrainModelOptionsView;
  supplier1688Brain: BrainModelOptionsView;
} => {
  const amazonBrain = useBrainModelOptions({
    capability: 'product.scan.amazon_candidate_match',
    enabled,
  });
  const supplier1688Brain = useBrainModelOptions({
    capability: 'product.scan.1688_supplier_match',
    enabled,
  });
  return { amazonBrain, supplier1688Brain };
};

export const useAdminProductScannerSettings = (): AdminProductScannerSettingsState => {
  const settingsQuery = useSettingsMap({ scope: 'light' });
  const updateSetting = useUpdateSetting();
  const personasQuery = usePlaywrightPersonas();
  const rawSettings = settingsQuery.data?.get(PRODUCT_SCANNER_SETTINGS_KEY) ?? null;
  const persistedDraft = usePersistedProductScannerDraft(rawSettings, personasQuery.data);
  const [draft, setDraft] = useState<ProductScannerSettingsDraft>(persistedDraft);
  const [lastSavedSerialized, setLastSavedSerialized] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setDraft(persistedDraft);
    setLastSavedSerialized(null);
  }, [persistedDraft]);

  const personaOptions = useMemo(() => buildPersonaOptions(personasQuery.data), [personasQuery.data]);
  const selectedPersona =
    personasQuery.data?.find((persona) => persona.id === draft.playwrightPersonaId) ?? null;
  const persistedForSave = useMemo(
    () => buildPersistedProductScannerSettings(draft, personasQuery.data),
    [draft, personasQuery.data]
  );
  const serializedDraft = useMemo(
    () => serializeProductScannerSettings(persistedForSave),
    [persistedForSave]
  );
  const serializedPersisted = useMemo(
    () =>
      serializeProductScannerSettings(
        buildPersistedProductScannerSettings(persistedDraft, personasQuery.data)
      ),
    [persistedDraft, personasQuery.data]
  );
  const dirty = resolveDirtyState({ serializedDraft, serializedPersisted, lastSavedSerialized });
  const { amazonBrain, supplier1688Brain } = useScannerBrainOptions(!settingsQuery.isPending);

  const handleSave = async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync({ key: PRODUCT_SCANNER_SETTINGS_KEY, value: serializedDraft });
      setLastSavedSerialized(serializedDraft);
      toast('Scanner settings saved.', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, { source: 'AdminProductScannerSettingsPage', action: 'handleSave' });
      const message = error instanceof Error ? error.message : 'Failed to save scanner settings.';
      toast(message, { variant: 'error' });
    }
  };

  return {
    draft,
    setDraft,
    dirty,
    handleSave,
    personaOptions,
    selectedPersona,
    personas: personasQuery.data,
    amazonBrain,
    supplier1688Brain,
    isSaving: updateSetting.isPending,
  };
};
