'use client';

import { useEffect, useMemo } from 'react';
import { StepFormHeader } from './StepFormHeader';
import { usePlaywrightStepSequencer } from '../../context/PlaywrightStepSequencerContext';
import { useStepFormState } from './useStepFormState';
import { StepFormInputs } from './StepFormInputs';
import { StepFormSelectorRegistry } from './StepFormSelectorRegistry';
import {
  Button, Dialog, DialogContent, DialogFooter, Input, Label, Separator, Textarea
} from '@/shared/ui/primitives.public';
import { type SelectorRegistryEntry } from '@/shared/contracts/integrations/selector-registry';
import {
  type PlaywrightStepInputBinding,
  type PlaywrightStepType,
} from '@/shared/contracts/playwright-steps';
import {
  inferSelectorRegistryNamespace,
  SELECTOR_REGISTRY_DEFAULT_PROFILES,
} from '@/shared/lib/browser-execution/selector-registry-metadata';
import { isSelectorRegistryEntryCompatibleWithStepField } from '@/shared/lib/browser-execution/selector-registry-roles';
import { StepFormScope } from './StepFormScope';
import { TagsInput } from './TagsInput';
import { type StepDraft, buildEmpty } from './step-form-utils';
import { StepFormAiConfig } from './StepFormAiConfig';

const SELECTOR_TYPES: readonly PlaywrightStepType[] = [
  'click',
  'fill',
  'select',
  'check',
  'uncheck',
  'hover',
  'wait_for_selector',
  'assert_text',
  'assert_visible',
  'scroll',
  'upload_file',
];
const VALUE_TYPES: readonly PlaywrightStepType[] = ['fill', 'select', 'upload_file', 'assert_text'];
const URL_TYPES: readonly PlaywrightStepType[] = ['navigate', 'assert_url'];
const TIMEOUT_TYPES: readonly PlaywrightStepType[] = ['wait_for_timeout', 'wait_for_selector'];
const SCRIPT_TYPES: readonly PlaywrightStepType[] = ['custom_script'];
const AI_EVALUATE_TYPES: readonly PlaywrightStepType[] = ['ai_evaluate'];
const AI_INJECT_TYPES: readonly PlaywrightStepType[] = ['ai_inject'];

