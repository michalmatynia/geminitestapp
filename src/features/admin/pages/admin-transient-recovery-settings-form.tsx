'use client';

import { useState } from 'react';

import type { TransientRecoverySettings } from '@/shared/contracts/observability';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui/primitives.public';
import { serializeSetting } from '@/shared/utils/settings-json';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { TransientRecoveryPageContent } from './admin-transient-recovery-sections';

type RecoveryKeys = { settings: string };
type TransientRecoverySettingsFormProps = {
  initialSettings: TransientRecoverySettings;
  isPending: boolean;
  recoveryKeys: RecoveryKeys;
};
type TransientRecoveryFormState = {
  dirty: boolean;
  disabled: boolean;
  onSave: () => void;
  onToggleEnabled: (checked: boolean) => void;
  saving: boolean;
  settings: TransientRecoverySettings;
  updateCircuit: (key: keyof TransientRecoverySettings['circuit'], value: number | boolean) => void;
  updateRetry: (key: keyof TransientRecoverySettings['retry'], value: number | boolean) => void;
};

const toPersistedTimeoutMs = (timeoutMs: number | null): number | null =>
  timeoutMs !== null && timeoutMs > 0 ? timeoutMs : null;

const getSaveErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Failed to save settings.';

const toTransientRecoveryPayload = (
  settings: TransientRecoverySettings
): TransientRecoverySettings => ({
  enabled: settings.enabled,
  retry: { ...settings.retry, timeoutMs: toPersistedTimeoutMs(settings.retry.timeoutMs) },
  circuit: settings.circuit,
});

function useTransientRecoveryFormState({
  initialSettings,
  isPending,
  recoveryKeys,
}: TransientRecoverySettingsFormProps): TransientRecoveryFormState {
  const { toast } = useToast();
  const [settings, setSettings] = useState<TransientRecoverySettings>(initialSettings);
  const [dirty, setDirty] = useState(false);
  const updateSetting = useUpdateSetting();
  const disabled = isPending || updateSetting.isPending;
  const updateSettings = (nextSettings: (prev: TransientRecoverySettings) => TransientRecoverySettings): void => {
    setSettings(nextSettings);
    setDirty(true);
  };
  const updateRetry = (key: keyof TransientRecoverySettings['retry'], value: number | boolean): void => {
    updateSettings((prev: TransientRecoverySettings) => ({ ...prev, retry: { ...prev.retry, [key]: value } }));
  };
  const updateCircuit = (key: keyof TransientRecoverySettings['circuit'], value: number | boolean): void => {
    updateSettings((prev: TransientRecoverySettings) => ({ ...prev, circuit: { ...prev.circuit, [key]: value } }));
  };
  const onToggleEnabled = (checked: boolean): void => {
    updateSettings((prev: TransientRecoverySettings) => ({ ...prev, enabled: checked }));
  };
  const onSave = (): void => {
    if (!dirty || updateSetting.isPending) {
      return;
    }

    updateSetting.mutate(
      {
        key: recoveryKeys.settings,
        value: serializeSetting(toTransientRecoveryPayload(settings)),
      },
      {
        onSuccess: () => {
          setDirty(false);
          toast('Transient recovery settings saved.', { variant: 'success' });
        },
        onError: (error) => {
          logClientError(error);
          toast(getSaveErrorMessage(error), { variant: 'error' });
        },
      }
    );
  };

  return {
    dirty,
    disabled,
    onSave,
    onToggleEnabled,
    saving: updateSetting.isPending,
    settings,
    updateCircuit,
    updateRetry,
  };
}

export function TransientRecoverySettingsForm(
  props: TransientRecoverySettingsFormProps
): React.JSX.Element {
  const formState = useTransientRecoveryFormState(props);
  return <TransientRecoveryPageContent {...formState} />;
}
