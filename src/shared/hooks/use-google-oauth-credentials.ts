/**
 * Google OAuth Credentials Hooks
 * 
 * TanStack Query hooks for Google OAuth credential management.
 * Provides:
 * - Credential status query
 * - Credential update mutation
 * - Configuration validation
 * - Observability integration for OAuth operations
 */

'use client';

import type {
  GoogleOAuthCredentialsStatus,
  UpdateGoogleOAuthCredentialsInput,
} from '@/shared/contracts/google-oauth-credentials';
import type { MutationResult, SingleQuery } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import {
  useUpdateMutationV2,
  useSingleQueryV2,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

/** API endpoint for Google OAuth credentials */
const GOOGLE_OAUTH_CREDENTIALS_ENDPOINT = '/api/settings/google-oauth';

/**
 * Hook for querying Google OAuth credentials status
 * @returns Query result with credentials status
 */
export function useGoogleOAuthCredentialsStatus(): SingleQuery<GoogleOAuthCredentialsStatus> {
  return useSingleQueryV2<GoogleOAuthCredentialsStatus, GoogleOAuthCredentialsStatus>({
    id: 'global-google-oauth-credentials',
    queryKey: QUERY_KEYS.settings.googleOAuthCredentials(),
    queryFn: (): Promise<GoogleOAuthCredentialsStatus> =>
      api.get<GoogleOAuthCredentialsStatus>(GOOGLE_OAUTH_CREDENTIALS_ENDPOINT),
    staleTime: 30_000,
    meta: {
      source: 'shared.hooks.useGoogleOAuthCredentialsStatus',
      operation: 'detail',
      resource: 'settings.google-oauth',
      domain: 'global',
      tags: ['settings', 'google-oauth'],
      description: 'Loads shared Google OAuth credential configuration status.',
    },
  });
}

export function useUpdateGoogleOAuthCredentials(): MutationResult<
  GoogleOAuthCredentialsStatus,
  UpdateGoogleOAuthCredentialsInput
> {
  return useUpdateMutationV2<
    GoogleOAuthCredentialsStatus,
    UpdateGoogleOAuthCredentialsInput
  >({
    mutationKey: QUERY_KEYS.settings.mutation('update-google-oauth-credentials'),
    mutationFn: (payload): Promise<GoogleOAuthCredentialsStatus> =>
      api.post<GoogleOAuthCredentialsStatus>(GOOGLE_OAUTH_CREDENTIALS_ENDPOINT, payload),
    invalidate: async (queryClient) => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.settings.googleOAuthCredentials(),
      });
    },
    meta: {
      source: 'shared.hooks.useUpdateGoogleOAuthCredentials',
      operation: 'update',
      resource: 'settings.google-oauth',
      domain: 'global',
      tags: ['settings', 'google-oauth', 'update'],
      description: 'Updates shared Google OAuth credentials.',
    },
  });
}
