'use client';

import { useSaveSelectorRegistryEntryMutation } from '@/features/integrations/hooks/useSelectorRegistry';

import {
  buildLiveScripterAppendInput,
  resolveLiveScripterRegistrySelector,
  validateLiveScripterAppendRequest,
} from './liveScripterAssignDrawer.append';
import {
  SELECTOR_STEP_TYPES,
  VALUE_STEP_TYPES,
} from './liveScripterAssignDrawer.helpers';
import { useLiveScripterAssignDrawerRegistryData } from './liveScripterAssignDrawer.registry';
import {
  useAutoStepNameEffect,
  useLiveScripterAssignDrawerState,
  useResetOnPickedElementChange,
  type LiveScripterAssignDrawerState,
} from './liveScripterAssignDrawer.state';
import type {
  LiveScripterAssignDrawerModel,
  LiveScripterAssignDrawerOptions,
} from './liveScripterAssignDrawer.types';
import { useLiveScripterStepAppender } from './useLiveScripterStepAppender';

function appendResolvedLiveScripterStep({
  state,
  registryData,
  selectorResolution,
  needsSelector,
  needsValue,
  websiteId,
  flowId,
  appendStep,
}: {
  state: LiveScripterAssignDrawerState;
  registryData: ReturnType<typeof useLiveScripterAssignDrawerRegistryData>;
  selectorResolution: Awaited<ReturnType<typeof resolveLiveScripterRegistrySelector>>;
  needsSelector: boolean;
  needsValue: boolean;
  websiteId: string | null;
  flowId: string | null;
  appendStep: ReturnType<typeof useLiveScripterStepAppender>;
}): void {
  appendStep(
    buildLiveScripterAppendInput({
      stepName: state.stepName,
      description: state.description,
      stepType: state.stepType,
      needsSelector,
      selectedSelector: registryData.selectedSelector,
      selectorBindingMode: state.selectorBindingMode,
      selectorResolution,
      needsValue,
      value: state.value,
      url: state.url,
      keyValue: state.keyValue,
      timeoutValue: state.timeoutValue,
      script: state.script,
      websiteId,
      flowId,
    })
  );
}

type LiveScripterAppendHandlerOptions = {
  pickedElement: LiveScripterAssignDrawerOptions['pickedElement'];
  state: LiveScripterAssignDrawerState;
  registryData: ReturnType<typeof useLiveScripterAssignDrawerRegistryData>;
  needsSelector: boolean;
  needsValue: boolean;
  websiteId: string | null;
  flowId: string | null;
  saveRegistryMutation: ReturnType<typeof useSaveSelectorRegistryEntryMutation>;
  appendStep: ReturnType<typeof useLiveScripterStepAppender>;
  onStepAppended: () => void;
};

function useLiveScripterAppendHandler({
  pickedElement,
  state,
  registryData,
  needsSelector,
  needsValue,
  websiteId,
  flowId,
  saveRegistryMutation,
  appendStep,
  onStepAppended,
}: LiveScripterAppendHandlerOptions): () => Promise<void> {
  return async (): Promise<void> => {
    const validationError = validateLiveScripterAppendRequest({
      hasPickedElement: pickedElement !== null,
      stepName: state.stepName,
      needsSelector,
      selectedSelector: registryData.selectedSelector,
      selectorBindingMode: state.selectorBindingMode,
      hasSelectedRegistryEntry: registryData.selectedRegistryEntry !== null,
    });
    if (validationError !== null) {
      state.setErrorMessage(validationError);
      return;
    }

    const selectorResolution = await resolveLiveScripterRegistrySelector({
      selectorBindingMode: state.selectorBindingMode,
      selectedRegistryEntry: registryData.selectedRegistryEntry,
      effectiveRegistryProfile: registryData.effectiveRegistryProfile,
      saveToRegistry: state.saveToRegistry,
      selectedSelector: registryData.selectedSelector,
      saveRegistryMutation,
    });
    if (selectorResolution.errorMessage !== null) {
      state.setErrorMessage(selectorResolution.errorMessage);
      return;
    }

    appendResolvedLiveScripterStep({
      state,
      registryData,
      selectorResolution,
      needsSelector,
      needsValue,
      websiteId,
      flowId,
      appendStep,
    });
    state.setErrorMessage(null);
    onStepAppended();
  };
}

export function useLiveScripterAssignDrawerModel({
  pickedElement,
  websiteId,
  flowId,
  initialRegistryNamespace,
  onStepAppended,
}: LiveScripterAssignDrawerOptions): LiveScripterAssignDrawerModel {
  const appendStep = useLiveScripterStepAppender();
  const saveRegistryMutation = useSaveSelectorRegistryEntryMutation();
  const state = useLiveScripterAssignDrawerState(initialRegistryNamespace);
  const registryData = useLiveScripterAssignDrawerRegistryData({
    pickedElement,
    selectedSelectorKey: state.selectedSelectorKey,
    setSelectedSelectorKey: state.setSelectedSelectorKey,
    registryNamespace: state.registryNamespace,
    registryProfile: state.registryProfile,
    setRegistryProfile: state.setRegistryProfile,
    registryEntryKey: state.registryEntryKey,
    setRegistryEntryKey: state.setRegistryEntryKey,
  });

  useResetOnPickedElementChange({ pickedElement, state });
  useAutoStepNameEffect({
    pickedElement,
    stepName: state.stepName,
    stepType: state.stepType,
    setStepName: state.setStepName,
  });

  const needsSelector = SELECTOR_STEP_TYPES.has(state.stepType);
  const needsValue = VALUE_STEP_TYPES.has(state.stepType);
  const handleAppend = useLiveScripterAppendHandler({
    pickedElement,
    state,
    registryData,
    needsSelector,
    needsValue,
    websiteId,
    flowId,
    saveRegistryMutation,
    appendStep,
    onStepAppended,
  });

  return {
    ...state,
    selectorCandidates: registryData.selectorCandidates,
    selectedSelector: registryData.selectedSelector,
    registryProfiles: registryData.registryProfiles,
    effectiveRegistryProfile: registryData.effectiveRegistryProfile,
    entriesForProfile: registryData.entriesForProfile,
    selectedRegistryEntry: registryData.selectedRegistryEntry,
    needsSelector,
    needsValue,
    isSavingRegistry: saveRegistryMutation.isPending,
    handleAppend,
  };
}
