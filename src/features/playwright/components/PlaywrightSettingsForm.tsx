'use client';

import { ChangeEvent, ReactElement, useMemo } from 'react';

import { playwrightDeviceOptions } from '@/features/playwright/constants/playwright';
import { usePlaywrightSettings, PlaywrightSettingsProvider } from '@/features/playwright/context/PlaywrightSettingsContext';
import type { PlaywrightSettings } from '@/features/playwright/types';
import { Button, Input, Checkbox, SelectSimple, FormSection, FormField } from '@/shared/ui';

import { PlaywrightSettingsFormViewProvider, usePlaywrightSettingsFormView } from './context/PlaywrightSettingsFormViewContext';

import type { Dispatch, SetStateAction } from 'react';

export type PlaywrightSettingsFormProps = {
  settings: PlaywrightSettings;
  setSettings: Dispatch<SetStateAction<PlaywrightSettings>>;
  onSave?: () => void;
  saveLabel?: string;
  showSave?: boolean;
  title?: string;
  description?: string;
};

const toNumber = (value: string, fallback: number): number => {
  if (value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function HeadlessModeSection(): ReactElement {
  const { settings, setSettings } = usePlaywrightSettings();
  return (
    <FormSection variant='subtle-compact' className='p-3'>
      <div className='flex items-center justify-between gap-4'>
        <div>
          <div className='text-sm text-gray-200'>Headless mode</div>
          <div className='text-xs text-gray-500'>Hide the browser window during execution.</div>
        </div>
        <Checkbox
          checked={settings.headless}
          onCheckedChange={(checked: boolean | 'indeterminate'): void =>
            setSettings((prev: PlaywrightSettings) => ({
              ...prev,
              headless: Boolean(checked),
            }))
          }
        />
      </div>
    </FormSection>
  );
}

function EmulationSection(): ReactElement {
  const { settings, setSettings } = usePlaywrightSettings();
  return (
    <FormSection variant='subtle-compact' className='p-3 space-y-3'>
      <div className='flex items-center justify-between gap-4'>
        <div>
          <div className='text-sm text-gray-200'>Emulate Device</div>
          <div className='text-xs text-gray-500'>Simulate a mobile device or specific browser.</div>
        </div>
        <Checkbox
          checked={settings.emulateDevice}
          onCheckedChange={(checked: boolean | 'indeterminate'): void =>
            setSettings((prev: PlaywrightSettings) => ({
              ...prev,
              emulateDevice: Boolean(checked),
            }))
          }
        />
      </div>
      {settings.emulateDevice && (
        <FormField label='Device'>
          <SelectSimple size='sm'
            value={settings.deviceName}
            onValueChange={(v: string): void =>
              setSettings((prev: PlaywrightSettings) => ({
                ...prev,
                deviceName: v,
              }))
            }
            options={playwrightDeviceOptions}
            placeholder='Select device'
          />
        </FormField>
      )}
    </FormSection>
  );
}

function TimeoutsSection(): ReactElement {
  const { settings, setSettings } = usePlaywrightSettings();
  return (
    <div className='grid gap-4 md:grid-cols-3'>
      <FormSection variant='subtle-compact' className='p-3'>
        <FormField label='SlowMo (ms)'>
          <Input
            type='number'
            className='h-9'
            value={settings.slowMo}
            onChange={(e: ChangeEvent<HTMLInputElement>): void =>
              setSettings((prev: PlaywrightSettings) => ({
                ...prev,
                slowMo: toNumber(e.target.value, prev.slowMo),
              }))
            }
          />
        </FormField>
      </FormSection>
      <FormSection variant='subtle-compact' className='p-3'>
        <FormField label='Timeout (ms)'>
          <Input
            type='number'
            className='h-9'
            value={settings.timeout}
            onChange={(e: ChangeEvent<HTMLInputElement>): void =>
              setSettings((prev: PlaywrightSettings) => ({
                ...prev,
                timeout: toNumber(e.target.value, prev.timeout),
              }))
            }
          />
        </FormField>
      </FormSection>
      <FormSection variant='subtle-compact' className='p-3'>
        <FormField label='Navigation Timeout (ms)'>
          <Input
            type='number'
            className='h-9'
            value={settings.navigationTimeout}
            onChange={(e: ChangeEvent<HTMLInputElement>): void =>
              setSettings((prev: PlaywrightSettings) => ({
                ...prev,
                navigationTimeout: toNumber(
                  e.target.value,
                  prev.navigationTimeout
                ),
              }))
            }
          />
        </FormField>
      </FormSection>
    </div>
  );
}

function HumanizeSection(): ReactElement {
  const { settings, setSettings } = usePlaywrightSettings();
  return (
    <FormSection variant='subtle-compact' className='p-3 space-y-3'>
      <div className='flex items-center justify-between gap-4'>
        <div>
          <div className='text-sm text-gray-200'>Humanize Mouse</div>
          <div className='text-xs text-gray-500'>Add jitter and randomized movement paths.</div>
        </div>
        <Checkbox
          checked={settings.humanizeMouse}
          onCheckedChange={(checked: boolean | 'indeterminate'): void =>
            setSettings((prev: PlaywrightSettings) => ({
              ...prev,
              humanizeMouse: Boolean(checked),
            }))
          }
        />
      </div>
      {settings.humanizeMouse && (
        <FormField label='Mouse Jitter (pixels)'>
          <Input
            type='number'
            className='h-9'
            value={settings.mouseJitter}
            onChange={(e: ChangeEvent<HTMLInputElement>): void =>
              setSettings((prev: PlaywrightSettings) => ({
                ...prev,
                mouseJitter: toNumber(e.target.value, prev.mouseJitter),
              }))
            }
          />
        </FormField>
      )}
    </FormSection>
  );
}

function DelayInputs({ 
  label, 
  minKey, 
  maxKey 
}: { 
  label: string; 
  minKey: keyof PlaywrightSettings; 
  maxKey: keyof PlaywrightSettings 
}): ReactElement {
  const { settings, setSettings } = usePlaywrightSettings();
  return (
    <div className='grid gap-4 md:grid-cols-2'>
      <FormSection variant='subtle-compact' className='p-3'>
        <FormField label={`${label} min`}>
          <Input
            type='number'
            className='h-9'
            value={settings[minKey] as number}
            onChange={(e: ChangeEvent<HTMLInputElement>): void =>
              setSettings((prev: PlaywrightSettings) => ({
                ...prev,
                [minKey]: toNumber(
                  e.target.value,
                  prev[minKey] as number
                ),
              }))
            }
          />
        </FormField>
      </FormSection>
      <FormSection variant='subtle-compact' className='p-3'>
        <FormField label={`${label} max`}>
          <Input
            type='number'
            className='h-9'
            value={settings[maxKey] as number}
            onChange={(e: ChangeEvent<HTMLInputElement>): void =>
              setSettings((prev: PlaywrightSettings) => ({
                ...prev,
                [maxKey]: toNumber(
                  e.target.value,
                  prev[maxKey] as number
                ),
              }))
            }
          />
        </FormField>
      </FormSection>
    </div>
  );
}

function ProxySection(): ReactElement {
  const { settings, setSettings } = usePlaywrightSettings();
  return (
    <FormSection variant='subtle-compact' className='p-3 space-y-3'>
      <div className='flex items-center justify-between gap-4'>
        <div>
          <div className='text-sm text-gray-200'>Proxy</div>
          <div className='text-xs text-gray-500'>Route traffic through a proxy server.</div>
        </div>
        <Checkbox
          checked={settings.proxyEnabled}
          onCheckedChange={(checked: boolean | 'indeterminate'): void =>
            setSettings((prev: PlaywrightSettings) => ({
              ...prev,
              proxyEnabled: Boolean(checked),
            }))
          }
        />
      </div>
      {settings.proxyEnabled && (
        <div className='space-y-3'>
          <FormField label='Proxy server'>
            <Input
              type='text'
              className='h-9'
              placeholder='http://host:port'
              value={settings.proxyServer}
              onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                setSettings((prev: PlaywrightSettings) => ({
                  ...prev,
                  proxyServer: e.target.value,
                }))
              }
            />
          </FormField>
          <div className='grid gap-4 md:grid-cols-2'>
            <FormField label='Proxy username'>
              <Input
                type='text'
                className='h-9'
                value={settings.proxyUsername}
                onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                  setSettings((prev: PlaywrightSettings) => ({
                    ...prev,
                    proxyUsername: e.target.value,
                  }))
                }
              />
            </FormField>
            <FormField label='Proxy password'>
              <Input
                type='password'
                className='h-9'
                value={settings.proxyPassword}
                onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                  setSettings((prev: PlaywrightSettings) => ({
                    ...prev,
                    proxyPassword: e.target.value,
                  }))
                }
              />
            </FormField>
          </div>
        </div>
      )}
    </FormSection>
  );
}

