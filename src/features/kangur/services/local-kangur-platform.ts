'use client';

import { getSession, signIn, signOut } from 'next-auth/react';
import { z } from 'zod';

import { kangurScoreSchema } from '@/shared/contracts/kangur';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import type {
  KangurPlatform,
  KangurScoreCreateInput,
  KangurScoreRecord,
  KangurUser,
} from '@/features/kangur/services/ports';
import { logKangurClientError } from '@/features/kangur/observability/client';

const KANGUR_SCORES_ENDPOINT = '/api/kangur/scores';
const DEFAULT_SCORE_LIMIT = 100;
const scoreListSchema = z.array(kangurScoreSchema);

const unauthorizedError = (): Error & { status: number } => {
  const error = new Error('Authentication required') as Error & { status: number };
  error.status = 401;
  return error;
};

const resolveSessionUser = async (): Promise<KangurUser> => {
  const session = await getSession();
  const sessionUser = session?.user;
  if (!sessionUser) {
    throw unauthorizedError();
  }

  const typedUser = sessionUser as {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };

  const fullName = typedUser.name?.trim() || typedUser.email?.split('@')[0] || 'User';

  return {
    id: typedUser.id ?? typedUser.email ?? fullName,
    full_name: fullName,
    email: typedUser.email ?? null,
    role: typedUser.role === 'admin' ? 'admin' : 'user',
  };
};

const buildScoresUrl = (params: {
  sort?: string;
  limit?: number;
  player_name?: string;
  operation?: string;
  created_by?: string;
}): string => {
  const search = new URLSearchParams();

  if (params.sort) search.set('sort', params.sort);
  if (typeof params.limit === 'number') search.set('limit', String(params.limit));
  if (params.player_name) search.set('player_name', params.player_name);
  if (params.operation) search.set('operation', params.operation);
  if (params.created_by) search.set('created_by', params.created_by);

  const query = search.toString();
  return query ? `${KANGUR_SCORES_ENDPOINT}?${query}` : KANGUR_SCORES_ENDPOINT;
};

const requestScoresFromApi = async (url: string): Promise<KangurScoreRecord[]> => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: withCsrfHeaders(),
      credentials: 'same-origin',
    });
    if (!response.ok) {
      const requestError = new Error(`Kangur score list request failed with ${response.status}`);
      logKangurClientError(requestError, {
        source: 'kangur.local-platform',
        action: 'score.list',
        method: 'GET',
        endpoint: url,
        statusCode: response.status,
      });
      throw requestError;
    }

    const payload = (await response.json()) as unknown;
    const parsed = scoreListSchema.safeParse(payload);
    if (!parsed.success) {
      const payloadError = new Error('Kangur score list payload validation failed.');
      logKangurClientError(payloadError, {
        source: 'kangur.local-platform',
        action: 'score.list',
        method: 'GET',
        endpoint: url,
      });
      throw payloadError;
    }

    return parsed.data;
  } catch (error: unknown) {
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'score.list',
      method: 'GET',
      endpoint: url,
    });
    throw error;
  }
};

const createScoreViaApi = async (input: KangurScoreCreateInput): Promise<KangurScoreRecord> => {
  try {
    const response = await fetch(KANGUR_SCORES_ENDPOINT, {
      method: 'POST',
      headers: withCsrfHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'same-origin',
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const requestError = new Error(`Kangur score create request failed with ${response.status}`);
      logKangurClientError(requestError, {
        source: 'kangur.local-platform',
        action: 'score.create',
        method: 'POST',
        endpoint: KANGUR_SCORES_ENDPOINT,
        statusCode: response.status,
        operation: input.operation,
      });
      throw requestError;
    }

    const payload = (await response.json()) as unknown;
    const parsed = kangurScoreSchema.safeParse(payload);
    if (!parsed.success) {
      const payloadError = new Error('Kangur score create payload validation failed.');
      logKangurClientError(payloadError, {
        source: 'kangur.local-platform',
        action: 'score.create',
        method: 'POST',
        endpoint: KANGUR_SCORES_ENDPOINT,
        operation: input.operation,
      });
      throw payloadError;
    }
    return parsed.data;
  } catch (error: unknown) {
    logKangurClientError(error, {
      source: 'kangur.local-platform',
      action: 'score.create',
      method: 'POST',
      endpoint: KANGUR_SCORES_ENDPOINT,
      operation: input.operation,
    });
    throw error;
  }
};

export const createLocalKangurPlatform = (): KangurPlatform => {
  return {
    auth: {
      me: resolveSessionUser,
      redirectToLogin: (returnUrl: string) => {
        void signIn(undefined, { callbackUrl: returnUrl });
      },
      logout: async (returnUrl?: string) => {
        if (returnUrl) {
          await signOut({ callbackUrl: returnUrl, redirect: true });
          return;
        }
        await signOut({ redirect: false });
      },
    },
    score: {
      create: async (input: KangurScoreCreateInput) => createScoreViaApi(input),
      list: async (sort?: string, limit?: number) =>
        requestScoresFromApi(
          buildScoresUrl({
            sort,
            limit: typeof limit === 'number' ? limit : DEFAULT_SCORE_LIMIT,
          })
        ),
      filter: async (criteria: Partial<KangurScoreRecord>, sort?: string, limit?: number) =>
        requestScoresFromApi(
          buildScoresUrl({
            sort,
            limit: typeof limit === 'number' ? limit : DEFAULT_SCORE_LIMIT,
            player_name: criteria.player_name,
            operation: criteria.operation,
            created_by: criteria.created_by ?? undefined,
          })
        ),
    },
  };
};
