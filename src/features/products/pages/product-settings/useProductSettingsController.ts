import { useState, useCallback } from 'react';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

export function useProductSettingsController() {
  const { get } = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState(get('product_settings') ?? {});
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdate = (newSettings: any) => {
    setSettings((prev: any) => ({ ...prev, ...newSettings }));
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await updateSetting.mutateAsync({ key: 'product_settings', value: JSON.stringify(settings) });
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
