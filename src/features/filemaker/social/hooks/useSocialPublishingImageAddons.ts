import type { ListQuery, MutationResult } from '@/shared/contracts/ui/queries';
import {
  socialPublishingImageAddonsBatchJobSchema,
  socialPublishingImageAddonsBatchJobsSchema,
  socialPublishingImageAddonsBatchResultSchema,
  socialPublishingImageAddonsSchema,
  type SocialPublishingCaptureAppearanceMode,
  type SocialPublishingImageAddonsBatchJob,
  type SocialPublishingImageAddonsBatchJobs,
  type SocialPublishingImageAddonsBatchPayload,
  type SocialPublishingImageAddonsBatchResult,
  type SocialPublishingImageAddon,
} from '@/shared/contracts/social-publishing-image-addons';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

type SocialImageAddonsQueryOptions = {
  limit?: number;
  enabled?: boolean;
  ids?: string[];
};

type SocialImageAddonsBatchJobsQueryOptions = {
  limit?: number;
  enabled?: boolean;
};

const SOCIAL_IMAGE_ADDONS_QUERY_TIMEOUT_MS = 60_000;
const SOCIAL_PUBLISHING_IMAGE_ADDONS_QUERY_KEY = ['social-publishing', 'image-addons'] as const;
const SOCIAL_PUBLISHING_IMAGE_ADDONS_BATCH_JOBS_QUERY_KEY = [
  'kangur',
  'social-image-addon-batch-jobs',
] as const;

const normalizeAddonIds = (ids: string[] | undefined): string[] =>
  Array.from(
    new Set(
      (ids ?? [])
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );

const fetchSocialImageAddons = async (
  options?: SocialImageAddonsQueryOptions
): Promise<SocialPublishingImageAddon[]> => {
  const ids = normalizeAddonIds(options?.ids);
  const payload = await api.get<SocialPublishingImageAddon[]>('/api/filemaker/social-image-addons', {
    params: {
      limit: options?.limit,
      ids: ids.length > 0 ? ids.join(',') : undefined,
      scope: 'admin',
    },
    timeout: SOCIAL_IMAGE_ADDONS_QUERY_TIMEOUT_MS,
  });
  return socialPublishingImageAddonsSchema.parse(payload);
};

export const useSocialPublishingImageAddons = (
  options?: SocialImageAddonsQueryOptions
): ListQuery<SocialPublishingImageAddon, SocialPublishingImageAddon[]> =>
  createListQueryV2<SocialPublishingImageAddon, SocialPublishingImageAddon[]>({
    queryKey: QUERY_KEYS.socialPublishing.imageAddons({
      limit: options?.limit ?? null,
      ids: normalizeAddonIds(options?.ids),
    }),
    queryFn: async (): Promise<SocialPublishingImageAddon[]> => fetchSocialImageAddons(options),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'social-publishing.hooks.useSocialPublishingImageAddons',
      operation: 'list',
      resource: 'social-publishing.image-addons',
      domain: 'social-publishing',
      tags: ['social-publishing', 'image-addons'],
      description: 'Loads social publishing image add-ons.',
    },
  });

const invalidateSocialImageAddons = (queryClient: {
  invalidateQueries: (args: { queryKey: readonly unknown[] }) => void;
}): void => {
  queryClient.invalidateQueries({ queryKey: SOCIAL_PUBLISHING_IMAGE_ADDONS_QUERY_KEY });
};

export type CreateSocialPublishingImageAddonPayload = {
  title: string;
  description?: string;
  sourceUrl: string;
  selector?: string;
  waitForMs?: number;
  waitForSelectorMs?: number;
  appearanceMode?: SocialPublishingCaptureAppearanceMode;
};

export const useCreateSocialPublishingImageAddon = (): MutationResult<
  SocialPublishingImageAddon,
  CreateSocialPublishingImageAddonPayload
> =>
  createUpdateMutationV2<SocialPublishingImageAddon, CreateSocialPublishingImageAddonPayload>({
    mutationKey: [...QUERY_KEYS.socialPublishing.imageAddons({ limit: null }), 'create'],
    mutationFn: async (
      payload: CreateSocialPublishingImageAddonPayload
    ): Promise<SocialPublishingImageAddon> =>
      await api.post<SocialPublishingImageAddon>('/api/filemaker/social-image-addons', payload, {
        timeout: 90_000,
      }),
    invalidate: invalidateSocialImageAddons,
    meta: {
      source: 'social-publishing.hooks.useCreateSocialPublishingImageAddon',
      operation: 'update',
      resource: 'social-publishing.image-addons',
      domain: 'social-publishing',
      tags: ['social-publishing', 'image-addons', 'create'],
      description: 'Creates social publishing image add-ons via Playwright.',
    },
  });

