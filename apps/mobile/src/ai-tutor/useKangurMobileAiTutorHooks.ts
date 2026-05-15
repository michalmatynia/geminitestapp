import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type {
  KangurAiTutorChatResponse,
  KangurAiTutorConversationContext,
  KangurAiTutorUsageSummary,
} from '../../../../src/shared/contracts/kangur-ai-tutor';
import type { KangurAiTutorContent } from '../../../../src/shared/contracts/kangur-ai-tutor-content';
import type { KangurAiTutorNativeGuideStore } from '../../../../src/shared/contracts/kangur-ai-tutor-native-guide';
import {
  useKangurMobileMutationV2,
  useKangurMobileQueryV2,
} from '../query/kangurMobileQueryFactories';

export type KangurMobileAiTutorQuickAction = {
  id: string;
  label: string;
  prompt: string;
};

export type TutorUsageQueryResult = {
  message: string | null;
  usage: KangurAiTutorUsageSummary | null;
};

export type KangurMobileAiTutorQueries = {
  contentQuery: UseQueryResult<KangurAiTutorContent, Error>;
  nativeGuideQuery: UseQueryResult<KangurAiTutorNativeGuideStore, Error>;
  usageQuery: UseQueryResult<TutorUsageQueryResult, Error>;
};

export const createTutorFetchErrorMessage = (
  locale: 'de' | 'en' | 'pl',
): string =>
  ({
    de: 'Der KI-Tutor konnte nicht geöffnet werden.',
    en: 'Could not open AI Tutor.',
    pl: 'Nie udało się otworzyć AI Tutora.',
  })[locale];

export const readResponseMessage = async (response: Response): Promise<string | null> => {
  try {
    const payload = (await response.json()) as Record<string, unknown>;
    const message = payload['message'];
    return typeof message === 'string' && message.trim().length > 0
      ? message.trim()
      : null;
  } catch {
    return null;
  }
};

const fetchTutorContent = async (apiBaseUrl: string, locale: 'de' | 'en' | 'pl'): Promise<KangurAiTutorContent> => {
  const response = await fetch(
    `${apiBaseUrl}/api/kangur/ai-tutor/content?locale=${encodeURIComponent(locale)}`,
    {
      cache: 'no-store',
      credentials: 'include',
    },
  );
  if (!response.ok) {
    throw new Error(createTutorFetchErrorMessage(locale));
  }
  return (await response.json()) as KangurAiTutorContent;
};

const fetchTutorNativeGuide = async (apiBaseUrl: string, locale: 'de' | 'en' | 'pl'): Promise<KangurAiTutorNativeGuideStore> => {
  const response = await fetch(
    `${apiBaseUrl}/api/kangur/ai-tutor/native-guide?locale=${encodeURIComponent(locale)}`,
    {
      cache: 'no-store',
      credentials: 'include',
    },
  );
  if (!response.ok) {
    throw new Error(createTutorFetchErrorMessage(locale));
  }
  return (await response.json()) as KangurAiTutorNativeGuideStore;
};

const fetchTutorUsage = async (apiBaseUrl: string, locale: 'de' | 'en' | 'pl'): Promise<TutorUsageQueryResult> => {
  const response = await fetch(`${apiBaseUrl}/api/kangur/ai-tutor/usage`, {
    cache: 'no-store',
    credentials: 'include',
  });

  if (!response.ok) {
    const message = (await readResponseMessage(response)) ?? createTutorFetchErrorMessage(locale);
    return { message, usage: null };
  }

  const payload = (await response.json()) as { usage?: KangurAiTutorUsageSummary };
  return { message: null, usage: payload.usage ?? null };
};

