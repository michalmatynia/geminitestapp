'use client';

import type { SelectorRegistryEntry } from '@/shared/contracts/integrations/selector-registry';
import type { PlaywrightStepType } from '@/shared/contracts/playwright-steps';

import type { useSaveSelectorRegistryEntryMutation } from '@/features/integrations/hooks/useSelectorRegistry';

import { buildRegistryOverrideValueJson, parsePositiveTimeout } from './liveScripterAssignDrawer.helpers';
import type { LiveScripterSelectorResolution } from './liveScripterAssignDrawer.types';
import type { AppendLiveScripterStepInput } from './useLiveScripterStepAppender';

type ResolveSelectorOptions = {
  selectorBindingMode: 'literal' | 'selectorRegistry';
  selectedRegistryEntry: SelectorRegistryEntry | null;
  effectiveRegistryProfile: string;
  saveToRegistry: boolean;
  selectedSelector: string | null;
  saveRegistryMutation: ReturnType<typeof useSaveSelectorRegistryEntryMutation>;
};

type ValidateAppendOptions = {
  hasPickedElement: boolean;
  stepName: string;
  needsSelector: boolean;
  selectedSelector: string | null;
  selectorBindingMode: 'literal' | 'selectorRegistry';
  hasSelectedRegistryEntry: boolean;
};

type BuildStepInputOptions = {
  stepName: string;
  description: string;
  stepType: PlaywrightStepType;
  needsSelector: boolean;
  selectedSelector: string | null;
  selectorBindingMode: 'literal' | 'selectorRegistry';
  selectorResolution: LiveScripterSelectorResolution;
  needsValue: boolean;
  value: string;
  url: string;
  keyValue: string;
  timeoutValue: string;
  script: string;
  websiteId: string | null;
  flowId: string | null;
};

export const validateLiveScripterAppendRequest = ({
  hasPickedElement,
  stepName,
  needsSelector,
  selectedSelector,
  selectorBindingMode,
  hasSelectedRegistryEntry,
}: ValidateAppendOptions): string | null => {
  if (!hasPickedElement) {
    return 'No picked element available.';
  }
  if (stepName.trim().length === 0) {
    return 'Step name is required.';
  }
  if (needsSelector && selectedSelector === null) {
    return 'Pick a selector candidate before appending the step.';
  }
  if (selectorBindingMode === 'selectorRegistry' && !hasSelectedRegistryEntry) {
    return 'Choose an existing selector registry entry.';
  }
  return null;
};

export const resolveLiveScripterRegistrySelector = async ({
  selectorBindingMode,
  selectedRegistryEntry,
  effectiveRegistryProfile,
  saveToRegistry,
  selectedSelector,
  saveRegistryMutation,
}: ResolveSelectorOptions): Promise<LiveScripterSelectorResolution> => {
  if (selectorBindingMode !== 'selectorRegistry' || selectedRegistryEntry === null) {
    return {
      selectorNamespace: null,
      selectorKey: null,
      selectorProfile: null,
      errorMessage: null,
    };
  }

  const selectorNamespace = selectedRegistryEntry.namespace;
  const selectorKey = selectedRegistryEntry.key;
  const selectorProfile = effectiveRegistryProfile;

  if (!saveToRegistry) {
    return { selectorNamespace, selectorKey, selectorProfile, errorMessage: null };
  }

  const valueJson = buildRegistryOverrideJson(selectedRegistryEntry, selectedSelector);
  if (valueJson === null) {
    return {
      selectorNamespace: null,
      selectorKey: null,
      selectorProfile: null,
      errorMessage: 'The selected registry entry cannot be overridden from a single selector.',
    };
  }

  const result = await saveRegistryMutation.mutateAsync({
    namespace: selectorNamespace,
    profile: selectorProfile,
    key: selectorKey,
    valueJson,
  });
  return {
    selectorNamespace: result.namespace,
    selectorKey: result.key,
    selectorProfile: result.profile,
    errorMessage: null,
  };
};

const buildRegistryOverrideJson = (
  selectedRegistryEntry: SelectorRegistryEntry,
  selectedSelector: string | null
): string | null => {
  if (selectedSelector === null) {
    return null;
  }
  return buildRegistryOverrideValueJson(selectedRegistryEntry, selectedSelector);
};

const resolveStepUrl = (stepType: PlaywrightStepType, url: string): string | null =>
  stepType === 'navigate' || stepType === 'assert_url' ? url : null;

const resolveStepKey = (stepType: PlaywrightStepType, keyValue: string): string | null =>
  stepType === 'press_key' ? keyValue : null;

const resolveStepTimeout = (
  stepType: PlaywrightStepType,
  timeoutValue: string
): number | null =>
  stepType === 'wait_for_timeout' || stepType === 'wait_for_selector'
    ? parsePositiveTimeout(timeoutValue)
    : null;

const resolveStepScript = (
  stepType: PlaywrightStepType,
  script: string
): string | null => (stepType === 'custom_script' ? script : null);

export const buildLiveScripterAppendInput = ({
  stepName,
  description,
  stepType,
  needsSelector,
  selectedSelector,
  selectorBindingMode,
  selectorResolution,
  needsValue,
  value,
  url,
  keyValue,
  timeoutValue,
  script,
  websiteId,
  flowId,
}: BuildStepInputOptions): AppendLiveScripterStepInput => ({
  name: stepName.trim(),
  description,
  type: stepType,
  selector: needsSelector ? selectedSelector : null,
  selectorBindingMode,
  selectorNamespace: selectorResolution.selectorNamespace,
  selectorKey: selectorResolution.selectorKey,
  selectorProfile: selectorResolution.selectorProfile,
  value: needsValue ? value : null,
  url: resolveStepUrl(stepType, url),
  key: resolveStepKey(stepType, keyValue),
  timeout: resolveStepTimeout(stepType, timeoutValue),
  script: resolveStepScript(stepType, script),
  websiteId,
  flowId,
});
