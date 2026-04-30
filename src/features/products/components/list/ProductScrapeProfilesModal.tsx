'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Play } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type {
  ProductScrapeProfileRunRequest,
  ProductScrapeProfileRunResponse,
  ProductScrapeProfilesListResponse,
} from '@/shared/contracts/products/scrape-profiles';
import { AppModal } from '@/shared/ui/app-modal';
import { Button } from '@/shared/ui/button';
import { useToast } from '@/shared/ui/toast';
import { api } from '@/shared/lib/api-client';
import { invalidateProductsAndCounts } from '@/shared/lib/query-invalidation';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { ProductScrapeProfilesBody } from './ProductScrapeProfilesModal.parts';

type ProductScrapeProfilesModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const SCRAPE_RUN_TIMEOUT_MS = 300_000;
const SCRAPE_PROFILES_QUERY_KEY = ['products', 'scrape-profiles'] as const;

const fetchScrapeProfiles = async (): Promise<ProductScrapeProfilesListResponse> =>
  await api.get<ProductScrapeProfilesListResponse>('/api/v2/products/scrape-profiles');

const runScrapeProfile = async (
  request: ProductScrapeProfileRunRequest
): Promise<ProductScrapeProfileRunResponse> =>
  await api.post<ProductScrapeProfileRunResponse>(
    '/api/v2/products/scrape-profiles/run',
    request,
    { timeout: SCRAPE_RUN_TIMEOUT_MS }
  );

const parseLimit = (value: string): number | null | undefined => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
};

const formatCount = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

const buildToastMessage = (result: ProductScrapeProfileRunResponse): string => {
  if (result.dryRun) {
    return `Dry run mapped ${formatCount(result.scrapedCount, 'product')}.`;
  }
  return `Imported ${formatCount(result.createdCount, 'new product')} and updated ${result.updatedCount}.`;
};

const resultVariant = (result: ProductScrapeProfileRunResponse): 'success' | 'warning' =>
  result.failedCount > 0 || result.skippedCount > 0 ? 'warning' : 'success';

const useRunScrapeProfileMutation = (
  setResult: (result: ProductScrapeProfileRunResponse) => void
) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: runScrapeProfile,
    onSuccess: async (response) => {
      setResult(response);
      if (!response.dryRun) {
        await invalidateProductsAndCounts(queryClient);
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

const useScrapeProfilesQuery = (isOpen: boolean) =>
  useQuery({
    queryKey: SCRAPE_PROFILES_QUERY_KEY,
    queryFn: fetchScrapeProfiles,
    enabled: isOpen,
    staleTime: 60_000,
  });

export function ProductScrapeProfilesModal(
  props: ProductScrapeProfilesModalProps
): React.JSX.Element {
  const { isOpen, onClose } = props;
  const [profileId, setProfileId] = useState('');
  const [limitInput, setLimitInput] = useState('');
  const [dryRun, setDryRun] = useState(false);
  const [result, setResult] = useState<ProductScrapeProfileRunResponse | null>(null);
  const profilesQuery = useScrapeProfilesQuery(isOpen);
  const profiles = useMemo(
    () => profilesQuery.data?.profiles ?? [],
    [profilesQuery.data?.profiles]
  );
  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === profileId) ?? null,
    [profileId, profiles]
  );
  const parsedLimit = useMemo(() => parseLimit(limitInput), [limitInput]);
  const runMutation = useRunScrapeProfileMutation(setResult);

  useEffect(() => {
    if (!isOpen || profiles.length === 0) return;
    const firstProfileId = profiles[0]?.id ?? '';
    setProfileId((current) => (current.length > 0 ? current : firstProfileId));
  }, [isOpen, profiles]);

  useEffect(() => {
    if (selectedProfile === null) return;
    const nextLimit =
      selectedProfile.defaultLimit !== null ? String(selectedProfile.defaultLimit) : '';
    setLimitInput(nextLimit);
    setResult(null);
  }, [selectedProfile?.id]);

  const handleRun = (): void => {
    if (profileId.length === 0 || parsedLimit === undefined) return;
    runMutation.mutate({
      profileId,
      dryRun,
      skipRecordsWithErrors: true,
      ...(parsedLimit !== null ? { limit: parsedLimit } : {}),
    });
  };

  const isBusy = runMutation.isPending;
  const canRun = profileId.length > 0 && parsedLimit !== undefined && !isBusy;

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title='Scrape Profiles'
      subtitle='BattleStock product import'
      size='lg'
      lockClose={isBusy}
      footer={
        <>
          <Button type='button' variant='outline' onClick={onClose} disabled={isBusy}>
            Close
          </Button>
          <Button
            type='button'
            onClick={handleRun}
            disabled={!canRun}
            loading={isBusy}
            loadingText='Running...'
          >
            <Play className='size-4' aria-hidden='true' />
            Run Profile
          </Button>
        </>
      }
    >
      <ProductScrapeProfilesBody
        dryRun={dryRun}
        error={profilesQuery.error}
        isLoading={profilesQuery.isLoading}
        limitError={
          parsedLimit === undefined ? 'Limit must be a positive whole number.' : null
        }
        limitInput={limitInput}
        profiles={profiles}
        result={result}
        selectedProfileId={profileId}
        onDryRunChange={setDryRun}
        onLimitInputChange={setLimitInput}
        onProfileSelect={setProfileId}
      />
    </AppModal>
  );
}
