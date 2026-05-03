'use client';

import type {
  SelectorRegistryEntry,
  SelectorRegistryNamespace,
} from '@/shared/contracts/integrations/selector-registry';
import type { LiveScripterPickedElement } from '@/shared/contracts/playwright-live-scripter';
import type { PlaywrightStepType } from '@/shared/contracts/playwright-steps';

import type { LiveScripterSelectorCandidate } from './liveScripterAssignDrawer.helpers';

export type LiveScripterAssignDrawerOptions = {
  pickedElement: LiveScripterPickedElement | null;
  websiteId: string | null;
  flowId: string | null;
  initialRegistryNamespace: SelectorRegistryNamespace;
  onStepAppended: () => void;
};

export type LiveScripterAssignDrawerModel = {
  stepType: PlaywrightStepType;
  setStepType: (value: PlaywrightStepType) => void;
  stepName: string;
  setStepName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  selectorCandidates: LiveScripterSelectorCandidate[];
  selectedSelectorKey: string;
  setSelectedSelectorKey: (value: string) => void;
  selectedSelector: string | null;
  selectorBindingMode: 'literal' | 'selectorRegistry';
  setSelectorBindingMode: (value: 'literal' | 'selectorRegistry') => void;
  registryNamespace: SelectorRegistryNamespace;
  setRegistryNamespace: (value: SelectorRegistryNamespace) => void;
  registryProfiles: string[];
  effectiveRegistryProfile: string;
  setRegistryProfile: (value: string) => void;
  entriesForProfile: SelectorRegistryEntry[];
  registryEntryKey: string;
  setRegistryEntryKey: (value: string) => void;
  selectedRegistryEntry: SelectorRegistryEntry | null;
  selectedRegistryEntryCompatible: boolean;
  saveToRegistry: boolean;
  setSaveToRegistry: (value: boolean) => void;
  value: string;
  setValue: (value: string) => void;
  url: string;
  setUrl: (value: string) => void;
  keyValue: string;
  setKeyValue: (value: string) => void;
  timeoutValue: string;
  setTimeoutValue: (value: string) => void;
  script: string;
  setScript: (value: string) => void;
  errorMessage: string | null;
  needsSelector: boolean;
  needsValue: boolean;
  isSavingRegistry: boolean;
  handleAppend: () => Promise<void>;
};

export type LiveScripterSelectorResolution = {
  selectorNamespace: SelectorRegistryNamespace | null;
  selectorKey: string | null;
  selectorProfile: string | null;
  selectorRole: SelectorRegistryEntry['role'] | null;
  errorMessage: string | null;
};
