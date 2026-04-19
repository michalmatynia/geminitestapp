import { useEffect, useMemo } from 'react';

import type {
  KangurAiTutorChatResponse,
  KangurAiTutorConversationContext,
  KangurAiTutorUsageSummary,
} from '../../../../src/shared/contracts/kangur-ai-tutor';
import type { KangurAiTutorContent } from '../../../../src/shared/contracts/kangur-ai-tutor-content';
import type { KangurAiTutorNativeGuideEntry } from '../../../../src/shared/contracts/kangur-ai-tutor-native-guide';
import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import {
  resolveKangurMobileActionHref,
  resolveKangurMobileWebsiteHelpHref,
} from '../shared/resolveKangurMobileActionHref';
import { selectKangurMobileAiTutorGuideEntry } from './selectKangurMobileAiTutorGuideEntry';
import {
  useKangurMobileAiTutorMutation,
  useKangurMobileAiTutorQueries,
  type KangurMobileAiTutorQuickAction,
} from './useKangurMobileAiTutorHooks';
import {
  FALLBACK_TUTOR_NAME,
  createLockedTestPromptMessage,
  createRestoringSignInMessage,
  createSignedOutMessage,
} from './aiTutorMessages';
import {
  buildCDefaultActions,
  buildCGameActions,
  buildCReviewActions,
  buildFallbackQuickActions,
} from './aiTutorActions';

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

const isCReviewCondition = (c: KangurAiTutorConversationContext): boolean =>
  c.surface === 'test' && (c.answerRevealed === true || c.focusKind === 'review' || c.focusKind === 'summary');

const buildQuickActions = (cont: KangurAiTutorContent | null, c: KangurAiTutorConversationContext, l: 'de' | 'en' | 'pl'): KangurMobileAiTutorQuickAction[] => {
  if (cont === null) {
    return buildFallbackQuickActions(l, c.surface, c.focusKind ?? '', c.answerRevealed === true);
  }
  
  if (isCReviewCondition(c)) {
    return buildCReviewActions(cont, c);
  }

  if (c.surface === 'game' && c.focusKind === 'summary') {
    return buildCGameActions(cont);
  }
  
  return buildCDefaultActions(cont, c);
};

const resolveTutorAvailability = (e: boolean, r: boolean, a: boolean, u?: string | null): 'available' | 'restoring_sign_in' | 'signed_out' | 'unavailable' => {
  if (!e) return 'unavailable';
  if (r) return 'restoring_sign_in';
  if (!a) return 'signed_out';
  return (typeof u === 'string' && u.length > 0) ? 'unavailable' : 'available';
};

const resolveAvailabilityMessage = (s: string, l: 'de' | 'en' | 'pl', u?: string | null, e?: Error | null): string | null => {
  if (s === 'restoring_sign_in') return createRestoringSignInMessage(l);
  if (s === 'signed_out') return createSignedOutMessage(l);
  if (s === 'unavailable') {
    if (typeof u === 'string' && u.length > 0) return u;
    return e?.message ?? null;
  }
  return null;
};

const resolveResponseMessage = (d?: KangurAiTutorChatResponse | null, e?: Error | null): string | null => {
  const m = d?.message;
  if (typeof m === 'string' && m.length > 0) {
    return m;
  }
  return e?.message ?? null;
};

const resolveIsL = (c: KangurAiTutorConversationContext): boolean => {
  const isQ = c.focusKind === 'question' || c.focusKind === 'selection';
  return c.surface === 'test' && isQ && c.answerRevealed === false;
};

const resolveIsLoading = (cQ: { isLoading: boolean }, nQ: { isLoading: boolean }, uQ: { isLoading: boolean }, a: boolean): boolean => cQ.isLoading || nQ.isLoading || (a && uQ.isLoading);

const resolveFollowUpActions = (actions: KangurAiTutorChatResponse['followUpActions'] | undefined, gameTarget: 'competition' | 'practice'): KangurMobileAiTutorResolvedAction[] => 
  (actions ?? []).map((a) => ({
    href: resolveKangurMobileActionHref(a, { gameTarget }),
    id: a.id,
    label: a.label,
    reason: a.reason ?? null,
  }));