function AdvancedSettingsSection(): ReactElement {
  return (
    <FormSection title='Advanced settings' variant='subtle' className='p-3'>
      <details className='mt-2'>
        <summary className='cursor-pointer text-sm font-semibold text-gray-200'>
          Expand advanced options
        </summary>
        <div className='mt-4 space-y-4'>
          <FormField
            label='Interaction delays (ms)'
            description='Add random pauses between actions for human-like pacing.'
          />

          <DelayInputs label='Click delay' minKey='clickDelayMin' maxKey='clickDelayMax' />
          <DelayInputs label='Input delay' minKey='inputDelayMin' maxKey='inputDelayMax' />
          <DelayInputs label='Action delay' minKey='actionDelayMin' maxKey='actionDelayMax' />
          
          <ProxySection />
        </div>
      </details>
    </FormSection>
  );
}

export function PlaywrightSettingsFormContent(): ReactElement {
  const {
    onSave,
    saveLabel,
    showSave,
    title,
    description,
  } = usePlaywrightSettingsFormView();
  const shouldShowSave = showSave ?? Boolean(onSave);

  return (
    <FormSection
      title={title ?? 'Playwright settings'}
      description={description ?? 'Control how the browser behaves during crosslisting.'}
      className='max-h-[70vh] overflow-y-auto p-4'
    >
      <div className='mt-4 space-y-4'>
        <HeadlessModeSection />
        <EmulationSection />
        <TimeoutsSection />
        <HumanizeSection />
        <AdvancedSettingsSection />

        {shouldShowSave && onSave ? (
          <div className='flex justify-end'>
            <Button
              type='button'
              onClick={onSave}
            >
              {saveLabel ?? 'Save Playwright Settings'}
            </Button>
          </div>
        ) : null}
      </div>
    </FormSection>
  );
}



export function PlaywrightSettingsForm({
  settings,
  setSettings,
  onSave,
  saveLabel,
  showSave,
  title,
  description,
}: PlaywrightSettingsFormProps): ReactElement {
  const viewContextValue = useMemo(
    () => ({
      ...(onSave !== undefined && { onSave }),
      ...(saveLabel !== undefined && { saveLabel }),
      ...(showSave !== undefined && { showSave }),
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
    }),
    [description, onSave, saveLabel, showSave, title]
  );

  return (
    <PlaywrightSettingsProvider settings={settings} setSettings={setSettings}>
      <PlaywrightSettingsFormViewProvider value={viewContextValue}>
        <PlaywrightSettingsFormContent />
      </PlaywrightSettingsFormViewProvider>
    </PlaywrightSettingsProvider>
  );
}
