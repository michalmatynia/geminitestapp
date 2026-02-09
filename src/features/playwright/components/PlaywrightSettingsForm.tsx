'use client';

import { ChangeEvent, ReactElement } from 'react';

import { playwrightDeviceOptions } from '@/features/playwright/constants/playwright';
import { usePlaywrightSettings, PlaywrightSettingsProvider } from '@/features/playwright/context/PlaywrightSettingsContext';
import type { PlaywrightSettings } from '@/features/playwright/types';
import { Button, Input, Label, Checkbox, SectionPanel, UnifiedSelect } from '@/shared/ui';

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
    <SectionPanel variant='subtle-compact'>
      <Label className='flex items-center justify-between text-sm text-gray-300'>
        <span>
          Headless mode
          <span className='ml-2 block text-xs text-gray-500'>
            Hide the browser window during execution.
          </span>
        </span>
        <Checkbox
          className='h-4 w-4 accent-emerald-400'
          checked={settings.headless}
          onCheckedChange={(checked: boolean | 'indeterminate'): void =>
            setSettings((prev: PlaywrightSettings) => ({
              ...prev,
              headless: Boolean(checked),
            }))
          }
        />
      </Label>
    </SectionPanel>
  );
}

function EmulationSection(): ReactElement {
  const { settings, setSettings } = usePlaywrightSettings();
  return (
    <SectionPanel variant='subtle-compact'>
      <Label className='flex items-center justify-between text-sm text-gray-300'>
        <span>
          Emulate Device
          <span className='ml-2 block text-xs text-gray-500'>
            Simulate a mobile device or specific browser.
          </span>
        </span>
        <Checkbox
          className='h-4 w-4 accent-emerald-400'
          checked={settings.emulateDevice}
          onCheckedChange={(checked: boolean | 'indeterminate'): void =>
            setSettings((prev: PlaywrightSettings) => ({
              ...prev,
              emulateDevice: Boolean(checked),
            }))
          }
        />
      </Label>
      {settings.emulateDevice && (
        <div className='mt-3'>
          <UnifiedSelect
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
        </div>
      )}
    </SectionPanel>
  );
}

function TimeoutsSection(): ReactElement {
  const { settings, setSettings } = usePlaywrightSettings();
  return (
    <div className='grid gap-4 md:grid-cols-3'>
      <SectionPanel variant='subtle-compact'>
        <Label className='text-xs text-gray-400'>SlowMo (ms)</Label>
        <Input
          type='number'
          className='mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white'
          value={settings.slowMo}
          onChange={(e: ChangeEvent<HTMLInputElement>): void =>
            setSettings((prev: PlaywrightSettings) => ({
              ...prev,
              slowMo: toNumber(e.target.value, prev.slowMo),
            }))
          }
        />
      </SectionPanel>
      <SectionPanel variant='subtle-compact'>
        <Label className='text-xs text-gray-400'>Timeout (ms)</Label>
        <Input
          type='number'
          className='mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white'
          value={settings.timeout}
          onChange={(e: ChangeEvent<HTMLInputElement>): void =>
            setSettings((prev: PlaywrightSettings) => ({
              ...prev,
              timeout: toNumber(e.target.value, prev.timeout),
            }))
          }
        />
      </SectionPanel>
      <SectionPanel variant='subtle-compact'>
        <Label className='text-xs text-gray-400'>
          Navigation Timeout (ms)
        </Label>
        <Input
          type='number'
          className='mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white'
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
      </SectionPanel>
    </div>
  );
}

function HumanizeSection(): ReactElement {
  const { settings, setSettings } = usePlaywrightSettings();
  return (
    <SectionPanel variant='subtle-compact'>
      <Label className='flex items-center justify-between text-sm text-gray-300'>
        <span>
          Humanize Mouse
          <span className='ml-2 block text-xs text-gray-500'>
            Add jitter and randomized movement paths.
          </span>
        </span>
        <Checkbox
          className='h-4 w-4 accent-emerald-400'
          checked={settings.humanizeMouse}
          onCheckedChange={(checked: boolean | 'indeterminate'): void =>
            setSettings((prev: PlaywrightSettings) => ({
              ...prev,
              humanizeMouse: Boolean(checked),
            }))
          }
        />
      </Label>
      {settings.humanizeMouse && (
        <div className='mt-3'>
          <Label className='text-xs text-gray-400'>
            Mouse Jitter (pixels)
          </Label>
          <Input
            type='number'
            className='mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white'
            value={settings.mouseJitter}
            onChange={(e: ChangeEvent<HTMLInputElement>): void =>
              setSettings((prev: PlaywrightSettings) => ({
                ...prev,
                mouseJitter: toNumber(e.target.value, prev.mouseJitter),
              }))
            }
          />
        </div>
      )}
    </SectionPanel>
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
      <SectionPanel variant='subtle-compact'>
        <Label className='text-xs text-gray-400'>
          {label} min
        </Label>
        <Input
          type='number'
          className='mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white'
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
      </SectionPanel>
      <SectionPanel variant='subtle-compact'>
        <Label className='text-xs text-gray-400'>
          {label} max
        </Label>
        <Input
          type='number'
          className='mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white'
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
      </SectionPanel>
    </div>
  );
}

