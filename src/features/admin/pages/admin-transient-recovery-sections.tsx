'use client';

import type { ChangeEvent } from 'react';

import type { TransientRecoverySettings } from '@/shared/contracts/observability';
import { AdminSettingsPageLayout } from '@/shared/ui/admin.public';
import { FormField, FormSection, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { UI_GRID_RELAXED_CLASSNAME, UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { Button, Input } from '@/shared/ui/primitives.public';

type RetryUpdater = (
  key: keyof TransientRecoverySettings['retry'],
  value: number | boolean
) => void;
type CircuitUpdater = (
  key: keyof TransientRecoverySettings['circuit'],
  value: number | boolean
) => void;

type RecoveryNumberFieldProps = {
  description?: string;
  disabled: boolean;
  label: string;
  min: number;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  value: number;
};

type RetrySectionProps = {
  disabled: boolean;
  settings: TransientRecoverySettings;
  updateRetry: RetryUpdater;
};

type CircuitSectionProps = {
  disabled: boolean;
  settings: TransientRecoverySettings;
  updateCircuit: CircuitUpdater;
};

type TransientRecoveryPageContentProps = {
  dirty: boolean;
  disabled: boolean;
  onSave: () => void;
  onToggleEnabled: (checked: boolean) => void;
  saving: boolean;
  settings: TransientRecoverySettings;
  updateCircuit: CircuitUpdater;
  updateRetry: RetryUpdater;
};

const toNumber = (value: string, fallback: number, min: number = 0): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) {
    return fallback;
  }

  return parsed;
};

function RecoveryNumberField({
  description,
  disabled,
  label,
  min,
  onChange,
  value,
}: RecoveryNumberFieldProps): React.JSX.Element {
  return (
    <FormField label={label} description={description}>
      <Input
        type='number'
        min={min}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-label={label}
        title={label}
      />
    </FormField>
  );
}

function RetryDelayFields({
  disabled,
  settings,
  updateRetry,
}: RetrySectionProps): React.JSX.Element {
  return (
    <div className={`${UI_GRID_RELAXED_CLASSNAME} grid-cols-2`}>
      <RecoveryNumberField
        disabled={disabled}
        label='Initial delay (ms)'
        min={0}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          updateRetry('initialDelayMs', toNumber(event.target.value, settings.retry.initialDelayMs))
        }
        value={settings.retry.initialDelayMs}
      />
      <RecoveryNumberField
        disabled={disabled}
        label='Max delay (ms)'
        min={0}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          updateRetry('maxDelayMs', toNumber(event.target.value, settings.retry.maxDelayMs))
        }
        value={settings.retry.maxDelayMs}
      />
    </div>
  );
}

function RetryPolicySection({ disabled, settings, updateRetry }: RetrySectionProps): React.JSX.Element {
  return (
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
      <div className={`${UI_GRID_RELAXED_CLASSNAME} mt-2`}>
        <RecoveryNumberField
          disabled={disabled}
          label='Max attempts'
          description='Maximum number of execution tries.'
          min={1}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            updateRetry('maxAttempts', toNumber(event.target.value, settings.retry.maxAttempts, 1))
          }
          value={settings.retry.maxAttempts}
        />
        <RetryDelayFields disabled={disabled} settings={settings} updateRetry={updateRetry} />
        <RecoveryNumberField
          disabled={disabled}
          label='Timeout per attempt (ms)'
          description='Set to 0 to disable.'
          min={0}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            updateRetry('timeoutMs', toNumber(event.target.value, settings.retry.timeoutMs ?? 0))
          }
          value={settings.retry.timeoutMs ?? 0}
        />
      </div>
    </FormSection>
  );
}

function CircuitBreakerSection({
  disabled,
  settings,
  updateCircuit,
}: CircuitSectionProps): React.JSX.Element {
  return (
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
      <div className={`${UI_GRID_RELAXED_CLASSNAME} mt-2`}>
        <RecoveryNumberField
          label='Failure threshold'
          description='Consecutive failures before opening.'
          min={1}
          value={settings.circuit.failureThreshold}
          disabled={disabled}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            updateCircuit(
              'failureThreshold',
              toNumber(event.target.value, settings.circuit.failureThreshold, 1)
            )
          }
        />
        <RecoveryNumberField
          label='Reset timeout (ms)'
          description='Wait time before attempting to close.'
          min={0}
          value={settings.circuit.resetTimeoutMs}
          disabled={disabled}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            updateCircuit(
              'resetTimeoutMs',
              toNumber(event.target.value, settings.circuit.resetTimeoutMs)
            )
          }
        />
      </div>
    </FormSection>
  );
}

export function TransientRecoveryPageContent({
  dirty,
  disabled,
  onSave,
  onToggleEnabled,
  saving,
  settings,
  updateCircuit,
  updateRetry,
}: TransientRecoveryPageContentProps): React.JSX.Element {
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
            onCheckedChange={onToggleEnabled}
            className='bg-transparent border-none p-0 hover:bg-transparent'
          />
        }
        className='p-6'
      >
        <div className={`${UI_GRID_ROOMY_CLASSNAME} md:grid-cols-2`}>
          <RetryPolicySection disabled={disabled} settings={settings} updateRetry={updateRetry} />
          <CircuitBreakerSection
            disabled={disabled}
            settings={settings}
            updateCircuit={updateCircuit}
          />
        </div>
        <div className='mt-6 flex items-center justify-between border-t border-border pt-6'>
          <p className='text-xs text-gray-500'>Changes apply across the app after saving.</p>
          <Button size='sm' onClick={onSave} disabled={!dirty || saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </FormSection>
    </AdminSettingsPageLayout>
  );
}
