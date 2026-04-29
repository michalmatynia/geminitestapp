import { useState } from 'react';

import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

type ProductSettingsState = Record<string, unknown>;

type ProductSettingsController = {
  settings: ProductSettingsState;
  handleUpdate: (newSettings: ProductSettingsState) => void;
  saveSettings: () => Promise<void>;
  isSaving: boolean;
};

const parseProductSettings = (value: string | undefined): ProductSettingsState => {
  if (value === undefined || value.trim() === '') return {};

  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as ProductSettingsState;
    }
  } catch (error) {
    logClientCatch(error, {
      source: 'ProductSettings',
      action: 'parseProductSettings',
      level: 'warn',
    });
  }

  return {};
};

export function useProductSettingsController(): ProductSettingsController {
  const { get } = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const [settings, setSettings] = useState<ProductSettingsState>(() =>
    parseProductSettings(get('product_settings'))
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdate = (newSettings: ProductSettingsState): void => {
    setSettings((prev: ProductSettingsState): ProductSettingsState => ({ ...prev, ...newSettings }));
  };

  const saveSettings = async (): Promise<void> => {
    setIsSaving(true);
    try {
      await updateSetting.mutateAsync({
        key: 'product_settings',
        value: JSON.stringify(settings),
      });
      toast('Product settings saved', { variant: 'success' });
    } catch (e) {
      logClientCatch(e, { source: 'ProductSettings', action: 'saveSettings' });
      toast('Failed to save settings', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return { settings, handleUpdate, saveSettings, isSaving };
}
