'use client';

import type { ListQuery, MutationResult } from '@/shared/contracts/ui';
import {
  kangurSocialImageAddonsSchema,
  type KangurSocialImageAddon,
} from '@/shared/contracts/kangur-social-image-addons';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

type SocialImageAddonsQueryOptions = {
  limit?: number;
  enabled?: boolean;
};

const fetchSocialImageAddons = async (
  options?: SocialImageAddonsQueryOptions
): Promise<KangurSocialImageAddon[]> => {
  const payload = await api.get<KangurSocialImageAddon[]>('/api/kangur/social-image-addons', {
    params: {
      limit: options?.limit,
      scope: 'admin',
    },
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
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kangur.all });
};

export type CreateKangurSocialImageAddonPayload = {
  title: string;
  description?: string;
  sourceUrl: string;
  selector?: string;
  waitForMs?: number;
  waitForSelectorMs?: number;
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
      await api.post<KangurSocialImageAddon>('/api/kangur/social-image-addons', payload),
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
