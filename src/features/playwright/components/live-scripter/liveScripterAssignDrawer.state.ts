'use client';

import { useEffect, useState } from 'react';

import type { PlaywrightStepType } from '@/shared/contracts/playwright-steps';
import { SELECTOR_REGISTRY_DEFAULT_PROFILES } from '@/shared/lib/browser-execution/selector-registry-metadata';

import { buildDefaultStepName } from './liveScripterAssignDrawer.helpers';
import type { LiveScripterAssignDrawerOptions } from './liveScripterAssignDrawer.types';

export type LiveScripterAssignDrawerState = {
  stepType: PlaywrightStepType;
  setStepType: React.Dispatch<React.SetStateAction<PlaywrightStepType>>;
  stepName: string;
  setStepName: React.Dispatch<React.SetStateAction<string>>;
  description: string;
  setDescription: React.Dispatch<React.SetStateAction<string>>;
  selectedSelectorKey: string;
  setSelectedSelectorKey: React.Dispatch<React.SetStateAction<string>>;
  selectorBindingMode: 'literal' | 'selectorRegistry';
  setSelectorBindingMode: React.Dispatch<React.SetStateAction<'literal' | 'selectorRegistry'>>;
  registryNamespace: LiveScripterAssignDrawerOptions['initialRegistryNamespace'];
  setRegistryNamespace: React.Dispatch<
    React.SetStateAction<LiveScripterAssignDrawerOptions['initialRegistryNamespace']>
  >;
  registryProfile: string;
  setRegistryProfile: React.Dispatch<React.SetStateAction<string>>;
  registryEntryKey: string;
  setRegistryEntryKey: React.Dispatch<React.SetStateAction<string>>;
  saveToRegistry: boolean;
  setSaveToRegistry: React.Dispatch<React.SetStateAction<boolean>>;
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  url: string;
  setUrl: React.Dispatch<React.SetStateAction<string>>;
  keyValue: string;
  setKeyValue: React.Dispatch<React.SetStateAction<string>>;
  timeoutValue: string;
  setTimeoutValue: React.Dispatch<React.SetStateAction<string>>;
  script: string;
  setScript: React.Dispatch<React.SetStateAction<string>>;
  errorMessage: string | null;
  setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
};

export function useLiveScripterAssignDrawerState(
  initialRegistryNamespace: LiveScripterAssignDrawerOptions['initialRegistryNamespace']
): LiveScripterAssignDrawerState {
  const [stepType, setStepType] = useState<PlaywrightStepType>('click');
  const [stepName, setStepName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSelectorKey, setSelectedSelectorKey] = useState('');
  const [selectorBindingMode, setSelectorBindingMode] = useState<'literal' | 'selectorRegistry'>(
    'literal'
  );
  const [registryNamespace, setRegistryNamespace] = useState(initialRegistryNamespace);
  const [registryProfile, setRegistryProfile] = useState(
    SELECTOR_REGISTRY_DEFAULT_PROFILES[initialRegistryNamespace]
  );
  const [registryEntryKey, setRegistryEntryKey] = useState('');
  const [saveToRegistry, setSaveToRegistry] = useState(false);
  const [value, setValue] = useState('');
  const [url, setUrl] = useState('');
  const [keyValue, setKeyValue] = useState('');
  const [timeoutValue, setTimeoutValue] = useState('');
  const [script, setScript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return {
    stepType,
    setStepType,
    stepName,
    setStepName,
    description,
    setDescription,
    selectedSelectorKey,
    setSelectedSelectorKey,
    selectorBindingMode,
    setSelectorBindingMode,
    registryNamespace,
    setRegistryNamespace,
    registryProfile,
    setRegistryProfile,
    registryEntryKey,
    setRegistryEntryKey,
    saveToRegistry,
    setSaveToRegistry,
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
    errorMessage,
    setErrorMessage,
  };
}

export function useResetOnPickedElementChange({
  pickedElement,
  state,
}: {
  pickedElement: LiveScripterAssignDrawerOptions['pickedElement'];
  state: LiveScripterAssignDrawerState;
}): void {
  useEffect(() => {
    if (pickedElement === null) {
      return;
    }
    state.setStepType('click');
    state.setStepName(buildDefaultStepName('click', pickedElement));
    state.setDescription('');
    state.setSelectorBindingMode('literal');
    state.setSaveToRegistry(false);
    state.setValue('');
    state.setUrl('');
    state.setKeyValue('');
    state.setTimeoutValue('');
    state.setScript('');
    state.setErrorMessage(null);
  }, [
    pickedElement,
    state.setDescription,
    state.setErrorMessage,
    state.setKeyValue,
    state.setSaveToRegistry,
    state.setScript,
    state.setSelectorBindingMode,
    state.setStepName,
    state.setStepType,
    state.setTimeoutValue,
    state.setUrl,
    state.setValue,
  ]);
}

export function useAutoStepNameEffect({
  pickedElement,
  stepName,
  stepType,
  setStepName,
}: {
  pickedElement: LiveScripterAssignDrawerOptions['pickedElement'];
  stepName: string;
  stepType: PlaywrightStepType;
  setStepName: LiveScripterAssignDrawerState['setStepName'];
}): void {
  useEffect(() => {
    if (pickedElement === null || stepName.trim().length > 0) {
      return;
    }
    setStepName(buildDefaultStepName(stepType, pickedElement));
  }, [pickedElement, setStepName, stepName, stepType]);
}
