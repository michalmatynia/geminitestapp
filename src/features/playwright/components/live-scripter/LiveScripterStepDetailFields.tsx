'use client';

import type { PlaywrightStepType } from '@/shared/contracts/playwright-steps';
import { Input, Label, Textarea } from '@/shared/ui/primitives.public';

import type { LiveScripterAssignDrawerModel } from './liveScripterAssignDrawer.types';

function LiveScripterTextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number';
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function LiveScripterScriptField({
  script,
  setScript,
}: Pick<LiveScripterAssignDrawerModel, 'script' | 'setScript'>): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor='live-scripter-script'>Script</Label>
      <Textarea
        id='live-scripter-script'
        value={script}
        onChange={(event) => setScript(event.target.value)}
        className='min-h-[140px]'
      />
    </div>
  );
}

function LiveScripterDescriptionField({
  description,
  setDescription,
}: Pick<LiveScripterAssignDrawerModel, 'description' | 'setDescription'>): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor='live-scripter-description'>Description</Label>
      <Textarea
        id='live-scripter-description'
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        className='min-h-[84px]'
      />
    </div>
  );
}

const isUrlStep = (stepType: PlaywrightStepType): boolean =>
  stepType === 'navigate' || stepType === 'assert_url';

const isTimeoutStep = (stepType: PlaywrightStepType): boolean =>
  stepType === 'wait_for_timeout' || stepType === 'wait_for_selector';

function LiveScripterStepSpecificFields({
  stepType,
  url,
  setUrl,
  keyValue,
  setKeyValue,
  timeoutValue,
  setTimeoutValue,
  script,
  setScript,
}: Pick<
  LiveScripterAssignDrawerModel,
  | 'stepType'
  | 'url'
  | 'setUrl'
  | 'keyValue'
  | 'setKeyValue'
  | 'timeoutValue'
  | 'setTimeoutValue'
  | 'script'
  | 'setScript'
>): React.JSX.Element {
  return (
    <>
      {isUrlStep(stepType) ? (
        <LiveScripterTextField id='live-scripter-url' label='URL' value={url} onChange={setUrl} />
      ) : null}
      {stepType === 'press_key' ? (
        <LiveScripterTextField
          id='live-scripter-key'
          label='Key'
          value={keyValue}
          onChange={setKeyValue}
          placeholder='Enter, Tab, Escape...'
        />
      ) : null}
      {isTimeoutStep(stepType) ? (
        <LiveScripterTextField
          id='live-scripter-timeout'
          label='Timeout (ms)'
          type='number'
          value={timeoutValue}
          onChange={setTimeoutValue}
        />
      ) : null}
      {stepType === 'custom_script' ? (
        <LiveScripterScriptField script={script} setScript={setScript} />
      ) : null}
    </>
  );
}

export function LiveScripterStepDetailFields({
  stepType,
  needsValue,
  value,
  setValue,
  url,
  setUrl,
  keyValue,
  setKeyValue,
  timeoutValue,
  setTimeoutValue,
  script,
  setScript,
  description,
  setDescription,
}: Pick<
  LiveScripterAssignDrawerModel,
  | 'stepType'
  | 'needsValue'
  | 'value'
  | 'setValue'
  | 'url'
  | 'setUrl'
  | 'keyValue'
  | 'setKeyValue'
  | 'timeoutValue'
  | 'setTimeoutValue'
  | 'script'
  | 'setScript'
  | 'description'
  | 'setDescription'
>): React.JSX.Element {
  return (
    <>
      {needsValue ? (
        <LiveScripterTextField
          id='live-scripter-value'
          label='Value'
          value={value}
          onChange={setValue}
        />
      ) : null}
      <LiveScripterStepSpecificFields
        stepType={stepType}
        url={url}
        setUrl={setUrl}
        keyValue={keyValue}
        setKeyValue={setKeyValue}
        timeoutValue={timeoutValue}
        setTimeoutValue={setTimeoutValue}
        script={script}
        setScript={setScript}
      />
      <LiveScripterDescriptionField
        description={description}
        setDescription={setDescription}
      />
    </>
  );
}
