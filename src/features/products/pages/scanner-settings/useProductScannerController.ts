import { useState, useCallback, useEffect } from 'react';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

export function useProductScannerController() {
  const { get, isLoading } = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  
  const [config, setConfig] = useState(get('scanner_config') ?? {});
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateConfig = (newConfig: any) => {
    setConfig((prev: any) => ({ ...prev, ...newConfig }));
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      await updateSetting.mutateAsync({ key: 'scanner_config', value: JSON.stringify(config) });
      toast('Scanner settings saved', { variant: 'success' });
    } catch (e) {
      logClientCatch(e, { source: 'ScannerSettings', action: 'saveConfig' });
      toast('Failed to save settings', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return { config, handleUpdateConfig, saveConfig, isSaving, isLoading };
}
