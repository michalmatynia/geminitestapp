
import React from 'react';
import { 
  Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input
} from '@/shared/ui/primitives.public';
import { type StepDraft } from './step-form-utils';
import { 
  type PlaywrightStepInputBinding, 
  type PlaywrightStepInputBindingMode,
} from '@/shared/contracts/playwright-steps';
import { type SelectorRegistryNamespace } from '@/shared/contracts/integrations/selector-registry';
import { SELECTOR_REGISTRY_DEFAULT_PROFILES } from '@/shared/lib/browser-execution/selector-registry-metadata';
import { formatSelectorRegistryNamespaceLabel } from '@/shared/lib/browser-execution/selector-registry-metadata';
import { formatSelectorRegistryRoleLabel } from '@/shared/lib/browser-execution/selector-registry-roles';

import { type SelectorRegistryEntry } from '@/shared/contracts/integrations/selector-registry';

interface StepFormSelectorRegistryProps {
  draft: StepDraft;
  set: <K extends keyof StepDraft>(key: K, value: StepDraft[K]) => void;
  setSelectorBinding: (updates: Partial<PlaywrightStepInputBinding>) => void;
  selectorBindingMode: PlaywrightStepInputBindingMode;
  selectedRegistryNamespace: string;
  selectedRegistryProfile: string;
  registryNamespacesForSelect: string[];
  registryProfilesForSelect: string[];
  registrySelectorEntries: SelectorRegistryEntry[];
  registryEntriesForProfile: SelectorRegistryEntry[];
  connectSelectorRegistryEntry: (entry: SelectorRegistryEntry) => void;
}

export function StepFormSelectorRegistry({
  draft,
  set,
  setSelectorBinding,
  selectorBindingMode,
  selectedRegistryNamespace,
  selectedRegistryProfile,
  registryNamespacesForSelect,
  registryProfilesForSelect,
  registrySelectorEntries,
  registryEntriesForProfile,
  connectSelectorRegistryEntry,
}: StepFormSelectorRegistryProps): React.JSX.Element {
  const selectorBinding = draft.inputBindings?.['selector'];

  return (
    <div className='space-y-3 rounded border border-border/50 bg-card/20 p-3'>
      <div className='space-y-1.5'>
        <Label>Selector binding</Label>
        <Select
          value={selectorBindingMode}
          onValueChange={(value) => {
            const mode = value as PlaywrightStepInputBindingMode;
            if (mode === 'selectorRegistry') {
              setSelectorBinding({
                mode,
                selectorNamespace: selectedRegistryNamespace,
                selectorProfile: selectedRegistryProfile,
                fallbackSelector: draft.selector ?? null,
              });
              return;
            }
            if (mode === 'disabled') {
              setSelectorBinding({
                mode,
                disabledReason: 'Selector intentionally disabled',
                fallbackSelector: draft.selector ?? null,
              });
              return;
            }
            setSelectorBinding({
              mode: 'literal',
              value: draft.selector ?? null,
            });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='literal'>Literal/local selector</SelectItem>
            <SelectItem value='selectorRegistry'>Selector registry</SelectItem>
            <SelectItem value='disabled'>Disabled selector</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectorBindingMode === 'selectorRegistry' && (
        <div className='space-y-3'>
          <div className='grid gap-3 sm:grid-cols-3'>
            <div className='space-y-1.5'>
              <Label>Registry namespace</Label>
              <Select
                value={selectedRegistryNamespace}
                onValueChange={(namespace) => {
                  const nextNamespace = namespace as SelectorRegistryNamespace;
                  const nextProfile = SELECTOR_REGISTRY_DEFAULT_PROFILES[nextNamespace];
                  setSelectorBinding({
                    mode: 'selectorRegistry',
                    selectorNamespace: nextNamespace,
                    selectorProfile: nextProfile,
                    selectorKey: null,
                    selectorRole: null,
                    fallbackSelector: draft.selector ?? null,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Namespace' />
                </SelectTrigger>
                <SelectContent>
                  {registryNamespacesForSelect.map((entryNamespace) => (
                    <SelectItem key={entryNamespace} value={entryNamespace}>
                      {formatSelectorRegistryNamespaceLabel(entryNamespace)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1.5'>
              <Label>Registry profile</Label>
              <Select
                value={selectedRegistryProfile}
                onValueChange={(profile) => {
                  const entry = registrySelectorEntries.find(
                    (candidate) =>
                      candidate.namespace === selectedRegistryNamespace &&
                      candidate.profile === profile &&
                      candidate.key === selectorBinding?.selectorKey
                  );
                  setSelectorBinding({
                    mode: 'selectorRegistry',
                    selectorNamespace: selectedRegistryNamespace,
                    selectorProfile: profile,
                    selectorRole: entry?.role ?? null,
                    ...(entry?.preview[0] ? { fallbackSelector: entry.preview[0] } : {}),
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select profile' />
                </SelectTrigger>
                <SelectContent>
                  {registryProfilesForSelect.length === 0 ? (
                    <SelectItem value={SELECTOR_REGISTRY_DEFAULT_PROFILES[selectedRegistryNamespace as keyof typeof SELECTOR_REGISTRY_DEFAULT_PROFILES]}>
                      {SELECTOR_REGISTRY_DEFAULT_PROFILES[selectedRegistryNamespace as keyof typeof SELECTOR_REGISTRY_DEFAULT_PROFILES]}
                    </SelectItem>
                  ) : (
                    registryProfilesForSelect.map((profile) => (
                      <SelectItem key={profile} value={profile}>
                        {profile}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1.5'>
              <Label>Registry entry</Label>
              <Select
                value={selectorBinding?.selectorKey ?? '__manual__'}
                onValueChange={(entryId) => {
                  const entry = registrySelectorEntries.find(
                    (candidate) => candidate.id === entryId
                  );
                  if (entry) connectSelectorRegistryEntry(entry);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Choose selector entry' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__manual__'>Manual registry key</SelectItem>
                  {registryEntriesForProfile.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.group} / {entry.key}
                      {formatSelectorRegistryRoleLabel(entry.role)
                        ? ` (${formatSelectorRegistryRoleLabel(entry.role)})`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='step-selector-key'>Registry selector key</Label>
            <Input
              id='step-selector-key'
              value={selectorBinding?.selectorKey ?? ''}
              onChange={(e) => setSelectorBinding({ selectorKey: e.target.value })}
              placeholder='Enter registry key'
            />
          </div>
        </div>
      )}
    </div>
  );
}
