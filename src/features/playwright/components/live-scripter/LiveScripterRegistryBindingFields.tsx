'use client';

import Link from 'next/link';
import { Link2 } from 'lucide-react';

import type { SelectorRegistryNamespace } from '@/shared/contracts/integrations/selector-registry';
import {
  formatSelectorRegistryNamespaceLabel,
  getSelectorRegistryAdminHref,
} from '@/shared/lib/browser-execution/selector-registry-metadata';
import {
  formatSelectorRegistryRoleLabel,
  getCompatibleSelectorRolesForStepField,
} from '@/shared/lib/browser-execution/selector-registry-roles';
import {
  Button,
  Checkbox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/primitives.public';

import { WRITABLE_SELECTOR_NAMESPACES } from './liveScripterAssignDrawer.helpers';
import type { LiveScripterAssignDrawerModel } from './liveScripterAssignDrawer.types';

function LiveScripterRegistryNamespaceField({
  registryNamespace,
  setRegistryNamespace,
}: Pick<
  LiveScripterAssignDrawerModel,
  'registryNamespace' | 'setRegistryNamespace'
>): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor='live-scripter-registry-namespace'>Registry</Label>
      <Select
        value={registryNamespace}
        onValueChange={(value) => setRegistryNamespace(value as SelectorRegistryNamespace)}
      >
        <SelectTrigger id='live-scripter-registry-namespace'>
          <SelectValue placeholder='Choose registry' />
        </SelectTrigger>
        <SelectContent>
          {WRITABLE_SELECTOR_NAMESPACES.map((namespace) => (
            <SelectItem key={namespace} value={namespace}>
              {formatSelectorRegistryNamespaceLabel(namespace)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function LiveScripterRegistryProfileField({
  registryProfiles,
  effectiveRegistryProfile,
  setRegistryProfile,
}: Pick<
  LiveScripterAssignDrawerModel,
  'registryProfiles' | 'effectiveRegistryProfile' | 'setRegistryProfile'
>): React.JSX.Element {
  const profiles = registryProfiles.length > 0 ? registryProfiles : [effectiveRegistryProfile];
  return (
    <div className='space-y-2'>
      <Label htmlFor='live-scripter-registry-profile'>Profile</Label>
      <Select value={effectiveRegistryProfile} onValueChange={setRegistryProfile}>
        <SelectTrigger id='live-scripter-registry-profile'>
          <SelectValue placeholder='Choose profile' />
        </SelectTrigger>
        <SelectContent>
          {profiles.map((profile) => (
            <SelectItem key={profile} value={profile}>
              {profile}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function LiveScripterRegistryEntryField({
  entriesForProfile,
  registryEntryKey,
  setRegistryEntryKey,
}: Pick<
  LiveScripterAssignDrawerModel,
  'entriesForProfile' | 'registryEntryKey' | 'setRegistryEntryKey'
>): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor='live-scripter-registry-entry'>Registry entry</Label>
      <Select
        value={registryEntryKey}
        onValueChange={setRegistryEntryKey}
        disabled={entriesForProfile.length === 0}
      >
        <SelectTrigger id='live-scripter-registry-entry'>
          <SelectValue placeholder='Choose existing selector entry' />
        </SelectTrigger>
        <SelectContent>
          {entriesForProfile.map((entry) => (
            <SelectItem key={entry.key} value={entry.key}>
              {entry.key} {formatSelectorRegistryRoleLabel(entry.role) ? `(${formatSelectorRegistryRoleLabel(entry.role)})` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function LiveScripterRegistryOverrideToggle({
  saveToRegistry,
  setSaveToRegistry,
  selectedRegistryEntry,
}: Pick<
  LiveScripterAssignDrawerModel,
  'saveToRegistry' | 'setSaveToRegistry' | 'selectedRegistryEntry'
>): React.JSX.Element {
  return (
    <div className='flex items-start gap-2 rounded-md border border-dashed border-white/10 p-3'>
      <Checkbox
        id='live-scripter-registry-save'
        checked={saveToRegistry}
        onCheckedChange={(checked) => setSaveToRegistry(checked === true)}
        disabled={selectedRegistryEntry === null}
      />
      <div className='space-y-1'>
        <Label htmlFor='live-scripter-registry-save'>Save selector override</Label>
        <p className='text-xs text-muted-foreground'>
          Reuse the selected registry key and save the captured selector into the chosen profile.
        </p>
      </div>
    </div>
  );
}

function LiveScripterRegistryAdminLink({
  registryNamespace,
}: Pick<LiveScripterAssignDrawerModel, 'registryNamespace'>): React.JSX.Element {
  return (
    <Button asChild type='button' size='sm' variant='outline'>
      <Link href={getSelectorRegistryAdminHref(registryNamespace)}>
        <Link2 className='mr-2 size-4' />
        Open Registry
      </Link>
    </Button>
  );
}

export function LiveScripterRegistryBindingFields({
  registryNamespace,
  setRegistryNamespace,
  registryProfiles,
  effectiveRegistryProfile,
  setRegistryProfile,
  entriesForProfile,
  registryEntryKey,
  setRegistryEntryKey,
  saveToRegistry,
  setSaveToRegistry,
  selectedRegistryEntry,
  selectedRegistryEntryCompatible,
  stepType,
}: Pick<
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
  | 'selectedRegistryEntryCompatible'
  | 'stepType'
>): React.JSX.Element {
  const selectedRoleLabel = formatSelectorRegistryRoleLabel(selectedRegistryEntry?.role);
  const expectedRoleLabels = getCompatibleSelectorRolesForStepField(stepType).map(
    (role) => formatSelectorRegistryRoleLabel(role) ?? role
  );
  return (
    <div className='space-y-3 rounded-md border border-white/10 bg-black/20 p-3'>
      <div className='grid gap-3 sm:grid-cols-2'>
        <LiveScripterRegistryNamespaceField
          registryNamespace={registryNamespace}
          setRegistryNamespace={setRegistryNamespace}
        />
        <LiveScripterRegistryProfileField
          registryProfiles={registryProfiles}
          effectiveRegistryProfile={effectiveRegistryProfile}
          setRegistryProfile={setRegistryProfile}
        />
      </div>
      <LiveScripterRegistryEntryField
        entriesForProfile={entriesForProfile}
        registryEntryKey={registryEntryKey}
        setRegistryEntryKey={setRegistryEntryKey}
      />
      <LiveScripterRegistryOverrideToggle
        saveToRegistry={saveToRegistry}
        setSaveToRegistry={setSaveToRegistry}
        selectedRegistryEntry={selectedRegistryEntry}
      />
      {selectedRegistryEntry ? (
        <div
          className={
            selectedRegistryEntryCompatible
              ? 'rounded-md border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100'
              : 'rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100'
          }
        >
          Selected role: {selectedRoleLabel ?? selectedRegistryEntry.role}
          {!selectedRegistryEntryCompatible && expectedRoleLabels.length > 0
            ? ` • Expected for ${stepType}: ${expectedRoleLabels.join(', ')}`
            : ''}
        </div>
      ) : null}
      <LiveScripterRegistryAdminLink registryNamespace={registryNamespace} />
    </div>
  );
}
