import { useState } from 'react';
import { useKangurSettings } from '@/features/kangur/admin/hooks/useKangurSettings';

export function useKangurSettingsController() {
  const settings = useKangurSettings();
  const [localSettings, setLocalSettings] = useState(settings);

  const handleUpdate = (updates: Partial<typeof settings>) => {
    setLocalSettings(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    await settings.handleSave();
  };

  return {
    ...settings,
    ...localSettings,
    handleUpdate,
    handleSave,
  };
}
