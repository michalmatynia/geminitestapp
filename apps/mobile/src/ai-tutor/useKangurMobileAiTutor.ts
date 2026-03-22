import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import type {
  KangurAiTutorChatResponse,
  KangurAiTutorConversationContext,
  KangurAiTutorUsageSummary,
  KangurAiTutorWebsiteHelpTarget,
} from '../../../../src/shared/contracts/kangur-ai-tutor';
import type { KangurAiTutorContent } from '../../../../src/shared/contracts/kangur-ai-tutor-content';
import type {
  KangurAiTutorNativeGuideEntry,
  KangurAiTutorNativeGuideStore,
} from '../../../../src/shared/contracts/kangur-ai-tutor-native-guide';
import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import {
  resolveKangurMobileActionHref,
  resolveKangurMobileWebsiteHelpHref,
} from '../shared/resolveKangurMobileActionHref';
import { selectKangurMobileAiTutorGuideEntry } from './selectKangurMobileAiTutorGuideEntry';

type KangurMobileAiTutorQuickAction = {
  id: string;
  label: string;
  prompt: string;
};

type KangurMobileAiTutorResolvedAction = {
  href: ReturnType<typeof resolveKangurMobileActionHref>;
  id: string;
  label: string;
  reason: string | null;
};

type KangurMobileAiTutorResolvedWebsiteHelp = {
  href: ReturnType<typeof resolveKangurMobileWebsiteHelpHref>;
  label: string;
};

type UseKangurMobileAiTutorOptions = {
  context: KangurAiTutorConversationContext;
  enabled?: boolean;
  gameTarget?: 'competition' | 'practice';
};

type UseKangurMobileAiTutorResult = {
  availabilityMessage: string | null;
  availabilityState: 'available' | 'restoring_sign_in' | 'signed_out' | 'unavailable';
  canSendMessages: boolean;
  guideEntry: KangurAiTutorNativeGuideEntry | null;
  interactionHint: string | null;
  isLoading: boolean;
  isSending: boolean;
  quickActions: KangurMobileAiTutorQuickAction[];
  responseMessage: string | null;
  responseActions: KangurMobileAiTutorResolvedAction[];
  tutorName: string;
  usage: KangurAiTutorUsageSummary | null;
  websiteHelpTarget: KangurMobileAiTutorResolvedWebsiteHelp | null;
  sendQuickAction: (actionId: string) => Promise<void>;
};

type TutorUsageQueryResult = {
  message: string | null;
  usage: KangurAiTutorUsageSummary | null;
};

const FALLBACK_TUTOR_NAME = {
  de: 'KI-Tutor',
  en: 'AI Tutor',
  pl: 'AI Tutor',
} as const;

const readResponseMessage = async (response: Response): Promise<string | null> => {
  try {
    const payload = await response.json();
    return typeof payload?.message === 'string' && payload.message.trim().length > 0
      ? payload.message.trim()
      : null;
  } catch {
    return null;
  }
};

const createTutorFetchErrorMessage = (
  locale: 'de' | 'en' | 'pl',
): string =>
  ({
    de: 'Der KI-Tutor konnte nicht geöffnet werden.',
    en: 'Could not open AI Tutor.',
    pl: 'Nie udało się otworzyć AI Tutora.',
  })[locale];

const createSignedOutMessage = (
  locale: 'de' | 'en' | 'pl',
): string =>
  ({
    de: 'Melde dich an, um den KI-Tutor in diesem kroku zu öffnen.',
    en: 'Sign in to open AI Tutor for this step.',
    pl: 'Zaloguj się, aby otworzyć AI Tutora przy tym kroku.',
  })[locale];

const createRestoringSignInMessage = (
  locale: 'de' | 'en' | 'pl',
): string =>
  ({
    de: 'Die Anmeldung wird wiederhergestellt, damit der KI-Tutor starten kann.',
    en: 'Restoring sign-in so AI Tutor can open here.',
    pl: 'Przywracamy logowanie, aby AI Tutor mógł się tutaj otworzyć.',
  })[locale];

const createLockedTestPromptMessage = (
  locale: 'de' | 'en' | 'pl',
): string =>
  ({
    de: 'Sprawdź odpowiedź, aby odblokować szybkie podpowiedzi tutora przy tym pytaniu.',
    en: 'Reveal the answer to unlock tutor prompts for this test question.',
    pl: 'Sprawdź odpowiedź, aby odblokować szybkie podpowiedzi tutora przy tym pytaniu.',
  })[locale];