export const useKangurMobileAiTutorQueries = ({
  apiBaseUrl,
  canLoadTutorCatalog,
  enabled,
  isAuthenticated,
  isRestoringAuth,
  locale,
  userId,
}: {
  apiBaseUrl: string;
  canLoadTutorCatalog: boolean;
  enabled: boolean;
  isAuthenticated: boolean;
  isRestoringAuth: boolean;
  locale: 'de' | 'en' | 'pl';
  userId: string;
}): KangurMobileAiTutorQueries => {
  const contentQueryKey = ['kangur-mobile', 'ai-tutor', 'content', apiBaseUrl, locale] as const;
  const nativeGuideQueryKey = [
    'kangur-mobile',
    'ai-tutor',
    'native-guide',
    apiBaseUrl,
    locale,
  ] as const;
  const usageQueryKey = ['kangur-mobile', 'ai-tutor', 'usage', apiBaseUrl, userId] as const;

  const contentQuery = useKangurMobileQueryV2<KangurAiTutorContent>({
    enabled: canLoadTutorCatalog,
    queryKey: contentQueryKey,
    queryFn: () => fetchTutorContent(apiBaseUrl, locale),
    staleTime: 300_000,
    meta: {
      source: 'kangur.mobile.ai-tutor.content',
      operation: 'detail',
      resource: 'kangur.mobile.ai-tutor.content',
      queryKey: contentQueryKey,
      description: 'Loads Kangur mobile AI tutor content.',
      tags: ['kangur-mobile', 'ai-tutor', 'content'],
    },
  });

  const nativeGuideQuery = useKangurMobileQueryV2<KangurAiTutorNativeGuideStore>({
    enabled: canLoadTutorCatalog,
    queryKey: nativeGuideQueryKey,
    queryFn: () => fetchTutorNativeGuide(apiBaseUrl, locale),
    staleTime: 300_000,
    meta: {
      source: 'kangur.mobile.ai-tutor.native-guide',
      operation: 'detail',
      resource: 'kangur.mobile.ai-tutor.native-guide',
      queryKey: nativeGuideQueryKey,
      description: 'Loads Kangur mobile AI tutor native guide.',
      tags: ['kangur-mobile', 'ai-tutor', 'native-guide'],
    },
  });

  const usageQuery = useKangurMobileQueryV2<TutorUsageQueryResult>({
    enabled: enabled && isAuthenticated && !isRestoringAuth,
    queryKey: usageQueryKey,
    queryFn: () => fetchTutorUsage(apiBaseUrl, locale),
    staleTime: 30_000,
    meta: {
      source: 'kangur.mobile.ai-tutor.usage',
      operation: 'detail',
      resource: 'kangur.mobile.ai-tutor.usage',
      queryKey: usageQueryKey,
      description: 'Loads Kangur mobile AI tutor usage summary.',
      tags: ['kangur-mobile', 'ai-tutor', 'usage'],
    },
  });

  return { contentQuery, nativeGuideQuery, usageQuery };
};

export const useKangurMobileAiTutorMutation = ({
  apiBaseUrl,
  context,
  locale,
}: {
  apiBaseUrl: string;
  context: KangurAiTutorConversationContext;
  locale: 'de' | 'en' | 'pl';
}): UseMutationResult<KangurAiTutorChatResponse, Error, KangurMobileAiTutorQuickAction> => {
  const mutationKey = ['kangur-mobile', 'ai-tutor', 'chat', apiBaseUrl, locale] as const;
  return useKangurMobileMutationV2<KangurAiTutorChatResponse, KangurMobileAiTutorQuickAction>({
    mutationKey,
    mutationFn: async (
      action: KangurMobileAiTutorQuickAction,
    ): Promise<KangurAiTutorChatResponse> => {
      const response = await fetch(`${apiBaseUrl}/api/kangur/ai-tutor/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: action.prompt,
            },
          ],
          context,
        }),
      });

      if (!response.ok) {
        const message = (await readResponseMessage(response)) ?? createTutorFetchErrorMessage(locale);
        throw new Error(message);
      }

      const data = (await response.json()) as unknown;
      return data as KangurAiTutorChatResponse;
    },
    meta: {
      source: 'kangur.mobile.ai-tutor.chat',
      operation: 'action',
      resource: 'kangur.mobile.ai-tutor.chat',
      mutationKey,
      description: 'Sends Kangur mobile AI tutor chat prompts.',
      tags: ['kangur-mobile', 'ai-tutor', 'chat'],
    },
  });
};
