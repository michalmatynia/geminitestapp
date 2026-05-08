'use client';

import type { UseMutationResult } from '@tanstack/react-query';
import { useCallback } from 'react';

import type {
  ProductScrapeProfileRunLaunchResponse,
  ProductScrapeProfileRunRequest,
} from '@/shared/contracts/products/scrape-profiles';
import { useToast } from '@/shared/ui/toast';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { buildRunRequest } from './ProductScrapeProfilesModal.controller.helpers';
import type { ProductScrapeProfileFormState } from './ProductScrapeProfilesModal.controller.types';
import type { ProductScrapeProfileRuntimeActionSetting } from './useProductScrapeProfileRuntimeActionSetting';

export const useProductScrapeProfileRunHandler = ({
  formState,
  parsedLimit,
  runMutation,
  runtimeAction,
}: {
  formState: ProductScrapeProfileFormState;
  parsedLimit: number | null | undefined;
  runMutation: UseMutationResult<
    ProductScrapeProfileRunLaunchResponse,
    Error,
    ProductScrapeProfileRunRequest
  >;
  runtimeAction: ProductScrapeProfileRuntimeActionSetting;
}): (() => void) => {
  const { toast } = useToast();

  return useCallback((): void => {
    if (formState.profileId.length === 0 || parsedLimit === undefined) return;
    void (async (): Promise<void> => {
      try {
        await runtimeAction.persist();
      } catch (error) {
        logClientError(error);
        toast(error instanceof Error ? error.message : 'Failed to save scrape runtime settings.', {
          variant: 'error',
        });
        return;
      }
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
    })();
  }, [formState, parsedLimit, runMutation, runtimeAction, toast]);
};
