import { useState } from 'react';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

type ScannerConfig = Record<string, unknown>;
type ScannerConfigPatch = Partial<ScannerConfig>;

type ProductScannerController = {
  config: ScannerConfig;
  handleUpdateConfig: (newConfig: ScannerConfigPatch) => void;
  saveConfig: () => Promise<void>;
  isSaving: boolean;
  isLoading: boolean;
};

const parseScannerConfig = (rawConfig: string | undefined): ScannerConfig => {
  if (rawConfig === undefined || rawConfig === '') return {};
  try {
    const parsed: unknown = JSON.parse(rawConfig);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as ScannerConfig;
    }
  } catch {
    return {};
  }
  return {};
};

export function useProductScannerController(): ProductScannerController {
  const { get, isLoading } = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const [config, setConfig] = useState<ScannerConfig>(() => parseScannerConfig(get('scanner_config')));
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateConfig = (newConfig: ScannerConfigPatch): void => {
    setConfig((prevConfig) => ({ ...prevConfig, ...newConfig }));
  };

  const saveConfig = async (): Promise<void> => {
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
