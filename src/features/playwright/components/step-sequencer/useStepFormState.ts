
import { useState, useMemo } from 'react';
import { useSelectorRegistry } from '@/features/integrations/hooks/useSelectorRegistry';
import { 
  inferSelectorRegistryNamespace, 
  SELECTOR_REGISTRY_DEFAULT_PROFILES, 
  SELECTOR_REGISTRY_NAMESPACES 
} from '@/shared/lib/browser-execution/selector-registry-metadata';
import { usePlaywrightStepSequencer, type PlaywrightStepSequencerContextType } from '../../context/PlaywrightStepSequencerContext';
import { type StepDraft, buildEmpty } from './step-form-utils';
import { type SelectorRegistryEntry } from '@/shared/contracts/integrations/selector-registry';

export function useStepFormState(): {
  draft: StepDraft;
  setDraft: React.Dispatch<React.SetStateAction<StepDraft>>;
  isOpen: boolean;
  isEditing: boolean;
  registryQuery: any; // Ideally typed from hook
  registrySelectorEntries: SelectorRegistryEntry[];
  registryNamespacesForSelect: string[];
  selectedRegistryNamespace: string;
  selectorBindingMode: 'selectorRegistry' | 'disabled' | 'literal';
  selectorFallback: string;
  registrySaveMessage: string | null;
  setRegistrySaveMessage: React.Dispatch<React.SetStateAction<string | null>>;
  registrySaveError: string | null;
  setRegistrySaveError: React.Dispatch<React.SetStateAction<string | null>>;
} {
  const { isCreateStepOpen, editingStep } = usePlaywrightStepSequencer();
  const [draft, setDraft] = useState<StepDraft>(buildEmpty);
  const [registrySaveMessage, setRegistrySaveMessage] = useState<string | null>(null);
  const [registrySaveError, setRegistrySaveError] = useState<string | null>(null);

  const selectorBinding = draft.inputBindings?.['selector'];
  const selectorBindingMode = (selectorBinding?.mode === 'selectorRegistry' || selectorBinding?.mode === 'disabled')
      ? selectorBinding.mode
      : 'literal';
  const selectorFallback = selectorBinding?.fallbackSelector ?? draft.selector ?? '';
  
  const selectedRegistryNamespace = inferSelectorRegistryNamespace({
    namespace: selectorBinding?.selectorNamespace ?? draft.selectorNamespace ?? null,
    selectorKey: selectorBinding?.selectorKey ?? draft.selectorKey ?? null,
    selectorProfile: selectorBinding?.selectorProfile ?? draft.selectorProfile ?? null,
  }) ?? 'tradera';

  const selectedRegistryProfile = selectorBinding?.selectorProfile ?? 
    draft.selectorProfile ?? 
    (SELECTOR_REGISTRY_DEFAULT_PROFILES[selectedRegistryNamespace] ?? '');

  const registryQuery = useSelectorRegistry({
    namespace: selectedRegistryNamespace,
    profile: selectedRegistryProfile,
    effective: true,
  });

  const registrySelectorEntries = useMemo(
    () => (Array.isArray(registryQuery.data?.entries) ? (registryQuery.data.entries) : [])
        .filter((entry) => entry.kind === 'selectors' || entry.kind === 'selector')
        .sort((left, right) => 
          `${left.namespace}:${left.profile}:${left.group}:${left.key}`.localeCompare(
            `${right.namespace}:${right.profile}:${right.group}:${right.key}`
          )),
    [registryQuery.data?.entries]
  );

  const registryNamespacesForSelect = useMemo(
    () => SELECTOR_REGISTRY_NAMESPACES.includes(selectedRegistryNamespace as any)
        ? SELECTOR_REGISTRY_NAMESPACES
        : [selectedRegistryNamespace, ...SELECTOR_REGISTRY_NAMESPACES],
    [selectedRegistryNamespace]
  );

  return {
    draft, setDraft,
    isOpen: isCreateStepOpen || editingStep != null,
    isEditing: editingStep != null,
    registryQuery,
    registrySelectorEntries,
    registryNamespacesForSelect,
    selectedRegistryNamespace,
    selectorBindingMode,
    selectorFallback,
    registrySaveMessage, setRegistrySaveMessage,
    registrySaveError, setRegistrySaveError,
  };
}
