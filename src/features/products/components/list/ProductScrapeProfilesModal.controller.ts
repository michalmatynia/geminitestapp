'use client';

import { type UseQueryResult } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useDraftQueries } from '@/features/drafter/hooks/useDraftQueries';
import type {
  ProductScrapeProfileImageImportMode,
  ProductScrapeProfileRunResponse,
  ProductScrapeProfileRunQueuedResponse,
  ProductScrapeProfilesListResponse,
  ProductScrapeSourcePriceCurrencyCode,
} from '@/shared/contracts/products/scrape-profiles';

import {
  fetchScrapeProfiles,
  parseLimit,
  resolveLimitError,
  SCRAPE_PROFILES_QUERY_KEY,
} from './ProductScrapeProfilesModal.controller.helpers';
import {
  useProductScrapeProfileControllerEffects,
} from './ProductScrapeProfilesModal.controller.effects';
import type {
  ProductScrapeProfileFormState,
  ProductScrapeProfileQueries,
  ProductScrapeProfilesController,
  StoredSettingsState,
} from './ProductScrapeProfilesModal.controller.types';
import {
  getStoredProfileSettings,
  readStoredScrapeProfileSettings,
  writeStoredScrapeProfileSettings,
  type ProductScrapeProfileStoredSettings,
} from './ProductScrapeProfilesModal.storage';
import { useRunScrapeProfileMutation } from './ProductScrapeProfilesModal.mutation';
import { useProductScrapeProfileRunHandler } from './ProductScrapeProfilesModal.run-handler';
import { createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import {
  useProductScrapeProfileRuntimeActionSetting,
  type ProductScrapeProfileRuntimeActionSetting,
} from './useProductScrapeProfileRuntimeActionSetting';

type ControllerResultInput = {
  draftTemplateId: string;
  dryRun: boolean;
  handleRun: () => void;
  imageImportMode: ProductScrapeProfileImageImportMode;
  sourcePriceCurrencyCode: ProductScrapeSourcePriceCurrencyCode;
  limitInput: string;
  parsedLimit: number | null | undefined;
  profileId: string;
  queuedRun: ProductScrapeProfileRunQueuedResponse | null;
  queries: ProductScrapeProfileQueries;
  result: ProductScrapeProfileRunResponse | null;
  runtimeAction: ProductScrapeProfileRuntimeActionSetting;
  runIsPending: boolean;
  setDraftTemplateId: (value: string) => void;
  setDryRun: (value: boolean) => void;
  setImageImportMode: (value: ProductScrapeProfileImageImportMode) => void;
  setSourcePriceCurrencyCode: (value: ProductScrapeSourcePriceCurrencyCode) => void;
  setLimitInput: (value: string) => void;
  setProfileId: (value: string) => void;
  settingsProfileId: string;
};

type ProductScrapeProfilesControllerOptions = {
  onRunQueued?: (queuedRun: ProductScrapeProfileRunQueuedResponse) => void;
};

const DEFAULT_STORED_PROFILE_SETTINGS = {
  draftTemplateId: '',
  dryRun: false,
  imageImportMode: 'links' as const,
  limitInput: '',
  sourcePriceCurrencyCode: 'PLN' as const,
};

const useStoredSettingsState = (): StoredSettingsState => {
  const [storedSettings] = useState(readStoredScrapeProfileSettings);
  const storedSettingsRef = useRef<ProductScrapeProfileStoredSettings>(storedSettings);
  const initialProfileId = storedSettings.selectedProfileId;
  const initialProfileSettings =
    getStoredProfileSettings(storedSettings, initialProfileId) ??
    DEFAULT_STORED_PROFILE_SETTINGS;
  const updateStoredSettings = useCallback((settings: ProductScrapeProfileStoredSettings) => {
    storedSettingsRef.current = settings;
    writeStoredScrapeProfileSettings(settings);
  }, []);

  return {
    initialProfileId,
    initialDraftTemplateId: initialProfileSettings.draftTemplateId,
    initialDryRun: initialProfileSettings.dryRun,
    initialImageImportMode: initialProfileSettings.imageImportMode,
    initialSourcePriceCurrencyCode: initialProfileSettings.sourcePriceCurrencyCode,
    initialLimitInput: initialProfileSettings.limitInput,
    storedSettingsRef,
    updateStoredSettings,
  };
};

const useScrapeProfileFormState = (
  stored: StoredSettingsState
): ProductScrapeProfileFormState => {
  const [profileId, setProfileId] = useState(stored.initialProfileId);
  const [settingsProfileId, setSettingsProfileId] = useState(stored.initialProfileId);
  const [draftTemplateId, setDraftTemplateId] = useState(stored.initialDraftTemplateId);
  const [limitInput, setLimitInput] = useState(stored.initialLimitInput);
  const [dryRun, setDryRun] = useState(stored.initialDryRun);
  const [imageImportMode, setImageImportMode] = useState<ProductScrapeProfileImageImportMode>(
    stored.initialImageImportMode
  );
  const [sourcePriceCurrencyCode, setSourcePriceCurrencyCode] =
    useState<ProductScrapeSourcePriceCurrencyCode>(stored.initialSourcePriceCurrencyCode);

  return {
    draftTemplateId,
    dryRun,
    imageImportMode,
    sourcePriceCurrencyCode,
    limitInput,
    profileId,
    settingsProfileId,
    setDraftTemplateId,
    setDryRun,
    setImageImportMode,
    setSourcePriceCurrencyCode,
    setLimitInput,
    setProfileId,
    setSettingsProfileId,
  };
};

const useScrapeProfilesQuery = (
  isOpen: boolean
): UseQueryResult<ProductScrapeProfilesListResponse, Error> =>
  createSingleQueryV2<ProductScrapeProfilesListResponse>({
    queryKey: SCRAPE_PROFILES_QUERY_KEY,
    queryFn: fetchScrapeProfiles,
    enabled: isOpen,
    staleTime: 60_000,
    meta: {
      source: 'products.components.ProductScrapeProfilesModal',
      operation: 'list',
      resource: 'products.scrape-profiles',
      domain: 'products',
      queryKey: SCRAPE_PROFILES_QUERY_KEY,
      tags: ['products', 'scrape-profiles'],
      description: 'Loads product scrape profiles for the scrape modal.',
    },
  });

const useProductScrapeProfileQueries = (
  isOpen: boolean,
  profileId: string
): ProductScrapeProfileQueries => {
  const profilesQuery = useScrapeProfilesQuery(isOpen);
  const draftsQuery = useDraftQueries(undefined, { enabled: isOpen });
  const profiles = useMemo(() => profilesQuery.data?.profiles ?? [], [profilesQuery.data]);
  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === profileId) ?? null,
    [profileId, profiles]
  );
  const draftTemplates = useMemo(
    () =>
      (draftsQuery.data ?? []).filter((draft) => {
        const assignedProfileId = draft.scrapeProfileId?.trim() ?? '';
        return (
          draft.draftKind === 'scrape_template' &&
          (assignedProfileId.length === 0 || assignedProfileId === profileId)
        );
      }),
    [draftsQuery.data, profileId]
  );

  return { draftsQuery, profiles, profilesQuery, selectedProfile, draftTemplates };
};