export const useBatchCaptureSocialPublishingImageAddons = (): MutationResult<
  SocialPublishingImageAddonsBatchResult,
  SocialPublishingImageAddonsBatchPayload
> =>
  createUpdateMutationV2<SocialPublishingImageAddonsBatchResult, SocialPublishingImageAddonsBatchPayload>({
    mutationKey: [...QUERY_KEYS.socialPublishing.imageAddons({ limit: null }), 'batch'],
    mutationFn: async (
      payload: SocialPublishingImageAddonsBatchPayload
    ): Promise<SocialPublishingImageAddonsBatchResult> =>
      socialPublishingImageAddonsBatchResultSchema.parse(
        await api.post<SocialPublishingImageAddonsBatchResult>(
          '/api/filemaker/social-image-addons/batch',
          payload,
          { timeout: 180_000 }
        )
      ),
    invalidate: invalidateSocialImageAddons,
    meta: {
      source: 'social-publishing.hooks.useBatchCaptureSocialPublishingImageAddons',
      operation: 'update',
      resource: 'social-publishing.image-addons.batch',
      domain: 'social-publishing',
      tags: ['social-publishing', 'image-addons', 'batch'],
      description: 'Captures social publishing image add-ons via Playwright batch.',
    },
  });

export const fetchSocialPublishingImageAddonsBatchJob = async (
  id: string
): Promise<SocialPublishingImageAddonsBatchJob | null> => {
  const payload = await api.get<SocialPublishingImageAddonsBatchJob | null>(
    '/api/filemaker/social-image-addons/batch',
    {
      params: { id },
      timeout: SOCIAL_IMAGE_ADDONS_QUERY_TIMEOUT_MS,
    }
  );
  return payload ? socialPublishingImageAddonsBatchJobSchema.parse(payload) : null;
};

export const fetchSocialPublishingImageAddonsBatchJobs = async (
  options?: SocialImageAddonsBatchJobsQueryOptions
): Promise<SocialPublishingImageAddonsBatchJobs> => {
  const payload = await api.get<SocialPublishingImageAddonsBatchJobs>(
    '/api/filemaker/social-image-addons/batch',
    {
      params: {
        limit: options?.limit,
      },
      timeout: SOCIAL_IMAGE_ADDONS_QUERY_TIMEOUT_MS,
    }
  );
  return socialPublishingImageAddonsBatchJobsSchema.parse(payload);
};

export const useSocialPublishingImageAddonsBatchJobs = (
  options?: SocialImageAddonsBatchJobsQueryOptions
): ListQuery<SocialPublishingImageAddonsBatchJob, SocialPublishingImageAddonsBatchJobs> =>
  createListQueryV2<SocialPublishingImageAddonsBatchJob, SocialPublishingImageAddonsBatchJobs>({
    queryKey: [
      ...SOCIAL_PUBLISHING_IMAGE_ADDONS_BATCH_JOBS_QUERY_KEY,
      { limit: options?.limit ?? 5 },
    ],
    queryFn: async (): Promise<SocialPublishingImageAddonsBatchJobs> =>
      await fetchSocialPublishingImageAddonsBatchJobs(options),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 10,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'social-publishing.hooks.useSocialPublishingImageAddonsBatchJobs',
      operation: 'list',
      resource: 'social-publishing.image-addons.batch-jobs',
      domain: 'social-publishing',
      tags: ['social-publishing', 'image-addons', 'batch-jobs'],
      description: 'Loads recent social publishing image add-on batch jobs.',
    },
  });

export const useStartBatchCaptureSocialPublishingImageAddons = (): MutationResult<
  SocialPublishingImageAddonsBatchJob,
  SocialPublishingImageAddonsBatchPayload
> =>
  createUpdateMutationV2<SocialPublishingImageAddonsBatchJob, SocialPublishingImageAddonsBatchPayload>({
    mutationKey: [...QUERY_KEYS.socialPublishing.imageAddons({ limit: null }), 'batch-start'],
    mutationFn: async (
      payload: SocialPublishingImageAddonsBatchPayload
    ): Promise<SocialPublishingImageAddonsBatchJob> =>
      socialPublishingImageAddonsBatchJobSchema.parse(
        await api.post<SocialPublishingImageAddonsBatchJob>(
          '/api/filemaker/social-image-addons/batch',
          { ...payload, async: true },
          { timeout: 30_000 }
        )
      ),
    meta: {
      source: 'social-publishing.hooks.useStartBatchCaptureSocialPublishingImageAddons',
      operation: 'update',
      resource: 'social-publishing.image-addons.batch',
      domain: 'social-publishing',
      tags: ['social-publishing', 'image-addons', 'batch', 'async'],
      description: 'Starts social publishing image add-on batch captures and returns a pollable job.',
    },
  });