const buildFallbackQuickActions = (
  locale: 'de' | 'en' | 'pl',
  context: KangurAiTutorConversationContext,
): KangurMobileAiTutorQuickAction[] => {
  const isReviewing =
    context.answerRevealed === true ||
    context.focusKind === 'review' ||
    context.focusKind === 'summary';

  if (context.surface === 'test' && isReviewing) {
    return [
      {
        id: 'review',
        label: {
          de: 'Antwort besprechen',
          en: 'Review answer',
          pl: 'Omów odpowiedź',
        }[locale],
        prompt: {
          de: 'Omów mój wynik testu: co poszło dobrze i co warto poprawić następnym razem.',
          en: 'Review my test result: what went well and what to improve next.',
          pl: 'Omów mój wynik testu: co poszło dobrze i co warto poprawić następnym razem.',
        }[locale],
      },
      {
        id: 'next_step',
        label: {
          de: 'Co dalej?',
          en: 'What next?',
          pl: 'Co dalej?',
        }[locale],
        prompt: {
          de: 'Powiedz, jaki powinien być mój następny krok po tym teście.',
          en: 'Tell me what my next step should be after this test.',
          pl: 'Powiedz, jaki powinien być mój następny krok po tym teście.',
        }[locale],
      },
      {
        id: 'explain',
        label: {
          de: 'Wyjaśnij',
          en: 'Explain',
          pl: 'Wyjaśnij',
        }[locale],
        prompt: {
          de: 'Wyjaśnij mi to prostymi słowami.',
          en: 'Explain this in simple words.',
          pl: 'Wyjaśnij mi to prostymi słowami.',
        }[locale],
      },
    ];
  }

  if (context.surface === 'game' && context.focusKind === 'summary') {
    return [
      {
        id: 'review',
        label: {
          de: 'Omów grę',
          en: 'Review the round',
          pl: 'Omów rundę',
        }[locale],
        prompt: {
          de: 'Omów moją ostatnią grę: co poszło dobrze i co warto ćwiczyć dalej.',
          en: 'Review my latest round: what went well and what should I practise next.',
          pl: 'Omów moją ostatnią grę: co poszło dobrze i co warto ćwiczyć dalej.',
        }[locale],
      },
      {
        id: 'next_step',
        label: {
          de: 'Co dalej?',
          en: 'What next?',
          pl: 'Co dalej?',
        }[locale],
        prompt: {
          de: 'Powiedz, jaki powinien być mój następny krok po tej grze.',
          en: 'Tell me what my next step should be after this round.',
          pl: 'Powiedz, jaki powinien być mój następny krok po tej grze.',
        }[locale],
      },
      {
        id: 'explain',
        label: {
          de: 'Wyjaśnij',
          en: 'Explain',
          pl: 'Wyjaśnij',
        }[locale],
        prompt: {
          de: 'Wyjaśnij mi to prostymi słowami.',
          en: 'Explain this in simple words.',
          pl: 'Wyjaśnij mi to prostymi słowami.',
        }[locale],
      },
    ];
  }

  return [
    {
      id: 'hint',
      label: {
        de: 'Podpowiedź',
        en: 'Hint',
        pl: 'Podpowiedź',
      }[locale],
      prompt: {
        de: 'Daj mi małą podpowiedź, ale bez gotowej odpowiedzi.',
        en: 'Give me a small hint without the final answer.',
        pl: 'Daj mi małą podpowiedź, ale bez gotowej odpowiedzi.',
      }[locale],
    },
    {
      id: 'how_think',
      label: {
        de: 'Jak myśleć?',
        en: 'How should I think?',
        pl: 'Jak myśleć?',
      }[locale],
      prompt: {
        de: 'Wyjaśnij, jak podejść do tego pytania krok po kroku, bez podawania odpowiedzi.',
        en: 'Explain how to approach this step by step without giving the answer.',
        pl: 'Wyjaśnij, jak podejść do tego pytania krok po kroku, bez podawania odpowiedzi.',
      }[locale],
    },
    {
      id: 'next_step',
      label: {
        de: 'Co dalej?',
        en: 'What next?',
        pl: 'Co dalej?',
      }[locale],
      prompt: {
        de: 'Powiedz, co warto ćwiczyć dalej na podstawie mojego postępu.',
        en: 'Tell me what is worth practising next based on my progress.',
        pl: 'Powiedz, co warto ćwiczyć dalej na podstawie mojego postępu.',
      }[locale],
    },
  ];
};