export function StepFormModal(): React.JSX.Element | null {
  const {
    editingStep,
    handleCreateStep,
    handleUpdateStep,
    isSaving,
    websites,
    flows,
    setIsCreateStepOpen,
    setEditingStep,
  } = usePlaywrightStepSequencer();

  const {
    draft, setDraft,
    isOpen, isEditing,
    registryQuery,
    registrySelectorEntries,
    registryNamespacesForSelect,
    selectedRegistryNamespace,
    selectorBindingMode,
    selectorFallback,
  } = useStepFormState() as {
    draft: StepDraft;
    setDraft: React.Dispatch<React.SetStateAction<StepDraft>>;
    isOpen: boolean;
    isEditing: boolean;
    registryQuery: { data?: { profiles?: string[]; entries?: SelectorRegistryEntry[] } };
    registrySelectorEntries: SelectorRegistryEntry[];
    registryNamespacesForSelect: string[];
    selectedRegistryNamespace: string;
    selectorBindingMode: 'selectorRegistry' | 'disabled' | 'literal';
    selectorFallback: string;
  };

  // Sync draft when editing step changes
  useEffect(() => {
    if (editingStep != null) {
      setDraft(editingStep);
    } else {
      setDraft(buildEmpty());
    }
  }, [editingStep, setDraft]);

  const selectorBinding = draft.inputBindings?.['selector'];
  const selectedRegistryProfile = (draft.inputBindings?.['selector']?.selectorProfile ?? draft.selectorProfile ?? 
    SELECTOR_REGISTRY_DEFAULT_PROFILES[selectedRegistryNamespace as keyof typeof SELECTOR_REGISTRY_DEFAULT_PROFILES] ?? '');

  const registryProfiles = useMemo(
    () =>
      Array.from(
        new Set([selectedRegistryProfile, ...(registryQuery.data?.profiles ?? [])])
      ).sort(),
    [registryQuery.data?.profiles, selectedRegistryProfile]
  );

  const registryProfilesForSelect = useMemo(
    () =>
      registryProfiles.includes(selectedRegistryProfile)
        ? registryProfiles
        : [selectedRegistryProfile, ...registryProfiles],
    [registryProfiles, selectedRegistryProfile]
  );
  const selectedRegistryEntry = useMemo(
    () =>
      registrySelectorEntries.find(
        (entry) =>
          entry.key === draft.inputBindings?.['selector']?.selectorKey &&
          entry.profile === selectedRegistryProfile &&
          entry.namespace === selectedRegistryNamespace
      ) ??
      registrySelectorEntries.find(
        (entry) =>
          entry.key === draft.inputBindings?.['selector']?.selectorKey &&
          entry.namespace === selectedRegistryNamespace
      ) ??
      null,
    [registrySelectorEntries, selectedRegistryNamespace, selectedRegistryProfile, draft.inputBindings?.['selector']?.selectorKey]
  );
  const registryEntriesForProfile = useMemo(
    () =>
      registrySelectorEntries.filter(
        (entry): entry is SelectorRegistryEntry =>
          entry.namespace === selectedRegistryNamespace &&
          entry.profile === selectedRegistryProfile &&
          (isSelectorRegistryEntryCompatibleWithStepField(entry, draft.type ?? 'click') ||
            (entry.key === (selectorBinding?.selectorKey ?? null) &&
              entry.namespace === selectedRegistryNamespace &&
              entry.profile === selectedRegistryProfile))
      ),
    [
      draft.type,
      registrySelectorEntries,
      selectedRegistryNamespace,
      selectedRegistryProfile,
      selectorBinding?.selectorKey,
    ]
  );

  if (!isOpen) return null;

  const close = (): void => {
    setIsCreateStepOpen(false);
    setEditingStep(null);
  };

  const set = <K extends keyof StepDraft>(key: K, value: StepDraft[K]): void =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const setSelectorBinding = (updates: Partial<PlaywrightStepInputBinding>): void => {
    setDraft((prev) => {
      const existing = prev.inputBindings?.['selector'];
      const nextBinding: PlaywrightStepInputBinding = {
        mode: existing?.mode ?? 'literal',
        ...existing,
        ...updates,
      };
      return {
        ...prev,
        inputBindings: {
          ...(prev.inputBindings ?? {}),
          selector: nextBinding,
        },
      };
    });
  };

  const connectSelectorRegistryEntry = (entry: SelectorRegistryEntry): void => {
    const fallbackSelector = (entry.preview[0] ?? selectorFallback) || null;
    setDraft((prev) => ({
      ...prev,
      selector: fallbackSelector,
      selectorNamespace: entry.namespace,
      selectorKey: entry.key,
      selectorProfile: entry.profile,
      inputBindings: {
        ...(prev.inputBindings ?? {}),
        selector: {
          mode: 'selectorRegistry',
          selectorNamespace: entry.namespace,
          selectorKey: entry.key,
          selectorProfile: entry.profile,
          selectorRole: entry.role,
          fallbackSelector,
        },
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const name = draft.name?.trim();
    if (name == null || name === '' || draft.type == null) return;
    
    const inputBindings = getProcessedInputBindings(draft, selectedRegistryEntry);
    const selector = draft.selector?.trim() ?? null;

    const payload = {
      name,
      description: draft.description?.trim() ?? null,
      type: draft.type,
      selector,
      value: draft.value?.trim() ?? null,
      url: draft.url?.trim() ?? null,
      key: draft.key?.trim() ?? null,
      timeout: draft.timeout ?? null,
      script: draft.script?.trim() ?? null,
      inputBindings,
      websiteId: draft.websiteId ?? null,
      flowId: draft.flowId ?? null,
      tags: draft.tags ?? [],
      sortOrder: draft.sortOrder ?? 0,
      aiSystemPrompt: draft.aiSystemPrompt?.trim() ?? null,
      aiInputSource: draft.aiInputSource ?? null,
      aiGoal: draft.aiGoal?.trim() ?? null,
      aiMaxIterations: draft.aiMaxIterations ?? null,
      aiLoopEvaluatorInputSource: draft.aiLoopEvaluatorInputSource ?? null,
    };

    if (isEditing && editingStep != null) {
      await handleUpdateStep(editingStep.id, payload);
    } else {
      await handleCreateStep(payload);
    }
  };

function getProcessedInputBindings(
  draft: StepDraft,
  selectedRegistryEntry: SelectorRegistryEntry | null
): Record<string, PlaywrightStepInputBinding> {
  const inputBindings: Record<string, PlaywrightStepInputBinding> = {
    ...(draft.inputBindings ?? {}),
  };
  const selector = draft.selector?.trim() ?? null;

  if (SELECTOR_TYPES.includes(draft.type ?? 'click')) {
    const selectorBinding = inputBindings['selector'];
    if (selectorBinding?.mode === 'selectorRegistry') {
      const selectorNamespace = inferSelectorRegistryNamespace({
        namespace: selectorBinding.selectorNamespace ?? draft.selectorNamespace ?? null,
        selectorKey: selectorBinding.selectorKey ?? draft.selectorKey ?? null,
        selectorProfile: selectorBinding.selectorProfile ?? draft.selectorProfile ?? null,
      }) ?? 'tradera';
      inputBindings['selector'] = {
        mode: 'selectorRegistry',
        selectorNamespace,
        selectorKey: selectorBinding.selectorKey?.trim() ?? null,
        selectorProfile: selectorBinding.selectorProfile?.trim() ?? null,
        selectorRole: selectorBinding.selectorRole ?? selectedRegistryEntry?.role ?? null,
        fallbackSelector: selectorBinding.fallbackSelector?.trim() ?? selector,
      };
    } else if (selectorBinding?.mode === 'disabled') {
      inputBindings['selector'] = {
        mode: 'disabled',
        disabledReason: selectorBinding.disabledReason?.trim() ?? 'Selector intentionally disabled',
        fallbackSelector: selectorBinding.fallbackSelector?.trim() ?? selector,
      };
    } else {
      inputBindings['selector'] = {
        mode: 'literal',
        value: selector,
      };
    }
  } else {
    delete inputBindings['selector'];
  }
  return inputBindings;
}

  const stepType = draft.type ?? 'click';
  const showSelector = SELECTOR_TYPES.includes(stepType)
    || (AI_EVALUATE_TYPES.includes(stepType) && draft.aiInputSource === 'selector_text')
    || (AI_INJECT_TYPES.includes(stepType) && draft.aiLoopEvaluatorInputSource === 'selector_text');
  const showValue = VALUE_TYPES.includes(stepType);
  const showUrl = URL_TYPES.includes(stepType);
  const showTimeout = TIMEOUT_TYPES.includes(stepType);
  const showScript = SCRIPT_TYPES.includes(stepType);
  const showAiEvaluate = AI_EVALUATE_TYPES.includes(stepType);
  const showAiInject = AI_INJECT_TYPES.includes(stepType);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className='max-w-lg'>
        <StepFormHeader isEditing={isEditing} />

        <form onSubmit={(e) => void handleSubmit(e)} className='space-y-4'>
          <StepFormInputs draft={draft} set={set} />

          {/* Description */}
          <div className='space-y-1.5'>
            <Label htmlFor='step-desc'>Description</Label>
            <Textarea
              id='step-desc'
              value={draft.description ?? ''}
              onChange={(e) => set('description', e.target.value || null)}
              placeholder='What does this step do?'
              rows={2}
            />
          </div>

          {/* Type-specific parameters */}
          {showSelector && (
            <StepFormSelectorRegistry
              draft={draft}
              set={set}
              setSelectorBinding={setSelectorBinding}
              selectorBindingMode={selectorBindingMode}
              selectedRegistryNamespace={selectedRegistryNamespace}
              selectedRegistryProfile={selectedRegistryProfile as string}
              registryNamespacesForSelect={registryNamespacesForSelect}
              registryProfilesForSelect={registryProfilesForSelect}
              registrySelectorEntries={registrySelectorEntries}
              registryEntriesForProfile={registryEntriesForProfile}
              connectSelectorRegistryEntry={connectSelectorRegistryEntry}
            />
          )}

          <Separator />

          {showTimeout ? (
            <div className='space-y-1.5'>
              <Label htmlFor='step-timeout'>Timeout (ms)</Label>
              <Input
                id='step-timeout'
                type='number'
                min={0}
                value={draft.timeout ?? ''}
                onChange={(e) =>
                  set('timeout', e.target.value ? Number(e.target.value) : null)
                }
                placeholder='e.g. 5000'
              />
            </div>
          ) : null}

          {showScript ? (
            <div className='space-y-1.5'>
              <Label htmlFor='step-script'>Script</Label>
              <Textarea
                id='step-script'
                value={draft.script ?? ''}
                onChange={(e) => set('script', e.target.value || null)}
                placeholder='// Custom Playwright script…'
                rows={5}
                className='font-mono text-xs'
              />
            </div>
          ) : null}

          <StepFormAiConfig 
            draft={draft} 
            set={set} 
            showAiEvaluate={showAiEvaluate} 
            showAiInject={showAiInject} 
          />

          <Separator />

          <StepFormScope 
            draft={draft} 
            set={set} 
            websites={websites} 
            flows={flows} 
          />

          <TagsInput
            id='step-tags'
            label='Tags'
            value={draft.tags ?? []}
            onChange={(tags) => set('tags', tags)}
            placeholder='e.g. checkout, login…'
          />

          <DialogFooter>
            <Button type='button' variant='outline' onClick={close} disabled={isSaving}>
              Cancel
            </Button>
            <Button type='submit' disabled={isSaving || !draft.name?.trim()}>
              {isSaving ? 'Saving…' : isEditing ? 'Update Step' : 'Create Step'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