function ProxySection(): ReactElement {
  const { settings, setSettings } = usePlaywrightSettings();
  return (
    <SectionPanel variant='subtle-compact'>
      <Label className='flex items-center justify-between text-sm text-gray-300'>
        <span>
        Proxy
          <span className='ml-2 block text-xs text-gray-500'>
          Route traffic through a proxy server.
          </span>
        </span>
        <Checkbox
          className='h-4 w-4 accent-emerald-400'
          checked={settings.proxyEnabled}
          onCheckedChange={(checked: boolean | 'indeterminate'): void =>
            setSettings((prev: PlaywrightSettings) => ({
              ...prev,
              proxyEnabled: Boolean(checked),
            }))
          }
        />
      </Label>
      {settings.proxyEnabled && (
        <div className='mt-3 space-y-3'>
          <div>
            <Label className='text-xs text-gray-400'>
            Proxy server
            </Label>
            <Input
              type='text'
              className='mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white'
              placeholder='http://host:port'
              value={settings.proxyServer}
              onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                setSettings((prev: PlaywrightSettings) => ({
                  ...prev,
                  proxyServer: e.target.value,
                }))
              }
            />
          </div>
          <div className='grid gap-4 md:grid-cols-2'>
            <div>
              <Label className='text-xs text-gray-400'>
              Proxy username
              </Label>
              <Input
                type='text'
                className='mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white'
                value={settings.proxyUsername}
                onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                  setSettings((prev: PlaywrightSettings) => ({
                    ...prev,
                    proxyUsername: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label className='text-xs text-gray-400'>
              Proxy password
              </Label>
              <Input
                type='password'
                className='mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white'
                value={settings.proxyPassword}
                onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                  setSettings((prev: PlaywrightSettings) => ({
                    ...prev,
                    proxyPassword: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </div>
      )}
    </SectionPanel>
  );
}

function AdvancedSettingsSection(): ReactElement {
  return (
    <SectionPanel variant='subtle' className='p-3'>
      <details>
        <summary className='cursor-pointer text-sm font-semibold text-gray-200'>
          Advanced settings
        </summary>
        <div className='mt-4 space-y-4'>
          <div>
            <p className='text-xs font-semibold text-gray-300'>
            Interaction delays (ms)
            </p>
            <p className='mt-1 text-xs text-gray-500'>
            Add random pauses between actions for human-like pacing.
            </p>
          </div>

          <DelayInputs label='Click delay' minKey='clickDelayMin' maxKey='clickDelayMax' />
          <DelayInputs label='Input delay' minKey='inputDelayMin' maxKey='inputDelayMax' />
          <DelayInputs label='Action delay' minKey='actionDelayMin' maxKey='actionDelayMax' />
          
          <ProxySection />
        </div>
      </details>
    </SectionPanel>
  );
}

export function PlaywrightSettingsFormContent({

  onSave,

  saveLabel,

  showSave,

  title,

  description,

}: Omit<PlaywrightSettingsFormProps, 'settings' | 'setSettings'>): ReactElement {

  const shouldShowSave = showSave ?? Boolean(onSave);



  return (

    <SectionPanel

      variant='subtle'

      className='max-h-[70vh] overflow-y-auto p-4'

    >

      <h3 className='text-sm font-semibold text-white'>

        {title ?? 'Playwright settings'}

      </h3>

      <p className='mt-1 text-xs text-gray-400'>

        {description ?? 'Control how the browser behaves during crosslisting.'}

      </p>



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

              className='rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200'

              onClick={onSave}

            >

              {saveLabel ?? 'Save Playwright Settings'}

            </Button>

          </div>

        ) : null}

      </div>

    </SectionPanel>

  );

}



export function PlaywrightSettingsForm(props: PlaywrightSettingsFormProps): ReactElement {

  return (

    <PlaywrightSettingsProvider settings={props.settings} setSettings={props.setSettings}>

      <PlaywrightSettingsFormContent {...props} />

    </PlaywrightSettingsProvider>

  );

}