type ResolveQueriesParamsOptions = {
  enabled: boolean;
  isRestoringAuth: boolean;
  isAuthenticated: boolean;
  userId: string | undefined;
  locale: 'de' | 'en' | 'pl';
  apiBaseUrl: string;
};

type KangurMobileAiTutorQueriesParams = {
  apiBaseUrl: string;
  canLoadTutorCatalog: boolean;
  enabled: boolean;
  isAuthenticated: boolean;
  isRestoringAuth: boolean;
  locale: 'de' | 'en' | 'pl';
  userId: string;
};

const resolveQueriesParams = ({
  enabled,
  isRestoringAuth,
  isAuthenticated,
  userId,
  locale,
  apiBaseUrl,
}: ResolveQueriesParamsOptions): KangurMobileAiTutorQueriesParams => ({
  apiBaseUrl,
  canLoadTutorCatalog: enabled && !isRestoringAuth,
  enabled,
  isAuthenticated,
  isRestoringAuth,
  locale,
  userId: userId ?? 'anonymous',
});

const useAiTutorQueriesParams = (enabled: boolean): { 
  queriesParams: KangurMobileAiTutorQueriesParams; 
  isAuth: boolean; 
  isRestAuth: boolean; 
  locale: 'de' | 'en' | 'pl'; 
  apiBaseUrl: string;
} => {
  const { apiBaseUrl } = useKangurMobileRuntime();
  const { isLoadingAuth, session } = useKangurMobileAuth();
  const { locale } = useKangurMobileI18n();
  const isAuth = session.status === 'authenticated';
  const isRestAuth = isLoadingAuth && !isAuth;

  const queriesParams = useMemo(
    () => resolveQueriesParams({
      enabled,
      isRestoringAuth: isRestAuth,
      isAuthenticated: isAuth,
      userId: session.user?.id,
      locale,
      apiBaseUrl,
    }),
    [enabled, isRestAuth, isAuth, session.user?.id, locale, apiBaseUrl]
  );
  
  return { queriesParams, isAuth, isRestAuth, locale, apiBaseUrl };
};

const useAiTutorMutationWithReset = (apiBaseUrl: string, context: KangurAiTutorConversationContext, locale: 'de' | 'en' | 'pl'): ReturnType<typeof useKangurMobileAiTutorMutation> => {
  const chatM = useKangurMobileAiTutorMutation({ apiBaseUrl, context, locale });
  
  useEffect(() => { 
    chatM.reset(); 
  }, [context.surface, context.contentId, context.focusKind, context.focusId, context.questionId, context.answerRevealed, chatM.reset]);

  return chatM;
};

const resolveTutorName = (data: KangurAiTutorContent | undefined, locale: 'de' | 'en' | 'pl'): string => 
  data?.common.defaultTutorName ?? FALLBACK_TUTOR_NAME[locale];

const resolveWebsiteHelpTarget = (
  target: KangurAiTutorChatResponse['websiteHelpTarget'] | undefined,
  gameTarget: 'competition' | 'practice'
): KangurMobileAiTutorResolvedWebsiteHelp | null => {
  if (!target) return null;
  return { 
    href: resolveKangurMobileWebsiteHelpHref(target, { gameTarget }), 
    label: target.label 
  };
};

const resolveCanSendMessages = (
  aState: 'available' | 'restoring_sign_in' | 'signed_out' | 'unavailable',
  isL: boolean,
  qActions: KangurMobileAiTutorQuickAction[]
): boolean => aState === 'available' && !isL && qActions.length > 0;

const useAiTutorQuickActions = (
  isL: boolean,
  data: KangurAiTutorContent | undefined,
  context: KangurAiTutorConversationContext,
  locale: 'de' | 'en' | 'pl'
): KangurMobileAiTutorQuickAction[] => useMemo(
  () => isL ? [] : buildQuickActions(data ?? null, context, locale),
  [data, context, isL, locale]
);