const buildQuickActions = (
  content: KangurAiTutorContent | null,
  context: KangurAiTutorConversationContext,
  locale: 'de' | 'en' | 'pl',
): KangurMobileAiTutorQuickAction[] => {
  const fallbackActions = buildFallbackQuickActions(locale, context);
  if (!content) {
    return fallbackActions;
  }

  const isReviewing =
    context.answerRevealed === true ||
    context.focusKind === 'review' ||
    context.focusKind === 'summary';

  if (context.surface === 'test' && isReviewing) {
    return [
      {
        id: 'review',
        label:
          context.questionId && context.focusKind === 'review'
            ? content.quickActions.review.questionLabel
            : content.quickActions.review.resultLabel,
        prompt:
          context.questionId && context.focusKind === 'review'
            ? content.quickActions.review.questionPrompt
            : content.quickActions.review.resultPrompt,
      },
      {
        id: 'next_step',
        label:
          context.questionId && context.answerRevealed
            ? content.quickActions.nextStep.reviewQuestionLabel
            : content.quickActions.nextStep.reviewOtherLabel,
        prompt:
          context.questionId && context.answerRevealed
            ? content.quickActions.nextStep.reviewQuestionPrompt
            : content.quickActions.nextStep.reviewTestPrompt,
      },
      {
        id: 'explain',
        label: content.quickActions.explain.defaultLabel,
        prompt: content.quickActions.explain.defaultPrompt,
      },
    ];
  }

  if (context.surface === 'game' && context.focusKind === 'summary') {
    return [
      {
        id: 'review',
        label: content.quickActions.review.gameLabel,
        prompt: content.quickActions.review.gamePrompt,
      },
      {
        id: 'next_step',
        label: content.quickActions.nextStep.reviewOtherLabel,
        prompt: content.quickActions.nextStep.reviewGamePrompt,
      },
      {
        id: 'explain',
        label: content.quickActions.explain.defaultLabel,
        prompt: content.quickActions.explain.defaultPrompt,
      },
    ];
  }

  return [
    {
      id: 'hint',
      label: content.quickActions.hint.defaultLabel,
      prompt: content.quickActions.hint.defaultPrompt,
    },
    {
      id: 'how_think',
      label: content.quickActions.howThink.defaultLabel,
      prompt: content.quickActions.howThink.defaultPrompt,
    },
    {
      id: 'next_step',
      label:
        context.surface === 'game'
          ? content.quickActions.nextStep.defaultLabel
          : content.quickActions.explain.defaultLabel,
      prompt:
        context.surface === 'game'
          ? content.quickActions.nextStep.gamePrompt
          : content.quickActions.explain.defaultPrompt,
    },
  ];
};

