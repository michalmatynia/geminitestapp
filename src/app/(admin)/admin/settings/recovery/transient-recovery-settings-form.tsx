import Link from 'next/link';
import { useState, type ChangeEvent } from 'react';

import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  Button,
  Input,
  ToggleRow,
  useToast,
  FormSection,
  FormField,
  PageLayout,
} from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

export type TransientRecoverySettings = {
  enabled: boolean;
  retry: {
    enabled: boolean;
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
    timeoutMs: number | null;
  };
  circuit: {
    enabled: boolean;
    failureThreshold: number;
    resetTimeoutMs: number;
  };
};

const toNumber = (value: string, fallback: number, min: number = 0): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return parsed;
};

export function TransientRecoverySettingsForm({
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
      toast(error instanceof Error ? error.message : 'Failed to save settings.', {
        variant: 'error',
      });
    }
  };

  return (
    <PageLayout
      title='Transient Recovery'
      description='Configure retry and circuit-breaker policies for transient failures.'
      eyebrow={
        <Link href='/admin/settings' className='text-blue-300 hover:text-blue-200'>
          ← Back to settings
        </Link>
      }
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
              <FormField
                label='Failure threshold'
                description='Consecutive failures before opening.'
              >
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
                />
              </FormField>
              <FormField
                label='Reset timeout (ms)'
                description='Wait time before attempting to close.'
              >
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
    </PageLayout>
  );
}
