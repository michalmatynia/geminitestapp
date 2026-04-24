import { useState, useEffect, useMemo } from 'react';
import { useToast, useToastSettings } from '@/shared/ui/primitives.public';
import type { PositionType, AccentType } from '../types';
import { accentOptions } from '../constants';

export function useNotificationSettingsController() {
  const { settings, updateSettings } = useToastSettings();
  const { toast } = useToast();
  const [position, setPosition] = useState<PositionType>(settings.position);
  const [accent, setAccent] = useState<AccentType>(settings.accent);

  useEffect(() => {
    setPosition(settings.position);
    setAccent(settings.accent);
  }, [settings]);

  const handleSave = (): void => {
    updateSettings({ position, accent });
    toast('Notification settings saved successfully', { variant: 'success' });
  };

  const showPreview = (variant: 'success' | 'error' | 'info'): void => {
    toast(`This is a ${variant} notification`, { variant });
  };

  const accentSelectOptions = useMemo(() => accentOptions.map((option) => ({
    value: option.value,
    label: option.label,
    description: option.value === accent ? 'Currently selected' : undefined,
  })), [accent]);

  return {
    position,
    setPosition,
    accent,
    setAccent,
    handleSave,
    showPreview,
    accentSelectOptions,
  };
}
