'use client';

import type { ListQuery, MutationResult } from '@/shared/contracts/ui';
import {
  kangurSocialImageAddonsBatchJobSchema,
  kangurSocialImageAddonsBatchResultSchema,
  kangurSocialImageAddonsSchema,
  type KangurSocialCaptureAppearanceMode,
  type KangurSocialImageAddonsBatchJob,
  type KangurSocialImageAddonsBatchPayload,
  type KangurSocialImageAddonsBatchResult,
  type KangurSocialImageAddon,
} from '@/shared/contracts/kangur-social-image-addons';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

type SocialImageAddonsQueryOptions = {
  limit?: number;
  enabled?: boolean;
};

const SOCIAL_IMAGE_ADDONS_QUERY_TIMEOUT_MS = 60_000;
const KANGUR_SOCIAL_IMAGE_ADDONS_QUERY_KEY = ['kangur', 'social-image-addons'] as const;

const fetchSocialImageAddons = async (
  options?: SocialImageAddonsQueryOptions
): Promise<KangurSocialImageAddon[]> => {
  const payload = await api.get<KangurSocialImageAddon[]>('/api/kangur/social-image-addons', {
    params: {
      limit: options?.limit,
      scope: 'admin',
    },
    timeout: SOCIAL_IMAGE_ADDONS_QUERY_TIMEOUT_MS,
  });
  return kangurSocialImageAddonsSchema.parse(payload);
};

export const useKangurSocialImageAddons = (
  options?: SocialImageAddonsQueryOptions
): ListQuery<KangurSocialImageAddon, KangurSocialImageAddon[]> =>
  createListQueryV2<KangurSocialImageAddon, KangurSocialImageAddon[]>({
    queryKey: QUERY_KEYS.kangur.socialImageAddons({
      limit: options?.limit ?? null,
    }),
    queryFn: async (): Promise<KangurSocialImageAddon[]> => fetchSocialImageAddons(options),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurSocialImageAddons',
      operation: 'list',
      resource: 'kangur.social-image-addons',
      domain: 'kangur',
      tags: ['kangur', 'social-image-addons'],
      description: 'Loads Kangur social image add-ons.',
    },
  });

const invalidateSocialImageAddons = (queryClient: {
  invalidateQueries: (args: { queryKey: readonly unknown[] }) => void;
}): void => {
  queryClient.invalidateQueries({ queryKey: KANGUR_SOCIAL_IMAGE_ADDONS_QUERY_KEY });
};

export type CreateKangurSocialImageAddonPayload = {
  title: string;
  description?: string;
  sourceUrl: string;
  selector?: string;
  waitForMs?: number;
  waitForSelectorMs?: number;
  appearanceMode?: KangurSocialCaptureAppearanceMode;
};

export const useCreateKangurSocialImageAddon = (): MutationResult<
  KangurSocialImageAddon,
  CreateKangurSocialImageAddonPayload
> =>
  createUpdateMutationV2<KangurSocialImageAddon, CreateKangurSocialImageAddonPayload>({
    mutationKey: [...QUERY_KEYS.kangur.socialImageAddons({ limit: null }), 'create'],
    mutationFn: async (
      payload: CreateKangurSocialImageAddonPayload
    ): Promise<KangurSocialImageAddon> =>
      await api.post<KangurSocialImageAddon>('/api/kangur/social-image-addons', payload, {
        timeout: 90_000,
      }),
    invalidate: invalidateSocialImageAddons,
    meta: {
      source: 'kangur.hooks.useCreateKangurSocialImageAddon',
      operation: 'update',
      resource: 'kangur.social-image-addons',
      domain: 'kangur',
      tags: ['kangur', 'social-image-addons', 'create'],
      description: 'Creates Kangur social image add-ons via Playwright.',
    },
  });

export const useBatchCaptureKangurSocialImageAddons = (): MutationResult<
  KangurSocialImageAddonsBatchResult,
  KangurSocialImageAddonsBatchPayload
> =>
  createUpdateMutationV2<KangurSocialImageAddonsBatchResult, KangurSocialImageAddonsBatchPayload>({
    mutationKey: [...QUERY_KEYS.kangur.socialImageAddons({ limit: null }), 'batch'],
    mutationFn: async (
      payload: KangurSocialImageAddonsBatchPayload
    ): Promise<KangurSocialImageAddonsBatchResult> =>
      kangurSocialImageAddonsBatchResultSchema.parse(
        await api.post<KangurSocialImageAddonsBatchResult>(
          '/api/kangur/social-image-addons/batch',
          payload,
          { timeout: 180_000 }
        )
      ),
    invalidate: invalidateSocialImageAddons,
    meta: {
      source: 'kangur.hooks.useBatchCaptureKangurSocialImageAddons',
      operation: 'update',
      resource: 'kangur.social-image-addons.batch',
      domain: 'kangur',
      tags: ['kangur', 'social-image-addons', 'batch'],
      description: 'Captures Kangur social image add-ons via Playwright batch.',
    },
  });

export const fetchKangurSocialImageAddonsBatchJob = async (
  id: string
): Promise<KangurSocialImageAddonsBatchJob | null> => {
  const payload = await api.get<KangurSocialImageAddonsBatchJob | null>(
    '/api/kangur/social-image-addons/batch',
    {
      params: { id },
      timeout: SOCIAL_IMAGE_ADDONS_QUERY_TIMEOUT_MS,
    }
  );
  return payload ? kangurSocialImageAddonsBatchJobSchema.parse(payload) : null;
};

export const useStartBatchCaptureKangurSocialImageAddons = (): MutationResult<
  KangurSocialImageAddonsBatchJob,
  KangurSocialImageAddonsBatchPayload
> =>
  createUpdateMutationV2<KangurSocialImageAddonsBatchJob, KangurSocialImageAddonsBatchPayload>({
    mutationKey: [...QUERY_KEYS.kangur.socialImageAddons({ limit: null }), 'batch-start'],
    mutationFn: async (
      payload: KangurSocialImageAddonsBatchPayload
    ): Promise<KangurSocialImageAddonsBatchJob> =>
      kangurSocialImageAddonsBatchJobSchema.parse(
        await api.post<KangurSocialImageAddonsBatchJob>(
          '/api/kangur/social-image-addons/batch',
          { ...payload, async: true },
          { timeout: 30_000 }
        )
      ),
    meta: {
      source: 'kangur.hooks.useStartBatchCaptureKangurSocialImageAddons',
      operation: 'update',
      resource: 'kangur.social-image-addons.batch',
      domain: 'kangur',
      tags: ['kangur', 'social-image-addons', 'batch', 'async'],
      description: 'Starts Kangur social image add-on batch captures and returns a pollable job.',
    },
  });
