'use client';

import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import type {
  ProductScrapeProfileImageImportMode,
  ProductScrapeProfileRunResponse,
  ProductScrapeProfileRunQueuedResponse,
  ProductScrapeSourcePriceCurrencyCode,
} from '@/shared/contracts/products/scrape-profiles';

import {
  resolvePreferredProfileId,
  resolveProfileLimitInput,
} from './ProductScrapeProfilesModal.controller.helpers';
import type {
  ProductScrapeProfileFormState,
  ProductScrapeProfileQueries,
  StoredSettingsState,
} from './ProductScrapeProfilesModal.controller.types';
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
  setImageImportMode: (value: ProductScrapeProfileImageImportMode) => void;
  setSourcePriceCurrencyCode: (value: ProductScrapeSourcePriceCurrencyCode) => void;
  setLimitInput: (value: string) => void;
  setProfileId: Dispatch<SetStateAction<string>>;
  setQueuedRun: (queuedRun: ProductScrapeProfileRunQueuedResponse | null) => void;
  setResult: (result: ProductScrapeProfileRunResponse | null) => void;
  setSettingsProfileId: (value: string) => void;
  storedSettingsRef: MutableRefObject<ProductScrapeProfileStoredSettings>;
};

type PersistSettingsInput = Pick<ProductScrapeProfileQueries, 'selectedProfile'> & {
  draftTemplateId: string;
  dryRun: boolean;
  imageImportMode: ProductScrapeProfileImageImportMode;
  sourcePriceCurrencyCode: ProductScrapeSourcePriceCurrencyCode;
  isOpen: boolean;
  limitInput: string;
  settingsProfileId: string;
  storedSettingsRef: MutableRefObject<ProductScrapeProfileStoredSettings>;
  updateStoredSettings: (settings: ProductScrapeProfileStoredSettings) => void;
};

const resolveSelectedSourcePriceCurrencyCode = ({
  selectedProfile,
  storedProfileSettings,
}: Pick<ProductScrapeProfileQueries, 'selectedProfile'> & {
  storedProfileSettings: ProductScrapeProfileStoredSettings['profiles'][string] | null;
}): ProductScrapeSourcePriceCurrencyCode =>
  storedProfileSettings?.sourcePriceCurrencyCode ??
  selectedProfile?.defaultSourcePriceCurrencyCode ??
  selectedProfile?.sourcePriceCurrencyCodes?.[0] ??
  'PLN';

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
  setImageImportMode,
  setSourcePriceCurrencyCode,
  setLimitInput,
  setQueuedRun,
  setResult,
  setSettingsProfileId,
  storedSettingsRef,
}: Pick<
  SelectionEffectsInput,
  | 'selectedProfile'
  | 'setDraftTemplateId'
  | 'setDryRun'
  | 'setImageImportMode'
  | 'setSourcePriceCurrencyCode'
  | 'setLimitInput'
  | 'setQueuedRun'
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
    setImageImportMode(storedProfileSettings?.imageImportMode ?? 'links');
    setSourcePriceCurrencyCode(
      resolveSelectedSourcePriceCurrencyCode({ selectedProfile, storedProfileSettings })
    );
    setLimitInput(resolveProfileLimitInput(selectedProfile, storedSettingsRef.current));
    setSettingsProfileId(selectedProfile.id);
    setQueuedRun(null);
    setResult(null);
  }, [
    selectedProfile,
    setDraftTemplateId,
    setDryRun,
    setImageImportMode,
    setSourcePriceCurrencyCode,
    setLimitInput,
    setQueuedRun,
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
  imageImportMode,
  sourcePriceCurrencyCode,
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
        [selectedProfile.id]: {
          draftTemplateId,
          dryRun,
          imageImportMode,
          limitInput,
          sourcePriceCurrencyCode,
        },
      },
    });
  }, [
    draftTemplateId,
    dryRun,
    imageImportMode,
    sourcePriceCurrencyCode,
    isOpen,
    limitInput,
    selectedProfile,
    settingsProfileId,
    storedSettingsRef,
    updateStoredSettings,
  ]);
};

export const useProductScrapeProfileControllerEffects = ({
  formState,
  isOpen,
  queries,
  setQueuedRun,
  setResult,
  stored,
}: {
  formState: ProductScrapeProfileFormState;
  isOpen: boolean;
  queries: ProductScrapeProfileQueries;
  setResult: (result: ProductScrapeProfileRunResponse | null) => void;
  setQueuedRun: (queuedRun: ProductScrapeProfileRunQueuedResponse | null) => void;
  stored: StoredSettingsState;
}): void => {
  useProductScrapeProfileSelectionEffects({
    draftTemplateId: formState.draftTemplateId,
    draftTemplates: queries.draftTemplates,
    draftTemplatesReady: queries.draftsQuery.data !== undefined,
    isOpen,
    profiles: queries.profiles,
    selectedProfile: queries.selectedProfile,
    setDraftTemplateId: formState.setDraftTemplateId,
    setDryRun: formState.setDryRun,
    setImageImportMode: formState.setImageImportMode,
    setSourcePriceCurrencyCode: formState.setSourcePriceCurrencyCode,
    setLimitInput: formState.setLimitInput,
    setProfileId: formState.setProfileId,
    setQueuedRun,
    setResult,
    setSettingsProfileId: formState.setSettingsProfileId,
    storedSettingsRef: stored.storedSettingsRef,
  });
  usePersistProductScrapeProfileSettings({
    draftTemplateId: formState.draftTemplateId,
    dryRun: formState.dryRun,
    imageImportMode: formState.imageImportMode,
    sourcePriceCurrencyCode: formState.sourcePriceCurrencyCode,
    isOpen,
    limitInput: formState.limitInput,
    selectedProfile: queries.selectedProfile,
    settingsProfileId: formState.settingsProfileId,
    storedSettingsRef: stored.storedSettingsRef,
    updateStoredSettings: stored.updateStoredSettings,
  });
};
