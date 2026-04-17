'use client';

import { useEffect, useMemo } from 'react';

import { useSelectorRegistry } from '@/features/integrations/hooks/useSelectorRegistry';
import type { SelectorRegistryNamespace } from '@/shared/contracts/integrations/selector-registry';
import { SELECTOR_REGISTRY_DEFAULT_PROFILES } from '@/shared/lib/browser-execution/selector-registry-metadata';

import { buildSelectorCandidates } from './liveScripterAssignDrawer.helpers';

type Options = {
  pickedElement: Parameters<typeof buildSelectorCandidates>[0] | null;
  selectedSelectorKey: string;
  setSelectedSelectorKey: React.Dispatch<React.SetStateAction<string>>;
  registryNamespace: SelectorRegistryNamespace;
  registryProfile: string;
  setRegistryProfile: React.Dispatch<React.SetStateAction<string>>;
  registryEntryKey: string;
  setRegistryEntryKey: React.Dispatch<React.SetStateAction<string>>;
};

type LiveScripterAssignDrawerRegistryData = {
  selectorCandidates: ReturnType<typeof buildSelectorCandidates>;
  selectedSelector: string | null;
  registryProfiles: string[];
  effectiveRegistryProfile: string;
  entriesForProfile: NonNullable<ReturnType<typeof useSelectorRegistry>['data']>['entries'];
  selectedRegistryEntry: NonNullable<ReturnType<typeof useSelectorRegistry>['data']>['entries'][number] | null;
  isSavingRegistryEntriesLoading: boolean;
};

const chooseExistingOrFirst = (current: string, options: string[]): string => {
  if (options.length === 0) {
    return '';
  }
  return options.includes(current) ? current : options[0] ?? '';
};

function useRegistryProfileResetEffect({
  registryNamespace,
  setRegistryProfile,
}: Pick<Options, 'registryNamespace' | 'setRegistryProfile'>): void {
  useEffect(() => {
    setRegistryProfile(SELECTOR_REGISTRY_DEFAULT_PROFILES[registryNamespace]);
  }, [registryNamespace, setRegistryProfile]);
}

function useRegistryEntrySelectionEffect({
  entriesForProfile,
  setRegistryEntryKey,
}: {
  entriesForProfile: LiveScripterAssignDrawerRegistryData['entriesForProfile'];
  setRegistryEntryKey: Options['setRegistryEntryKey'];
}): void {
  useEffect(() => {
    const entryKeys = entriesForProfile.map((entry) => entry.key);
    setRegistryEntryKey((current) => chooseExistingOrFirst(current, entryKeys));
  }, [entriesForProfile, setRegistryEntryKey]);
}

function useSelectorCandidateSelectionEffect({
  selectedSelectorKey,
  selectorCandidates,
  setSelectedSelectorKey,
}: Pick<Options, 'selectedSelectorKey' | 'setSelectedSelectorKey'> & {
  selectorCandidates: ReturnType<typeof buildSelectorCandidates>;
}): void {
  useEffect(() => {
    const selectorKeys = selectorCandidates.map((candidate) => candidate.key);
    setSelectedSelectorKey(() => chooseExistingOrFirst(selectedSelectorKey, selectorKeys));
  }, [selectedSelectorKey, selectorCandidates, setSelectedSelectorKey]);
}

function useResolvedRegistryData({
  registryNamespace,
  registryProfile,
  registryQueryEntries,
  registryEntryKey,
}: {
  registryNamespace: Options['registryNamespace'];
  registryProfile: Options['registryProfile'];
  registryQueryEntries: NonNullable<ReturnType<typeof useSelectorRegistry>['data']>['entries'];
  registryEntryKey: Options['registryEntryKey'];
}): Omit<LiveScripterAssignDrawerRegistryData, 'selectorCandidates' | 'selectedSelector' | 'isSavingRegistryEntriesLoading'> {
  const selectorRegistryEntries = useMemo(
    () =>
      registryQueryEntries.filter(
        (entry) =>
          entry.namespace === registryNamespace &&
          (entry.kind === 'selector' || entry.kind === 'selectors')
      ),
    [registryNamespace, registryQueryEntries]
  );
  const registryProfiles = useMemo(
    () => Array.from(new Set(selectorRegistryEntries.map((entry) => entry.profile))).sort(),
    [selectorRegistryEntries]
  );
  const effectiveRegistryProfile = useMemo(() => {
    if (registryProfiles.includes(registryProfile)) {
      return registryProfile;
    }
    return registryProfiles[0] ?? SELECTOR_REGISTRY_DEFAULT_PROFILES[registryNamespace];
  }, [registryProfile, registryProfiles, registryNamespace]);
  const entriesForProfile = useMemo(
    () => selectorRegistryEntries.filter((entry) => entry.profile === effectiveRegistryProfile),
    [effectiveRegistryProfile, selectorRegistryEntries]
  );
  const selectedRegistryEntry =
    entriesForProfile.find((entry) => entry.key === registryEntryKey) ?? null;

  return {
    registryProfiles,
    effectiveRegistryProfile,
    entriesForProfile,
    selectedRegistryEntry,
  };
}

export function useLiveScripterAssignDrawerRegistryData({
  pickedElement,
  selectedSelectorKey,
  setSelectedSelectorKey,
  registryNamespace,
  registryProfile,
  setRegistryProfile,
  registryEntryKey,
  setRegistryEntryKey,
}: Options): LiveScripterAssignDrawerRegistryData {
  const registryQuery = useSelectorRegistry({
    namespace: registryNamespace,
    profile: registryProfile,
    effective: true,
  });

  const selectorCandidates = useMemo(
    () => (pickedElement === null ? [] : buildSelectorCandidates(pickedElement)),
    [pickedElement]
  );
  const selectedSelector =
    selectorCandidates.find((candidate) => candidate.key === selectedSelectorKey)?.value ?? null;
  const resolvedRegistryData = useResolvedRegistryData({
    registryNamespace,
    registryProfile,
    registryQueryEntries: registryQuery.data?.entries ?? [],
    registryEntryKey,
  });

  useRegistryProfileResetEffect({ registryNamespace, setRegistryProfile });
  useRegistryEntrySelectionEffect({
    entriesForProfile: resolvedRegistryData.entriesForProfile,
    setRegistryEntryKey,
  });
  useSelectorCandidateSelectionEffect({
    selectedSelectorKey,
    selectorCandidates,
    setSelectedSelectorKey,
  });

  return {
    selectorCandidates,
    selectedSelector,
    ...resolvedRegistryData,
    isSavingRegistryEntriesLoading: registryQuery.isLoading,
  };
}