const assembleResult = (params: {
  aState: 'available' | 'restoring_sign_in' | 'signed_out' | 'unavailable';
  locale: 'de' | 'en' | 'pl';
  usageData: { message?: string | null; usage?: KangurAiTutorUsageSummary | null } | undefined;
  chatM: ReturnType<typeof useAiTutorMutationWithReset>;
  isL: boolean;
  qActions: KangurMobileAiTutorQuickAction[];
  guideEntry: KangurAiTutorNativeGuideEntry | null;
  responseActions: KangurMobileAiTutorResolvedAction[];
  websiteHelpTarget: KangurMobileAiTutorResolvedWebsiteHelp | null;
  contentData: KangurAiTutorContent | undefined;
  contentQuery: { isLoading: boolean };
  nativeGuideQuery: { isLoading: boolean };
  usageQuery: { isLoading: boolean };
  isAuth: boolean;
  sendQuickAction: (id: string) => Promise<void>;
}): UseKangurMobileAiTutorResult => ({
  availabilityMessage: resolveAvailabilityMessage(params.aState, params.locale, params.usageData?.message, params.chatM.error),
  availabilityState: params.aState,
  canSendMessages: resolveCanSendMessages(params.aState, params.isL, params.qActions),
  guideEntry: params.guideEntry,
  interactionHint: params.isL ? createLockedTestPromptMessage(params.locale) : null,
  isLoading: resolveIsLoading(params.contentQuery, params.nativeGuideQuery, params.usageQuery, params.isAuth),
  isSending: params.chatM.isPending,
  quickActions: params.qActions,
  responseActions: params.responseActions,
  responseMessage: resolveResponseMessage(params.chatM.data, params.chatM.error),
  sendQuickAction: params.sendQuickAction,
  tutorName: resolveTutorName(params.contentData, params.locale),
  usage: params.usageData?.usage ?? null,
  websiteHelpTarget: params.websiteHelpTarget,
});

export const useKangurMobileAiTutor = ({ context, enabled = true, gameTarget = 'practice' }: UseKangurMobileAiTutorOptions): UseKangurMobileAiTutorResult => {
  const { queriesParams, isAuth, isRestAuth, locale, apiBaseUrl } = useAiTutorQueriesParams(enabled);
  const { contentQuery, nativeGuideQuery, usageQuery } = useKangurMobileAiTutorQueries(queriesParams);
  const chatM = useAiTutorMutationWithReset(apiBaseUrl, context, locale);

  const aState = resolveTutorAvailability(enabled, isRestAuth, isAuth, usageQuery.data?.message);
  const isL = resolveIsL(context);
  const qActions = useAiTutorQuickActions(isL, contentQuery.data, context, locale);

  const sendQuickAction = async (id: string): Promise<void> => { 
    if (aState === 'available') {
      const a = qActions.find((c) => c.id === id); 
      if (a) await chatM.mutateAsync(a);
    }
  };

  const guideEntry = useMemo(() => selectKangurMobileAiTutorGuideEntry(nativeGuideQuery.data?.entries ?? [], context), [context, nativeGuideQuery.data?.entries]);
  const responseActions = useMemo(() => resolveFollowUpActions(chatM.data?.followUpActions, gameTarget), [chatM.data?.followUpActions, gameTarget]);
  const websiteHelpTarget = useMemo(() => resolveWebsiteHelpTarget(chatM.data?.websiteHelpTarget, gameTarget), [chatM.data?.websiteHelpTarget, gameTarget]);

  return assembleResult({
    aState,
    locale,
    usageData: usageQuery.data,
    chatM,
    isL,
    qActions,
    guideEntry,
    responseActions,
    websiteHelpTarget,
    contentData: contentQuery.data,
    contentQuery,
    nativeGuideQuery,
    usageQuery,
    isAuth,
    sendQuickAction,
  });
};
