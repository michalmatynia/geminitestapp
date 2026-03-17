'use client';

import { useEffect, useState, type ChangeEvent } from 'react';

import type { TransientRecoverySettings } from '@/shared/contracts/observability';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  AdminSettingsPageLayout,
  Button,
  FormField,
  FormSection,
  Input,
  ToggleRow,
  useToast,
} from '@/shared/ui';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  DEFAULT_TRANSIENT_RECOVERY_SETTINGS,
  TRANSIENT_RECOVERY_KEYS,
} from '@/shared/lib/observability/transient-recovery/constants';

type TransientRecoveryConstants = {
  DEFAULT_TRANSIENT_RECOVERY_SETTINGS: TransientRecoverySettings;
  TRANSIENT_RECOVERY_KEYS: { settings: string };
};

const loadTransientRecoveryConstants = async (): Promise<TransientRecoveryConstants> => {
  return {
    DEFAULT_TRANSIENT_RECOVERY_SETTINGS,
    TRANSIENT_RECOVERY_KEYS,
  };
};

const buildInitialTransientRecoverySettings = ({
  stored,
  defaults,
}: {
  stored: TransientRecoverySettings | null;
  defaults: TransientRecoverySettings;
}): TransientRecoverySettings => {
  if (!stored) return defaults;

  return {
    enabled: stored.enabled ?? defaults.enabled,
    retry: {
      enabled: stored.retry?.enabled ?? defaults.retry.enabled,
      maxAttempts: stored.retry?.maxAttempts ?? defaults.retry.maxAttempts,
      initialDelayMs: stored.retry?.initialDelayMs ?? defaults.retry.initialDelayMs,
      maxDelayMs: stored.retry?.maxDelayMs ?? defaults.retry.maxDelayMs,
      timeoutMs:
        stored.retry?.timeoutMs === null
          ? 0
          : (stored.retry?.timeoutMs ?? defaults.retry.timeoutMs),
    },
    circuit: {
      enabled: stored.circuit?.enabled ?? defaults.circuit.enabled,
      failureThreshold: stored.circuit?.failureThreshold ?? defaults.circuit.failureThreshold,
      resetTimeoutMs: stored.circuit?.resetTimeoutMs ?? defaults.circuit.resetTimeoutMs,
    },
  };
};

const toNumber = (value: string, fallback: number, min: number = 0): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return parsed;
};

