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
  ProductScrapeProfileRunRequest,
  ProductScrapeProfileRunResponse,
  ProductScrapeProfilesListResponse,
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
  usePersistProductScrapeProfileSettings,
  useProductScrapeProfileSelectionEffects,
} from './ProductScrapeProfilesModal.controller.effects';
import type {
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
  limitInput: string;
  parsedLimit: number | null | undefined;
  profileId: string;
  queries: ProductScrapeProfileQueries;
  result: ProductScrapeProfileRunResponse | null;
  runIsPending: boolean;
  setDraftTemplateId: (value: string) => void;
  setDryRun: (value: boolean) => void;
  setLimitInput: (value: string) => void;
  setProfileId: (value: string) => void;
};

const useStoredSettingsState = (): StoredSettingsState => {
  const [storedSettings] = useState(readStoredScrapeProfileSettings);
  const storedSettingsRef = useRef<ProductScrapeProfileStoredSettings>(storedSettings);
  const initialProfileId = storedSettings.selectedProfileId;
  const initialProfileSettings = getStoredProfileSettings(storedSettings, initialProfileId);
  const updateStoredSettings = useCallback((settings: ProductScrapeProfileStoredSettings) => {
    storedSettingsRef.current = settings;
    writeStoredScrapeProfileSettings(settings);
  }, []);

  return {
    initialProfileId,
    initialDraftTemplateId: initialProfileSettings?.draftTemplateId ?? '',
    initialDryRun: initialProfileSettings?.dryRun ?? false,
    initialLimitInput: initialProfileSettings?.limitInput ?? '',
    storedSettingsRef,
    updateStoredSettings,
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
  limitInput,
  parsedLimit,
  profileId,
  queries,
  result,
  runIsPending,
  setDraftTemplateId,
  setDryRun,
  setLimitInput,
  setProfileId,
}: ControllerResultInput): ProductScrapeProfilesController => ({
  dryRun,
  error: queries.profilesQuery.error,
  isBusy: runIsPending,
  isLoading: queries.profilesQuery.isLoading,
  isDraftTemplatesLoading: queries.draftsQuery.isLoading,
  canRun: profileId.length > 0 && parsedLimit !== undefined && !runIsPending,
  limitError: resolveLimitError(parsedLimit),
  limitInput,
  draftTemplates: queries.draftTemplates,
  profiles: queries.profiles,
  result,
  selectedDraftTemplateId: draftTemplateId,
  selectedProfileId: profileId,
  onDryRunChange: setDryRun,
  onDraftTemplateSelect: setDraftTemplateId,
  onLimitInputChange: setLimitInput,
  onProfileSelect: setProfileId,
  onRun: handleRun,
});

export const useProductScrapeProfilesController = (
  isOpen: boolean
): ProductScrapeProfilesController => {
  const stored = useStoredSettingsState();
  const [profileId, setProfileId] = useState(stored.initialProfileId);
  const [settingsProfileId, setSettingsProfileId] = useState(stored.initialProfileId);
  const [draftTemplateId, setDraftTemplateId] = useState(stored.initialDraftTemplateId);
  const [limitInput, setLimitInput] = useState(stored.initialLimitInput);
  const [dryRun, setDryRun] = useState(stored.initialDryRun);
  const [result, setResult] = useState<ProductScrapeProfileRunResponse | null>(null);
  const queries = useProductScrapeProfileQueries(isOpen, profileId);
  const parsedLimit = useMemo(() => parseLimit(limitInput), [limitInput]);
  const runMutation = useRunScrapeProfileMutation(setResult);

  useProductScrapeProfileSelectionEffects({
    draftTemplateId,
    draftTemplates: queries.draftTemplates,
    draftTemplatesReady: queries.draftsQuery.data !== undefined,
    isOpen,
    profiles: queries.profiles,
    selectedProfile: queries.selectedProfile,
    setDraftTemplateId,
    setDryRun,
    setLimitInput,
    setProfileId,
    setResult,
    setSettingsProfileId,
    storedSettingsRef: stored.storedSettingsRef,
  });
  usePersistProductScrapeProfileSettings({
    draftTemplateId,
    dryRun,
    isOpen,
    limitInput,
    selectedProfile: queries.selectedProfile,
    settingsProfileId,
    storedSettingsRef: stored.storedSettingsRef,
    updateStoredSettings: stored.updateStoredSettings,
  });

  const handleRun = (): void => {
    if (profileId.length === 0 || parsedLimit === undefined) return;
    runMutation.mutate(buildRunRequest({ draftTemplateId, dryRun, parsedLimit, profileId }));
  };

  return buildControllerResult({
    draftTemplateId,
    dryRun,
    handleRun,
    limitInput,
    parsedLimit,
    profileId,
    queries,
    result,
    runIsPending: runMutation.isPending,
    setDraftTemplateId,
    setDryRun,
    setLimitInput,
    setProfileId,
  });
};
