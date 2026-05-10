'use client';

import { useCallback, useEffect, useState } from 'react';

import { api } from '@/shared/lib/api-client';
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

export const useBackgroundSettingsController = (): BackgroundSettingsController => {
  const { toast } = useToast();
  const [background, setBackground] = useState<BackgroundState | null>(null);
  const [cosmosParallaxEnabled, setCosmosParallaxEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBackground = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const nextBackground = await fetchBackground();
      setBackground(nextBackground);
      setCosmosParallaxEnabled(nextBackground.cosmosParallaxEnabled);
    } catch (loadError: unknown) {
      setError(toErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackground().catch(() => undefined);
  }, [loadBackground]);

  const handleSaveClick = useCallback((): void => {
    setIsSaving(true);
    setError(null);
    saveBackground(cosmosParallaxEnabled)
      .then((nextBackground) => {
        setBackground(nextBackground);
        setCosmosParallaxEnabled(nextBackground.cosmosParallaxEnabled);
        toast('Background settings saved and mirrored.', { variant: 'success' });
      })
      .catch((saveError: unknown) => {
        const message = toErrorMessage(saveError);
        setError(message);
        toast(message, { variant: 'error' });
      })
      .finally(() => setIsSaving(false));
  }, [cosmosParallaxEnabled, toast]);

  return {
    background: background ?? DEFAULT_BACKGROUND_STATE,
    cosmosParallaxEnabled,
    error,
    handleRefreshClick: () => {
      loadBackground().catch(() => undefined);
    },
    handleSaveClick,
    isLoading,
    isSaving,
    setCosmosParallaxEnabled,
  };
};