function TransientRecoverySettingsForm({
  initialSettings,
  recoveryKeys,
}: {
  initialSettings: TransientRecoverySettings;
  recoveryKeys: { settings: string };
}): React.JSX.Element {
  const { toast } = useToast();
  const [settings, setSettings] = useState<TransientRecoverySettings>(initialSettings);
  const [dirty, setDirty] = useState(false);
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();

  const updateRetry = (
    key: keyof TransientRecoverySettings['retry'],
    value: number | boolean
  ): void => {
    setSettings((prev: TransientRecoverySettings) => ({
      ...prev,
      retry: {
        ...prev.retry,
        [key]: value,
      },
    }));
    setDirty(true);
  };

  const updateCircuit = (
    key: keyof TransientRecoverySettings['circuit'],
    value: number | boolean
  ): void => {
    setSettings((prev: TransientRecoverySettings) => ({
      ...prev,
      circuit: {
        ...prev.circuit,
        [key]: value,
      },
    }));
    setDirty(true);
  };

  const saveSettings = async (): Promise<void> => {
    try {
      const payload: TransientRecoverySettings = {
        enabled: settings.enabled,
        retry: {
          ...settings.retry,
          timeoutMs:
            settings.retry.timeoutMs && settings.retry.timeoutMs > 0
              ? settings.retry.timeoutMs
              : null,
        },
        circuit: {
          ...settings.circuit,
        },
      };
      await updateSetting.mutateAsync({
        key: recoveryKeys.settings,
        value: serializeSetting(payload),
      });
      setDirty(false);
      toast('Transient recovery settings saved.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to save settings.', {
        variant: 'error',
      });
    }
  };

  return (
    <AdminSettingsPageLayout
      title='Transient Recovery'
      current='Recovery'
      description='Configure retry and circuit-breaker policies for transient failures.'
    >
      <FormSection
        title='Global Controls'
        description='Manage high-level activation of recovery policies.'
        actions={
          <ToggleRow
            label={`Global ${settings.enabled ? 'Enabled' : 'Disabled'}`}
            checked={settings.enabled}
            onCheckedChange={(checked: boolean) => {
              setSettings((prev: TransientRecoverySettings) => ({
                ...prev,
                enabled: checked,
              }));
              setDirty(true);
            }}
            className='bg-transparent border-none p-0 hover:bg-transparent'
          />
        }
        className='p-6'
      >
        <div className='grid gap-6 md:grid-cols-2'>
          <FormSection
            title='Retry Policy'
            description='Applies to transient external calls and webhooks.'
            variant='subtle'
            className='p-4'
            actions={
              <ToggleRow
                label='Retry enabled'
                checked={settings.retry.enabled}
                onCheckedChange={(checked: boolean) => updateRetry('enabled', checked)}
                className='bg-transparent border-none p-0 hover:bg-transparent'
              />
            }
          >
            <div className='grid gap-4 mt-2'>
              <FormField label='Max attempts' description='Maximum number of execution tries.'>
                <Input
                  type='number'
                  min={1}
                  value={settings.retry.maxAttempts}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateRetry(
                      'maxAttempts',
                      toNumber(event.target.value, settings.retry.maxAttempts, 1)
                    )
                  }
                  disabled={settingsQuery.isPending}
                  aria-label='Max attempts'
                  title='Max attempts'
                />
              </FormField>
              <div className='grid grid-cols-2 gap-4'>
                <FormField label='Initial delay (ms)'>
                  <Input
                    type='number'
                    min={0}
                    value={settings.retry.initialDelayMs}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateRetry(
                        'initialDelayMs',
                        toNumber(event.target.value, settings.retry.initialDelayMs)
                      )
                    }
                    disabled={settingsQuery.isPending}
                    aria-label='Initial delay (ms)'
                    title='Initial delay (ms)'
                  />
                </FormField>
                <FormField label='Max delay (ms)'>
                  <Input
                    type='number'
                    min={0}
                    value={settings.retry.maxDelayMs}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateRetry(
                        'maxDelayMs',
                        toNumber(event.target.value, settings.retry.maxDelayMs)
                      )
                    }
                    disabled={settingsQuery.isPending}
                    aria-label='Max delay (ms)'
                    title='Max delay (ms)'
                  />
                </FormField>
              </div>
              <FormField label='Timeout per attempt (ms)' description='Set to 0 to disable.'>
                <Input
                  type='number'
                  min={0}
                  value={settings.retry.timeoutMs ?? 0}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateRetry(
                      'timeoutMs',
                      toNumber(event.target.value, settings.retry.timeoutMs ?? 0)
                    )
                  }
                  disabled={settingsQuery.isPending}
                  aria-label='Timeout per attempt (ms)'
                  title='Timeout per attempt (ms)'
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection
            title='Circuit Breaker'
            description='Prevents repeated calls to failing services.'
            variant='subtle'
            className='p-4'
            actions={
              <ToggleRow
                label='Circuit breaker enabled'
                checked={settings.circuit.enabled}
                onCheckedChange={(checked: boolean) => updateCircuit('enabled', checked)}
                className='bg-transparent border-none p-0 hover:bg-transparent'
              />
            }
          >
            <div className='grid gap-4 mt-2'>
              <FormField label='Failure threshold' description='Consecutive failures before opening.'>
                <Input
                  type='number'
                  min={1}
                  value={settings.circuit.failureThreshold}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateCircuit(
                      'failureThreshold',
                      toNumber(event.target.value, settings.circuit.failureThreshold, 1)
                    )
                  }
                  disabled={settingsQuery.isPending}
                  aria-label='Failure threshold'
                  title='Failure threshold'
                />
              </FormField>
              <FormField label='Reset timeout (ms)' description='Wait time before attempting to close.'>
                <Input
                  type='number'
                  min={0}
                  value={settings.circuit.resetTimeoutMs}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateCircuit(
                      'resetTimeoutMs',
                      toNumber(event.target.value, settings.circuit.resetTimeoutMs)
                    )
                  }
                  disabled={settingsQuery.isPending}
                  aria-label='Reset timeout (ms)'
                  title='Reset timeout (ms)'
                />
              </FormField>
            </div>
          </FormSection>
        </div>

        <div className='mt-6 flex items-center justify-between border-t border-border pt-6'>
          <p className='text-xs text-gray-500'>Changes apply across the app after saving.</p>
          <Button
            size='sm'
            onClick={() => void saveSettings()}
            disabled={!dirty || updateSetting.isPending}
          >
            {updateSetting.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </FormSection>
    </AdminSettingsPageLayout>
  );
}

export default function AdminTransientRecoverySettingsPage(): React.JSX.Element {
  const [constants, setConstants] = useState<TransientRecoveryConstants | null>(null);
  const settingsQuery = useSettingsMap();

  useEffect(() => {
    const loadConstants = async () => {
      const loadedConstants = await loadTransientRecoveryConstants();
      setConstants(loadedConstants);
    };
    void loadConstants();
  }, []);

  if (settingsQuery.isLoading || !settingsQuery.data || !constants) {
    return <div className='p-10 text-center text-gray-400'>Loading settings...</div>;
  }

  const stored = parseJsonSetting<TransientRecoverySettings | null>(
    settingsQuery.data.get(constants.TRANSIENT_RECOVERY_KEYS.settings),
    null
  );
  const initialSettings: TransientRecoverySettings = buildInitialTransientRecoverySettings({
    stored,
    defaults: constants.DEFAULT_TRANSIENT_RECOVERY_SETTINGS,
  });

  return (
    <TransientRecoverySettingsForm
      initialSettings={initialSettings}
      recoveryKeys={constants.TRANSIENT_RECOVERY_KEYS}
    />
  );
}
