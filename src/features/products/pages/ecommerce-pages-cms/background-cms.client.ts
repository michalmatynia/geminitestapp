'use client';

import { useCallback, useEffect, useState } from 'react';

import { api } from '@/shared/lib/api-client';
import type { MutationResult, SingleQuery } from '@/shared/contracts/ui/queries';
import { useMutationV2, useSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { useToast } from '@/shared/ui/primitives.public';

export type BackgroundState = {
  cosmosParallaxEnabled: boolean;
  cloudConfigured: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  cloudMirrored?: boolean;
};

type BackgroundResponse = {
  ok: boolean;
  background: BackgroundState;
};

type SaveBackgroundMutationOptions = {
  setBackground: (background: BackgroundState | null) => void;
  setCosmosParallaxEnabled: (enabled: boolean) => void;
  setError: (error: string | null) => void;
  toast: ReturnType<typeof useToast>['toast'];
};

export type BackgroundSettingsController = {
  background: BackgroundState | null;
  cosmosParallaxEnabled: boolean;
  error: string | null;
  handleRefreshClick: () => void;
  handleSaveClick: () => void;
  isLoading: boolean;
  isSaving: boolean;
  setCosmosParallaxEnabled: (enabled: boolean) => void;
};

const BACKGROUND_ENDPOINT = '/api/v2/products/pages/background';
const BACKGROUND_QUERY_KEY = ['products', 'ecommerce-pages-cms', 'background'] as const;

const DEFAULT_BACKGROUND_STATE: BackgroundState = {
  cloudConfigured: false,
  cosmosParallaxEnabled: true,
  updatedAt: null,
  updatedBy: null,
};

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const fetchBackground = async (): Promise<BackgroundState> => {
  const response = await api.get<BackgroundResponse>(BACKGROUND_ENDPOINT);
  return response.background;
};

const saveBackground = async (
  cosmosParallaxEnabled: boolean
): Promise<BackgroundState> => {
  const response = await api.put<BackgroundResponse>(
    BACKGROUND_ENDPOINT,
    { background: { cosmosParallaxEnabled } },
    { timeout: 120_000 }
  );
  return response.background;
};

const useBackgroundQuery = (): SingleQuery<BackgroundState> =>
  useSingleQueryV2({
    id: 'ecommerce-pages-background',
    queryKey: BACKGROUND_QUERY_KEY,
    queryFn: fetchBackground,
    meta: {
      source: 'products.ecommercePagesCms.background.load',
      operation: 'detail',
      resource: 'products.ecommerce-pages-cms.background',
      domain: 'products',
      description: 'Loads ecommerce CMS background settings.',
      tags: ['products', 'ecommerce', 'cms', 'background'],
    },
  });

const useSaveBackgroundMutation = ({
  setBackground,
  setCosmosParallaxEnabled,
  setError,
  toast,
}: SaveBackgroundMutationOptions): MutationResult<BackgroundState, boolean> =>
  useMutationV2<BackgroundState, boolean>({
    mutationKey: ['products', 'ecommerce-pages-cms', 'background', 'save'],
    mutationFn: saveBackground,
    onSuccess: (nextBackground: BackgroundState): void => {
      setBackground(nextBackground);
      setCosmosParallaxEnabled(nextBackground.cosmosParallaxEnabled);
      toast('Background settings saved and mirrored.', { variant: 'success' });
    },
    onError: (saveError: Error): void => {
      const message = toErrorMessage(saveError);
      setError(message);
      toast(message, { variant: 'error' });
    },
    invalidateKeys: [BACKGROUND_QUERY_KEY],
    meta: {
      source: 'products.ecommercePagesCms.background.save',
      operation: 'update',
      resource: 'products.ecommerce-pages-cms.background',
      domain: 'products',
      description: 'Saves and mirrors ecommerce CMS background settings.',
      errorPresentation: 'toast',
      tags: ['products', 'ecommerce', 'cms', 'background'],
    },
  });

export const useBackgroundSettingsController = (): BackgroundSettingsController => {
  const { toast } = useToast();
  const [background, setBackground] = useState<BackgroundState | null>(null);
  const [cosmosParallaxEnabled, setCosmosParallaxEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const backgroundQuery = useBackgroundQuery();
  const saveMutation = useSaveBackgroundMutation({
    setBackground,
    setCosmosParallaxEnabled,
    setError,
    toast,
  });

  useEffect(() => {
    if (backgroundQuery.data === undefined) return;
    setBackground(backgroundQuery.data);
    setCosmosParallaxEnabled(backgroundQuery.data.cosmosParallaxEnabled);
  }, [backgroundQuery.data]);

  const handleSaveClick = useCallback((): void => {
    setError(null);
    saveMutation.mutate(cosmosParallaxEnabled);
  }, [cosmosParallaxEnabled, saveMutation]);

  return {
    background: background ?? DEFAULT_BACKGROUND_STATE,
    cosmosParallaxEnabled,
    error: error ?? (backgroundQuery.error ? toErrorMessage(backgroundQuery.error) : null),
    handleRefreshClick: () => {
      setError(null);
      void backgroundQuery.refetch();
    },
    handleSaveClick,
    isLoading: backgroundQuery.isLoading,
    isSaving: saveMutation.isPending,
    setCosmosParallaxEnabled,
  };
};
