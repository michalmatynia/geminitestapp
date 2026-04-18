'use client';

import { Plus } from 'lucide-react';

import type { PlaywrightStepType } from '@/shared/contracts/playwright-steps';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/primitives.public';

import { STEP_TYPES } from './liveScripterAssignDrawer.helpers';
import { LiveScripterPickedElementSummary } from './LiveScripterPickedElementSummary';
import { LiveScripterSelectorBindingFields } from './LiveScripterSelectorBindingFields';
import { LiveScripterStepDetailFields } from './LiveScripterStepDetailFields';
import type { LiveScripterAssignDrawerModel } from './liveScripterAssignDrawer.types';

function LiveScripterStepIdentityFields({
  stepName,
  setStepName,
  stepType,
  setStepType,
}: Pick<
  LiveScripterAssignDrawerModel,
  'stepName' | 'setStepName' | 'stepType' | 'setStepType'
>): React.JSX.Element {
  return (
    <>
      <div className='space-y-2'>
        <Label htmlFor='live-scripter-step-name'>Step name</Label>
        <Input
          id='live-scripter-step-name'
          value={stepName}
          onChange={(event) => setStepName(event.target.value)}
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='live-scripter-step-type'>Step type</Label>
        <Select value={stepType} onValueChange={(value) => setStepType(value as PlaywrightStepType)}>
          <SelectTrigger id='live-scripter-step-type'>
            <SelectValue placeholder='Choose step type' />
          </SelectTrigger>
          <SelectContent>
            {STEP_TYPES.map(([stepTypeValue, label]) => (
              <SelectItem key={stepTypeValue} value={stepTypeValue}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

function LiveScripterAppendAction({
  errorMessage,
  isSavingRegistry,
  onAppend,
}: {
  errorMessage: string | null;
  isSavingRegistry: boolean;
  onAppend: () => void;
}): React.JSX.Element {
  return (
    <>
      {typeof errorMessage === 'string' && errorMessage.length > 0 ? (
        <div className='text-sm text-red-400'>{errorMessage}</div>
      ) : null}
      <Button type='button' onClick={onAppend} disabled={isSavingRegistry}>
        <Plus className='mr-2 size-4' />
        Append Step
      </Button>
    </>
  );
}

function LiveScripterAssignDrawerFields({
  model,
}: {
  model: LiveScripterAssignDrawerModel;
}): React.JSX.Element {
  return (
    <>
      <LiveScripterStepIdentityFields
        stepName={model.stepName}
        setStepName={model.setStepName}
        stepType={model.stepType}
        setStepType={model.setStepType}
      />

      <LiveScripterSelectorBindingFields
        needsSelector={model.needsSelector}
        selectorCandidates={model.selectorCandidates}
        selectedSelectorKey={model.selectedSelectorKey}
        setSelectedSelectorKey={model.setSelectedSelectorKey}
        selectedSelector={model.selectedSelector}
        selectorBindingMode={model.selectorBindingMode}
        setSelectorBindingMode={model.setSelectorBindingMode}
        registryNamespace={model.registryNamespace}
        setRegistryNamespace={model.setRegistryNamespace}
        registryProfiles={model.registryProfiles}
        effectiveRegistryProfile={model.effectiveRegistryProfile}
        setRegistryProfile={model.setRegistryProfile}
        entriesForProfile={model.entriesForProfile}
        registryEntryKey={model.registryEntryKey}
        setRegistryEntryKey={model.setRegistryEntryKey}
        saveToRegistry={model.saveToRegistry}
        setSaveToRegistry={model.setSaveToRegistry}
        selectedRegistryEntry={model.selectedRegistryEntry}
        selectedRegistryEntryCompatible={model.selectedRegistryEntryCompatible}
        stepType={model.stepType}
      />

      <LiveScripterStepDetailFields
        stepType={model.stepType}
        needsValue={model.needsValue}
        value={model.value}
        setValue={model.setValue}
        url={model.url}
        setUrl={model.setUrl}
        keyValue={model.keyValue}
        setKeyValue={model.setKeyValue}
        timeoutValue={model.timeoutValue}
        setTimeoutValue={model.setTimeoutValue}
        script={model.script}
        setScript={model.setScript}
        description={model.description}
        setDescription={model.setDescription}
      />
    </>
  );
}

export function LiveScripterAssignDrawerForm({
  pickedElement,
  model,
}: {
  pickedElement: NonNullable<Parameters<typeof LiveScripterPickedElementSummary>[0]['pickedElement']>;
  model: LiveScripterAssignDrawerModel;
}): React.JSX.Element {
  return (
    <>
      <LiveScripterPickedElementSummary pickedElement={pickedElement} />
      <LiveScripterAssignDrawerFields model={model} />
      <LiveScripterAppendAction
        errorMessage={model.errorMessage}
        isSavingRegistry={model.isSavingRegistry}
        onAppend={() => {
          model.handleAppend().catch(() => undefined);
        }}
      />
    </>
  );
}
