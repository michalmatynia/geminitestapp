'use client';

import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import type { ProductScrapeProfileRunResponse } from '@/shared/contracts/products/scrape-profiles';

import {
  resolvePreferredProfileId,
  resolveProfileLimitInput,
} from './ProductScrapeProfilesModal.controller.helpers';
import type { ProductScrapeProfileQueries } from './ProductScrapeProfilesModal.controller.types';
import {
  getStoredProfileSettings,
  type ProductScrapeProfileStoredSettings,
} from './ProductScrapeProfilesModal.storage';

type SelectionEffectsInput = Pick<
  ProductScrapeProfileQueries,
  'profiles' | 'selectedProfile' | 'draftTemplates'
> & {
  draftTemplateId: string;
  draftTemplatesReady: boolean;
  isOpen: boolean;
  setDraftTemplateId: (value: string) => void;
  setDryRun: (value: boolean) => void;
  setLimitInput: (value: string) => void;
  setProfileId: Dispatch<SetStateAction<string>>;
  setResult: (result: ProductScrapeProfileRunResponse | null) => void;
  setSettingsProfileId: (value: string) => void;
  storedSettingsRef: MutableRefObject<ProductScrapeProfileStoredSettings>;
};

type PersistSettingsInput = Pick<ProductScrapeProfileQueries, 'selectedProfile'> & {
  draftTemplateId: string;
  dryRun: boolean;
  isOpen: boolean;
  limitInput: string;
  settingsProfileId: string;
  storedSettingsRef: MutableRefObject<ProductScrapeProfileStoredSettings>;
  updateStoredSettings: (settings: ProductScrapeProfileStoredSettings) => void;
};

const useInitialProfileEffect = ({
  isOpen,
  profiles,
  setProfileId,
  storedSettingsRef,
}: Pick<
  SelectionEffectsInput,
  'isOpen' | 'profiles' | 'setProfileId' | 'storedSettingsRef'
>): void => {
  useEffect(() => {
    if (isOpen !== true || profiles.length === 0) return;
    const savedProfileId = storedSettingsRef.current.selectedProfileId;
    setProfileId((current) => resolvePreferredProfileId(current, savedProfileId, profiles));
  }, [isOpen, profiles, setProfileId, storedSettingsRef]);
};

const useSelectedProfileSettingsEffect = ({
  selectedProfile,
  setDraftTemplateId,
  setDryRun,
  setLimitInput,
  setResult,
  setSettingsProfileId,
  storedSettingsRef,
}: Pick<
  SelectionEffectsInput,
  | 'selectedProfile'
  | 'setDraftTemplateId'
  | 'setDryRun'
  | 'setLimitInput'
  | 'setResult'
  | 'setSettingsProfileId'
  | 'storedSettingsRef'
>): void => {
  useEffect(() => {
    if (selectedProfile === null) return;
    const storedProfileSettings = getStoredProfileSettings(
      storedSettingsRef.current,
      selectedProfile.id
    );
    setDraftTemplateId(storedProfileSettings?.draftTemplateId ?? '');
    setDryRun(storedProfileSettings?.dryRun ?? false);
    setLimitInput(resolveProfileLimitInput(selectedProfile, storedSettingsRef.current));
    setSettingsProfileId(selectedProfile.id);
    setResult(null);
  }, [
    selectedProfile,
    setDraftTemplateId,
    setDryRun,
    setLimitInput,
    setResult,
    setSettingsProfileId,
    storedSettingsRef,
  ]);
};

const useDraftTemplateAvailabilityEffect = ({
  draftTemplateId,
  draftTemplates,
  draftTemplatesReady,
  setDraftTemplateId,
}: Pick<
  SelectionEffectsInput,
  'draftTemplateId' | 'draftTemplates' | 'draftTemplatesReady' | 'setDraftTemplateId'
>): void => {
  useEffect(() => {
    if (!draftTemplatesReady || draftTemplateId.length === 0) return;
    const templateStillAvailable = draftTemplates.some((draft) => draft.id === draftTemplateId);
    if (!templateStillAvailable) setDraftTemplateId('');
  }, [draftTemplateId, draftTemplates, draftTemplatesReady, setDraftTemplateId]);
};

export const useProductScrapeProfileSelectionEffects = (
  input: SelectionEffectsInput
): void => {
  useInitialProfileEffect(input);
  useSelectedProfileSettingsEffect(input);
  useDraftTemplateAvailabilityEffect(input);
};

export const usePersistProductScrapeProfileSettings = ({
  draftTemplateId,
  dryRun,
  isOpen,
  limitInput,
  selectedProfile,
  settingsProfileId,
  storedSettingsRef,
  updateStoredSettings,
}: PersistSettingsInput): void => {
  useEffect(() => {
    if (isOpen !== true || selectedProfile?.id !== settingsProfileId) return;
    updateStoredSettings({
      ...storedSettingsRef.current,
      selectedProfileId: selectedProfile.id,
      profiles: {
        ...storedSettingsRef.current.profiles,
        [selectedProfile.id]: { draftTemplateId, dryRun, limitInput },
      },
    });
  }, [
    draftTemplateId,
    dryRun,
    isOpen,
    limitInput,
    selectedProfile,
    settingsProfileId,
    storedSettingsRef,
    updateStoredSettings,
  ]);
};
