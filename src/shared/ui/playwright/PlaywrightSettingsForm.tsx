'use client';

import React, { ChangeEvent, ReactElement, useMemo } from 'react';

import type { PlaywrightSettings } from '@/shared/contracts/playwright';
import type {
  PlaywrightSettingsContextType,
  PlaywrightSettingsFormProps,
  PlaywrightSettingsProviderProps,
} from '@/shared/contracts/ui';
import { internalError } from '@/shared/errors/app-error';
import { playwrightDeviceOptions } from '@/shared/lib/playwright/settings';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import {
  CollapsibleSection,
  FormActions,
  FormField,
  FormSection,
  Hint,
  Input,
  SelectSimple,
  ToggleRow,
  UI_GRID_RELAXED_CLASSNAME,
} from '@/shared/ui';

export type {
  PlaywrightSettingsContextType,
  PlaywrightSettingsFormProps,
  PlaywrightSettingsProviderProps,
};

const {
  Context: PlaywrightSettingsContext,
  useStrictContext: usePlaywrightSettings,
} = createStrictContext<PlaywrightSettingsContextType>({
  hookName: 'usePlaywrightSettings',
  providerName: 'a PlaywrightSettingsProvider',
  displayName: 'PlaywrightSettingsContext',
  errorFactory: (message) => internalError(message),
});

export { usePlaywrightSettings };

export function PlaywrightSettingsProvider({
  settings,
  setSettings,
  children,
}: PlaywrightSettingsProviderProps): React.JSX.Element {
  return (
    <PlaywrightSettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </PlaywrightSettingsContext.Provider>
  );
}

type PlaywrightSettingsFormViewContextValue = {
  onSave?: () => void;
  saveLabel?: string;
  showSave?: boolean;
  title?: string;
  description?: string;
};

const {
  Context: PlaywrightSettingsFormViewContext,
  useStrictContext: usePlaywrightSettingsFormView,
} = createStrictContext<PlaywrightSettingsFormViewContextValue>({
  hookName: 'usePlaywrightSettingsFormView',
  providerName: 'PlaywrightSettingsFormViewProvider',
  displayName: 'PlaywrightSettingsFormViewContext',
  errorFactory: (message) => internalError(message),
});

type PlaywrightSettingsFormViewProviderProps = {
  value: PlaywrightSettingsFormViewContextValue;
  children: React.ReactNode;
};

export function PlaywrightSettingsFormViewProvider({
  value,
  children,
}: PlaywrightSettingsFormViewProviderProps): React.JSX.Element {
  return (
    <PlaywrightSettingsFormViewContext.Provider value={value}>
      {children}
    </PlaywrightSettingsFormViewContext.Provider>
  );
}

