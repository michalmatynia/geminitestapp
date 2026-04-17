import { useMutation, useQuery } from '@tanstack/react-query';
import type {
  KangurAiTutorChatResponse,
  KangurAiTutorConversationContext,
  KangurAiTutorUsageSummary,
} from '../../../../src/shared/contracts/kangur-ai-tutor';
import type { KangurAiTutorContent } from '../../../../src/shared/contracts/kangur-ai-tutor-content';
import type { KangurAiTutorNativeGuideStore } from '../../../../src/shared/contracts/kangur-ai-tutor-native-guide';

export type KangurMobileAiTutorQuickAction = {
  id: string;
  label: string;
  prompt: string;
};

export type TutorUsageQueryResult = {
  message: string | null;
  usage: KangurAiTutorUsageSummary | null;
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
}) => {
  const contentQuery = useQuery<KangurAiTutorContent, Error>({
    enabled: canLoadTutorCatalog,
    queryKey: ['kangur-mobile', 'ai-tutor', 'content', apiBaseUrl, locale],
    queryFn: async (): Promise<KangurAiTutorContent> => {
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
      const data = (await response.json()) as unknown;
      return data as KangurAiTutorContent;
    },
    staleTime: 300_000,
  });

  const nativeGuideQuery = useQuery<KangurAiTutorNativeGuideStore, Error>({
    enabled: canLoadTutorCatalog,
    queryKey: ['kangur-mobile', 'ai-tutor', 'native-guide', apiBaseUrl, locale],
    queryFn: async (): Promise<KangurAiTutorNativeGuideStore> => {
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
      const data = (await response.json()) as unknown;
      return data as KangurAiTutorNativeGuideStore;
    },
    staleTime: 300_000,
  });

  const usageQuery = useQuery<TutorUsageQueryResult, Error>({
    enabled: enabled && isAuthenticated && !isRestoringAuth,
    queryKey: ['kangur-mobile', 'ai-tutor', 'usage', apiBaseUrl, userId],
    queryFn: async (): Promise<TutorUsageQueryResult> => {
      const response = await fetch(`${apiBaseUrl}/api/kangur/ai-tutor/usage`, {
        cache: 'no-store',
        credentials: 'include',
      });

      if (!response.ok) {
        const message = (await readResponseMessage(response)) ?? createTutorFetchErrorMessage(locale);
        return {
          message,
          usage: null,
        };
      }

      const payload = (await response.json()) as { usage?: KangurAiTutorUsageSummary };
      return {
        message: null,
        usage: payload.usage ?? null,
      };
    },
    staleTime: 30_000,
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
}) => {
  return useMutation<KangurAiTutorChatResponse, Error, KangurMobileAiTutorQuickAction>({
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
  });
};
