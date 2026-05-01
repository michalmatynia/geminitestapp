'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useDraftQueries } from '@/features/drafter/hooks/useDraftQueries';
import type {
  ProductScrapeProfileImageImportMode,
  ProductScrapeProfileRunRequest,
  ProductScrapeProfileRunResponse,
  ProductScrapeProfilesListResponse,
  ProductScrapeSourcePriceCurrencyCode,
} from '@/shared/contracts/products/scrape-profiles';
import {
  invalidateListingBadges,
  invalidateProductsAndCounts,
} from '@/shared/lib/query-invalidation';
import { useToast } from '@/shared/ui/toast';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  buildRunRequest,
  buildToastMessage,
  fetchScrapeProfiles,
  parseLimit,
  resolveLimitError,
  resultVariant,
  SCRAPE_PROFILES_QUERY_KEY,
  runScrapeProfile,
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

type ControllerResultInput = {
  draftTemplateId: string;
  dryRun: boolean;
  handleRun: () => void;
  imageImportMode: ProductScrapeProfileImageImportMode;
  sourcePriceCurrencyCode: ProductScrapeSourcePriceCurrencyCode;
  limitInput: string;
  parsedLimit: number | null | undefined;
  profileId: string;
  queries: ProductScrapeProfileQueries;
  result: ProductScrapeProfileRunResponse | null;
  runIsPending: boolean;
  setDraftTemplateId: (value: string) => void;
  setDryRun: (value: boolean) => void;
  setImageImportMode: (value: ProductScrapeProfileImageImportMode) => void;
  setSourcePriceCurrencyCode: (value: ProductScrapeSourcePriceCurrencyCode) => void;
  setLimitInput: (value: string) => void;
  setProfileId: (value: string) => void;
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

const useRunScrapeProfileMutation = (
  setResult: (result: ProductScrapeProfileRunResponse) => void
): UseMutationResult<ProductScrapeProfileRunResponse, Error, ProductScrapeProfileRunRequest> => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: runScrapeProfile,
    onSuccess: async (response) => {
      setResult(response);
      if (!response.dryRun) {
        await Promise.all([
          invalidateProductsAndCounts(queryClient),
          invalidateListingBadges(queryClient),
        ]);
      }
      toast(buildToastMessage(response), { variant: resultVariant(response) });
    },
    onError: (error) => {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to run scrape profile.', {
        variant: 'error',
      });
    },
  });
};

const useScrapeProfilesQuery = (
  isOpen: boolean
): UseQueryResult<ProductScrapeProfilesListResponse, Error> =>
  useQuery<ProductScrapeProfilesListResponse, Error>({
    queryKey: SCRAPE_PROFILES_QUERY_KEY,
    queryFn: fetchScrapeProfiles,
    enabled: isOpen,
    staleTime: 60_000,
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
  queries,
  result,
  runIsPending,
  setDraftTemplateId,
  setDryRun,
  setImageImportMode,
  setSourcePriceCurrencyCode,
  setLimitInput,
  setProfileId,
}: ControllerResultInput): ProductScrapeProfilesController => ({
  dryRun,
  error: queries.profilesQuery.error,
  isBusy: runIsPending,
  isLoading: queries.profilesQuery.isLoading,
  isDraftTemplatesLoading: queries.draftsQuery.isLoading,
  canRun: profileId.length > 0 && parsedLimit !== undefined && !runIsPending,
  imageImportMode,
  sourcePriceCurrencyCode,
  limitError: resolveLimitError(parsedLimit),
  limitInput,
  draftTemplates: queries.draftTemplates,
  profiles: queries.profiles,
  result,
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
  isOpen: boolean
): ProductScrapeProfilesController => {
  const stored = useStoredSettingsState();
  const formState = useScrapeProfileFormState(stored);
  const [result, setResult] = useState<ProductScrapeProfileRunResponse | null>(null);
  const queries = useProductScrapeProfileQueries(isOpen, formState.profileId);
  const parsedLimit = useMemo(() => parseLimit(formState.limitInput), [formState.limitInput]);
  const runMutation = useRunScrapeProfileMutation(setResult);

  useProductScrapeProfileControllerEffects({
    formState,
    isOpen,
    queries,
    setResult,
    stored,
  });

  const handleRun = (): void => {
    if (formState.profileId.length === 0 || parsedLimit === undefined) return;
    runMutation.mutate(
      buildRunRequest({
        draftTemplateId: formState.draftTemplateId,
        dryRun: formState.dryRun,
        imageImportMode: formState.imageImportMode,
        parsedLimit,
        profileId: formState.profileId,
        sourcePriceCurrencyCode: formState.sourcePriceCurrencyCode,
      })
    );
  };

  return buildControllerResult({
    draftTemplateId: formState.draftTemplateId,
    dryRun: formState.dryRun,
    handleRun,
    imageImportMode: formState.imageImportMode,
    sourcePriceCurrencyCode: formState.sourcePriceCurrencyCode,
    limitInput: formState.limitInput,
    parsedLimit,
    profileId: formState.profileId,
    queries,
    result,
    runIsPending: runMutation.isPending,
    setDraftTemplateId: formState.setDraftTemplateId,
    setDryRun: formState.setDryRun,
    setImageImportMode: formState.setImageImportMode,
    setSourcePriceCurrencyCode: formState.setSourcePriceCurrencyCode,
    setLimitInput: formState.setLimitInput,
    setProfileId: formState.setProfileId,
  });
};