const toNumber = (value: string, fallback: number): number => {
  if (value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function HeadlessModeSection(): ReactElement {
  const { settings, setSettings } = usePlaywrightSettings();
  return (
    <ToggleRow
      label='Headless mode'
      description='Hide the browser window during execution.'
      checked={settings.headless}
      onCheckedChange={(checked: boolean): void =>
        setSettings((prev: PlaywrightSettings) => ({
          ...prev,
          headless: checked,
        }))
      }
      variant='switch'
    />
  );
}

function EmulationSection(): ReactElement {
  const { settings, setSettings } = usePlaywrightSettings();
  return (
    <FormSection variant='subtle-compact' className='p-3 space-y-3'>
      <ToggleRow
        label='Emulate Device'
        description='Simulate a mobile device or specific browser.'
        checked={settings.emulateDevice}
        onCheckedChange={(checked: boolean): void =>
          setSettings((prev: PlaywrightSettings) => ({
            ...prev,
            emulateDevice: checked,
          }))
        }
        variant='switch'
        className='border-none bg-transparent p-0 hover:bg-transparent'
      />
      {settings.emulateDevice && (
        <FormField label='Device'>
          <SelectSimple
            size='sm'
            value={settings.deviceName}
            onValueChange={(value: string): void =>
              setSettings((prev: PlaywrightSettings) => ({
                ...prev,
                deviceName: value,
              }))
            }
            options={playwrightDeviceOptions}
            placeholder='Select device'
           ariaLabel='Select device' title='Select device'/>
        </FormField>
      )}
    </FormSection>
  );
}

function TimeoutsSection(): ReactElement {
  const { settings, setSettings } = usePlaywrightSettings();
  return (
    <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-3`}>
      <FormSection variant='subtle-compact' className='p-3'>
        <FormField label='SlowMo (ms)'>
          <Input
            type='number'
            className='h-9'
            value={settings.slowMo}
            onChange={(event: ChangeEvent<HTMLInputElement>): void =>
              setSettings((prev: PlaywrightSettings) => ({
                ...prev,
                slowMo: toNumber(event.target.value, prev.slowMo),
              }))
            }
           aria-label='SlowMo (ms)' title='SlowMo (ms)'/>
        </FormField>
      </FormSection>
      <FormSection variant='subtle-compact' className='p-3'>
        <FormField label='Timeout (ms)'>
          <Input
            type='number'
            className='h-9'
            value={settings.timeout}
            onChange={(event: ChangeEvent<HTMLInputElement>): void =>
              setSettings((prev: PlaywrightSettings) => ({
                ...prev,
                timeout: toNumber(event.target.value, prev.timeout),
              }))
            }
           aria-label='Timeout (ms)' title='Timeout (ms)'/>
        </FormField>
      </FormSection>
      <FormSection variant='subtle-compact' className='p-3'>
        <FormField label='Navigation Timeout (ms)'>
          <Input
            type='number'
            className='h-9'
            value={settings.navigationTimeout}
            onChange={(event: ChangeEvent<HTMLInputElement>): void =>
              setSettings((prev: PlaywrightSettings) => ({
                ...prev,
                navigationTimeout: toNumber(event.target.value, prev.navigationTimeout),
              }))
            }
           aria-label='Navigation Timeout (ms)' title='Navigation Timeout (ms)'/>
        </FormField>
      </FormSection>
    </div>
  );
}

function HumanizeSection(): ReactElement {
  const { settings, setSettings } = usePlaywrightSettings();
  return (
    <FormSection variant='subtle-compact' className='p-3 space-y-3'>
      <ToggleRow
        label='Humanize Mouse'
        description='Add jitter and randomized movement paths.'
        checked={settings.humanizeMouse}
        onCheckedChange={(checked: boolean): void =>
          setSettings((prev: PlaywrightSettings) => ({
            ...prev,
            humanizeMouse: checked,
          }))
        }
        variant='switch'
        className='border-none bg-transparent p-0 hover:bg-transparent'
      />
      {settings.humanizeMouse && (
        <FormField label='Mouse Jitter (pixels)'>
          <Input
            type='number'
            className='h-9'
            value={settings.mouseJitter}
            onChange={(event: ChangeEvent<HTMLInputElement>): void =>
              setSettings((prev: PlaywrightSettings) => ({
                ...prev,
                mouseJitter: toNumber(event.target.value, prev.mouseJitter),
              }))
            }
           aria-label='Mouse Jitter (pixels)' title='Mouse Jitter (pixels)'/>
        </FormField>
      )}
    </FormSection>
  );
}

function DelayInputs(props: {
  label: string;
  minKey: keyof PlaywrightSettings;
  maxKey: keyof PlaywrightSettings;
}): ReactElement {
  const { label, minKey, maxKey } = props;
  const { settings, setSettings } = usePlaywrightSettings();

  return (
    <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2`}>
      <FormSection variant='subtle-compact' className='p-3'>
        <FormField label={`${label} min`}>
          <Input
            type='number'
            className='h-9'
            value={settings[minKey] as number}
            onChange={(event: ChangeEvent<HTMLInputElement>): void =>
              setSettings((prev: PlaywrightSettings) => ({
                ...prev,
                [minKey]: toNumber(event.target.value, prev[minKey] as number),
              }))
            }
           aria-label={`${label} min`} title={`${label} min`}/>
        </FormField>
      </FormSection>
      <FormSection variant='subtle-compact' className='p-3'>
        <FormField label={`${label} max`}>
          <Input
            type='number'
            className='h-9'
            value={settings[maxKey] as number}
            onChange={(event: ChangeEvent<HTMLInputElement>): void =>
              setSettings((prev: PlaywrightSettings) => ({
                ...prev,
                [maxKey]: toNumber(event.target.value, prev[maxKey] as number),
              }))
            }
           aria-label={`${label} max`} title={`${label} max`}/>
        </FormField>
      </FormSection>
    </div>
  );
}

function ProxySection(): ReactElement {
  const { settings, setSettings } = usePlaywrightSettings();
  return (
    <FormSection variant='subtle-compact' className='p-3 space-y-3'>
      <ToggleRow
        label='Proxy'
        description='Route traffic through a proxy server.'
        checked={settings.proxyEnabled}
        onCheckedChange={(checked: boolean): void =>
          setSettings((prev: PlaywrightSettings) => ({
            ...prev,
            proxyEnabled: checked,
          }))
        }
        variant='switch'
        className='border-none bg-transparent p-0 hover:bg-transparent'
      />
      {settings.proxyEnabled && (
        <div className='space-y-3'>
          <FormField label='Proxy server'>
            <Input
              type='text'
              className='h-9'
              placeholder='http://host:port'
              value={settings.proxyServer}
              onChange={(event: ChangeEvent<HTMLInputElement>): void =>
                setSettings((prev: PlaywrightSettings) => ({
                  ...prev,
                  proxyServer: event.target.value,
                }))
              }
             aria-label='http://host:port' title='http://host:port'/>
          </FormField>
        <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2`}>
            <FormField label='Proxy username'>
              <Input
                type='text'
                className='h-9'
                value={settings.proxyUsername}
                onChange={(event: ChangeEvent<HTMLInputElement>): void =>
                  setSettings((prev: PlaywrightSettings) => ({
                    ...prev,
                    proxyUsername: event.target.value,
                  }))
                }
               aria-label='Proxy username' title='Proxy username'/>
            </FormField>
            <FormField label='Proxy password'>
              <Input
                type='password'
                className='h-9'
                value={settings.proxyPassword}
                onChange={(event: ChangeEvent<HTMLInputElement>): void =>
                  setSettings((prev: PlaywrightSettings) => ({
                    ...prev,
                    proxyPassword: event.target.value,
                  }))
                }
               aria-label='Proxy password' title='Proxy password'/>
            </FormField>
          </div>
        </div>
      )}
    </FormSection>
  );
}

function AdvancedSettingsSection(): ReactElement {
  return (
    <CollapsibleSection
      title={<span className='text-sm font-semibold text-gray-200'>Advanced settings</span>}
      variant='subtle'
      className='mt-2'
    >
      <div className='mt-2 space-y-4'>
        <FormField label='Interaction delays (ms)'>
          <Hint variant='subtle'>Add random pauses between actions for human-like pacing.</Hint>
        </FormField>

        <DelayInputs label='Click delay' minKey='clickDelayMin' maxKey='clickDelayMax' />
        <DelayInputs label='Input delay' minKey='inputDelayMin' maxKey='inputDelayMax' />
        <DelayInputs label='Action delay' minKey='actionDelayMin' maxKey='actionDelayMax' />

        <ProxySection />
      </div>
    </CollapsibleSection>
  );
}

export function PlaywrightSettingsFormContent(): ReactElement {
  const { onSave, saveLabel, showSave, title, description } = usePlaywrightSettingsFormView();
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
          <FormActions
            onSave={onSave}
            saveText={saveLabel ?? 'Save Playwright Settings'}
            className='pt-4'
          />
        ) : null}
      </div>
    </FormSection>
  );
}

export function PlaywrightSettingsForm(props: PlaywrightSettingsFormProps): ReactElement {
  const { settings, setSettings, onSave, saveLabel, showSave, title, description } = props;

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