const buildControllerResult = ({
  draftTemplateId,
  dryRun,
  handleRun,
  imageImportMode,
  sourcePriceCurrencyCode,
  limitInput,
  parsedLimit,
  profileId,
  queuedRun,
  queries,
  result,
  runIsPending,
  runtimeAction,
  setDraftTemplateId,
  setDryRun,
  setImageImportMode,
  setSourcePriceCurrencyCode,
  setLimitInput,
  setProfileId,
  settingsProfileId,
}: ControllerResultInput): ProductScrapeProfilesController => ({
  dryRun,
  error: queries.profilesQuery.error,
  isBusy: runIsPending || runtimeAction.isSaving,
  isLoading: queries.profilesQuery.isLoading,
  isDraftTemplatesLoading: queries.draftsQuery.isLoading,
  canRun:
    profileId.length > 0 &&
    profileId === settingsProfileId &&
    parsedLimit !== undefined &&
    !runIsPending &&
    !runtimeAction.isSaving,
  imageImportMode,
  sourcePriceCurrencyCode,
  limitError: resolveLimitError(parsedLimit),
  limitInput,
  draftTemplates: queries.draftTemplates,
  profiles: queries.profiles,
  queuedRun,
  result,
  runtimeAction,
  selectedDraftTemplateId: draftTemplateId,
  selectedProfileId: profileId,
  onDryRunChange: setDryRun,
  onDraftTemplateSelect: setDraftTemplateId,
  onImageImportModeChange: setImageImportMode,
  onSourcePriceCurrencyCodeChange: setSourcePriceCurrencyCode,
  onLimitInputChange: setLimitInput,
  onProfileSelect: setProfileId,
  onRun: handleRun,
});

export const useProductScrapeProfilesController = (
  isOpen: boolean,
  options: ProductScrapeProfilesControllerOptions = {}
): ProductScrapeProfilesController => {
  const stored = useStoredSettingsState();
  const formState = useScrapeProfileFormState(stored);
  const [result, setResult] = useState<ProductScrapeProfileRunResponse | null>(null);
  const [queuedRun, setQueuedRun] = useState<ProductScrapeProfileRunQueuedResponse | null>(null);
  const queries = useProductScrapeProfileQueries(isOpen, formState.profileId);
  const parsedLimit = useMemo(() => parseLimit(formState.limitInput), [formState.limitInput]);
  const runMutation = useRunScrapeProfileMutation(
    setQueuedRun,
    setResult,
    options.onRunQueued
  );
  const runtimeAction = useProductScrapeProfileRuntimeActionSetting(
    isOpen,
    queries.selectedProfile?.runtimeActionKey ?? null
  );
  const handleRun = useProductScrapeProfileRunHandler({
    formState,
    parsedLimit,
    runMutation,
    runtimeAction,
  });

  useProductScrapeProfileControllerEffects({
    formState,
    isOpen,
    queries,
    setQueuedRun,
    setResult,
    stored,
  });

  return buildControllerResult({
    draftTemplateId: formState.draftTemplateId,
    dryRun: formState.dryRun,
    handleRun,
    imageImportMode: formState.imageImportMode,
    sourcePriceCurrencyCode: formState.sourcePriceCurrencyCode,
    limitInput: formState.limitInput,
    parsedLimit,
    profileId: formState.profileId,
    queuedRun,
    queries,
    result,
    runtimeAction,
    runIsPending: runMutation.isPending,
    setDraftTemplateId: formState.setDraftTemplateId,
    setDryRun: formState.setDryRun,
    setImageImportMode: formState.setImageImportMode,
    setSourcePriceCurrencyCode: formState.setSourcePriceCurrencyCode,
    setLimitInput: formState.setLimitInput,
    setProfileId: formState.setProfileId,
    settingsProfileId: formState.settingsProfileId,
  });
};