export const useKangurMobileAiTutor = ({
  context,
  enabled = true,
  gameTarget = 'practice',
}: UseKangurMobileAiTutorOptions): UseKangurMobileAiTutorResult => {
  const { apiBaseUrl } = useKangurMobileRuntime();
  const { isLoadingAuth, session } = useKangurMobileAuth();
  const { locale } = useKangurMobileI18n();
  const isAuthenticated = session.status === 'authenticated';
  const isRestoringAuth = isLoadingAuth && !isAuthenticated;
  const isLockedTestQuestion =
    context.surface === 'test' &&
    (context.focusKind === 'question' || context.focusKind === 'selection') &&
    context.answerRevealed !== true;

  const contentQuery = useQuery({
    enabled,
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

      return (await response.json()) as KangurAiTutorContent;
    },
    staleTime: 300_000,
  });

  const nativeGuideQuery = useQuery({
    enabled,
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

      return (await response.json()) as KangurAiTutorNativeGuideStore;
    },
    staleTime: 300_000,
  });

  const usageQuery = useQuery({
    enabled: enabled && isAuthenticated && !isRestoringAuth,
    queryKey: ['kangur-mobile', 'ai-tutor', 'usage', apiBaseUrl, session.user?.id ?? 'anonymous'],
    queryFn: async (): Promise<TutorUsageQueryResult> => {
      const response = await fetch(`${apiBaseUrl}/api/kangur/ai-tutor/usage`, {
        cache: 'no-store',
        credentials: 'include',
      });

      if (!response.ok) {
        return {
          message: (await readResponseMessage(response)) ?? createTutorFetchErrorMessage(locale),
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

  const chatMutation = useMutation({
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
        throw new Error(
          (await readResponseMessage(response)) ?? createTutorFetchErrorMessage(locale),
        );
      }

      return (await response.json()) as KangurAiTutorChatResponse;
    },
  });

  const contextResetKey = [
    context.surface,
    context.contentId ?? '',
    context.focusKind ?? '',
    context.focusId ?? '',
    context.questionId ?? '',
    context.answerRevealed ? 'revealed' : 'hidden',
  ].join(':');

  useEffect(() => {
    chatMutation.reset();
  }, [contextResetKey]);

  const guideEntry = useMemo(
    () =>
      selectKangurMobileAiTutorGuideEntry(
        nativeGuideQuery.data?.entries ?? [],
        context,
      ),
    [context, nativeGuideQuery.data?.entries],
  );

  const quickActions = useMemo(() => {
    if (isLockedTestQuestion) {
      return [];
    }

    return buildQuickActions(contentQuery.data ?? null, context, locale);
  }, [contentQuery.data, context, isLockedTestQuestion, locale]);

  const availabilityState: UseKangurMobileAiTutorResult['availabilityState'] =
    !enabled
      ? 'unavailable'
      : isRestoringAuth
        ? 'restoring_sign_in'
        : !isAuthenticated
          ? 'signed_out'
          : usageQuery.data?.message
            ? 'unavailable'
            : 'available';

  const availabilityMessage =
    availabilityState === 'restoring_sign_in'
      ? createRestoringSignInMessage(locale)
      : availabilityState === 'signed_out'
        ? createSignedOutMessage(locale)
        : availabilityState === 'unavailable'
          ? usageQuery.data?.message ??
            (chatMutation.error instanceof Error ? chatMutation.error.message : null)
          : null;

  const responseMessage =
    chatMutation.data?.message ??
    (chatMutation.error instanceof Error ? chatMutation.error.message : null);

  const responseActions = useMemo<KangurMobileAiTutorResolvedAction[]>(
    () =>
      (chatMutation.data?.followUpActions ?? []).map((action) => ({
        href: resolveKangurMobileActionHref(action, {
          gameTarget,
        }),
        id: action.id,
        label: action.label,
        reason: action.reason ?? null,
      })),
    [chatMutation.data?.followUpActions, gameTarget],
  );

  const websiteHelpTarget = useMemo<KangurMobileAiTutorResolvedWebsiteHelp | null>(() => {
    const target = chatMutation.data?.websiteHelpTarget as
      | KangurAiTutorWebsiteHelpTarget
      | undefined;
    if (!target) {
      return null;
    }

    return {
      href: resolveKangurMobileWebsiteHelpHref(target, {
        gameTarget,
      }),
      label: target.label,
    };
  }, [chatMutation.data?.websiteHelpTarget, gameTarget]);

  return {
    availabilityMessage,
    availabilityState,
    canSendMessages: availabilityState === 'available' && quickActions.length > 0,
    guideEntry,
    interactionHint: isLockedTestQuestion
      ? createLockedTestPromptMessage(locale)
      : null,
    isLoading:
      contentQuery.isLoading ||
      nativeGuideQuery.isLoading ||
      (isAuthenticated && usageQuery.isLoading),
    isSending: chatMutation.isPending,
    quickActions,
    responseActions,
    responseMessage,
    sendQuickAction: async (actionId: string) => {
      if (availabilityState !== 'available') {
        return;
      }

      const action = quickActions.find((candidate) => candidate.id === actionId);
      if (!action) {
        return;
      }

      await chatMutation.mutateAsync(action);
    },
    tutorName:
      contentQuery.data?.common.defaultTutorName ??
      FALLBACK_TUTOR_NAME[locale],
    usage: usageQuery.data?.usage ?? null,
    websiteHelpTarget,
  };
};
