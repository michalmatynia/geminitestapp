'use client';

import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/primitives.public';

import type { LiveScripterSelectorCandidate } from './liveScripterAssignDrawer.helpers';
import type { LiveScripterAssignDrawerModel } from './liveScripterAssignDrawer.types';
import { LiveScripterRegistryBindingFields } from './LiveScripterRegistryBindingFields';

type SelectorBindingMode = 'literal' | 'selectorRegistry';

type RegistryBindingProps = Pick<
  LiveScripterAssignDrawerModel,
  | 'registryNamespace'
  | 'setRegistryNamespace'
  | 'registryProfiles'
  | 'effectiveRegistryProfile'
  | 'setRegistryProfile'
  | 'entriesForProfile'
  | 'registryEntryKey'
  | 'setRegistryEntryKey'
  | 'saveToRegistry'
  | 'setSaveToRegistry'
  | 'selectedRegistryEntry'
>;

function LiveScripterCapturedSelectorField({
  selectorCandidates,
  selectedSelectorKey,
  setSelectedSelectorKey,
  selectedSelector,
}: {
  selectorCandidates: LiveScripterSelectorCandidate[];
  selectedSelectorKey: string;
  setSelectedSelectorKey: (value: string) => void;
  selectedSelector: string | null;
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor='live-scripter-selector-candidate'>Captured selector</Label>
      <Select
        value={selectedSelectorKey}
        onValueChange={setSelectedSelectorKey}
        disabled={selectorCandidates.length === 0}
      >
        <SelectTrigger id='live-scripter-selector-candidate'>
          <SelectValue placeholder='Choose selector candidate' />
        </SelectTrigger>
        <SelectContent>
          {selectorCandidates.map((candidate) => (
            <SelectItem key={candidate.key} value={candidate.key}>
              {candidate.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {typeof selectedSelector === 'string' && selectedSelector.length > 0 ? (
        <div className='rounded-md border border-white/10 bg-black/20 p-2 text-xs text-muted-foreground'>
          {selectedSelector}
        </div>
      ) : null}
    </div>
  );
}

function LiveScripterBindingModeField({
  selectorBindingMode,
  setSelectorBindingMode,
}: {
  selectorBindingMode: SelectorBindingMode;
  setSelectorBindingMode: (value: SelectorBindingMode) => void;
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor='live-scripter-binding-mode'>Selector binding</Label>
      <Select
        value={selectorBindingMode}
        onValueChange={(value) => setSelectorBindingMode(value as SelectorBindingMode)}
      >
        <SelectTrigger id='live-scripter-binding-mode'>
          <SelectValue placeholder='Choose binding mode' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='literal'>Literal selector</SelectItem>
          <SelectItem value='selectorRegistry'>Selector registry binding</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

type LiveScripterSelectorBindingFieldsProps = {
  needsSelector: boolean;
  selectorCandidates: LiveScripterSelectorCandidate[];
  selectedSelectorKey: string;
  setSelectedSelectorKey: (value: string) => void;
  selectedSelector: string | null;
  selectorBindingMode: SelectorBindingMode;
  setSelectorBindingMode: (value: SelectorBindingMode) => void;
} & RegistryBindingProps;

export function LiveScripterSelectorBindingFields({
  needsSelector,
  selectorCandidates,
  selectedSelectorKey,
  setSelectedSelectorKey,
  selectedSelector,
  selectorBindingMode,
  setSelectorBindingMode,
  ...registryBindingProps
}: LiveScripterSelectorBindingFieldsProps): React.JSX.Element | null {
  if (!needsSelector) {
    return null;
  }

  return (
    <>
      <LiveScripterCapturedSelectorField
        selectorCandidates={selectorCandidates}
        selectedSelectorKey={selectedSelectorKey}
        setSelectedSelectorKey={setSelectedSelectorKey}
        selectedSelector={selectedSelector}
      />
      <LiveScripterBindingModeField
        selectorBindingMode={selectorBindingMode}
        setSelectorBindingMode={setSelectorBindingMode}
      />
      {selectorBindingMode === 'selectorRegistry' ? (
        <LiveScripterRegistryBindingFields {...registryBindingProps} />
      ) : null}
    </>
  );
}
