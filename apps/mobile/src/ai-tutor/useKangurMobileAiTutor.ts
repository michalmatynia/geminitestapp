import { useEffect, useMemo } from 'react';

import type {
  KangurAiTutorChatResponse,
  KangurAiTutorConversationContext,
  KangurAiTutorUsageSummary,
  KangurAiTutorWebsiteHelpTarget,
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

const FALLBACK_TUTOR_NAME = { de: 'KI-Tutor', en: 'AI Tutor', pl: 'AI Tutor' } as const;

const createSignedOutMessage = (l: 'de' | 'en' | 'pl'): string =>
  ({ de: 'Melde dich an, um den KI-Tutor in diesem kroku zu öffnen.', en: 'Sign in to open AI Tutor for this step.', pl: 'Zaloguj się, aby otworzyć AI Tutora przy tym kroku.' })[l];

const createRestoringSignInMessage = (l: 'de' | 'en' | 'pl'): string =>
  ({ de: 'Die Anmeldung wird wiederhergestellt, damit der KI-Tutor starten kann.', en: 'Restoring sign-in so AI Tutor can open here.', pl: 'Przywracamy logowanie, aby AI Tutor mógł się tutaj otworzyć.' })[l];

const createLockedTestPromptMessage = (l: 'de' | 'en' | 'pl'): string =>
  ({ de: 'Sprawdź odpowiedź, aby odblokować szybkie podpowiedzi tutora przy tym pytaniu.', en: 'Reveal the answer to unlock tutor prompts for this test question.', pl: 'Sprawdź odpowiedź, aby odblokować szybkie podpowiedzi tutora przy tym pytaniu.' })[l];

const buildTReviewActions = (l: 'de' | 'en' | 'pl'): KangurMobileAiTutorQuickAction[] => [
  { id: 'review', label: { de: 'Antwort besprechen', en: 'Review answer', pl: 'Omów odpowiedź' }[l], prompt: { de: 'Omów mój wynik testu: co poszło dobrze i co warto poprawić następnym razem.', en: 'Review my test result: what went well and what to improve next.', pl: 'Omów mój wynik testu: co poszło dobrze i co warto poprawić następnym razem.' }[l] },
  { id: 'next_step', label: { de: 'Co dalej?', en: 'What next?', pl: 'Co dalej?' }[l], prompt: { de: 'Powiedz, jaki powinien być mój następny krok po tym teście.', en: 'Tell me what my next step should be after this test.', pl: 'Powiedz, jaki powinien być mój następny krok po tym teście.' }[l] },
  { id: 'explain', label: { de: 'Wyjaśnij', en: 'Explain', pl: 'Wyjaśnij' }[l], prompt: { de: 'Wyjaśnij mi to prostymi słowami.', en: 'Explain this in simple words.', pl: 'Wyjaśnij mi to prostymi słowami.' }[l] },
];

const buildGSummaryActions = (l: 'de' | 'en' | 'pl'): KangurMobileAiTutorQuickAction[] => [
  { id: 'review', label: { de: 'Omów rundę', en: 'Review the round', pl: 'Omów rundę' }[l], prompt: { de: 'Omów moją ostatnią grę: co poszło dobrze i co warto ćwiczyć dalej.', en: 'Review my latest round: what went well and what should I practise next.', pl: 'Omów moją ostatnią grę: co poszło dobrze i co warto ćwiczyć dalej.' }[l] },
  { id: 'next_step', label: { de: 'Co dalej?', en: 'What next?', pl: 'Co dalej?' }[l], prompt: { de: 'Powiedz, jaki powinien być mój następny krok po tej grze.', en: 'Tell me what my next step should be after this round.', pl: 'Powiedz, jaki powinien być mój następny krok po tej grze.' }[l] },
  { id: 'explain', label: { de: 'Wyjaśnij', en: 'Explain', pl: 'Wyjaśnij' }[l], prompt: { de: 'Wyjaśnij mi to prostymi słowami.', en: 'Explain this in simple words.', pl: 'Wyjaśnij mi to prostymi słowami.' }[l] },
];

const buildDFallbackActions = (l: 'de' | 'en' | 'pl'): KangurMobileAiTutorQuickAction[] => [
  { id: 'hint', label: { de: 'Podpowiedź', en: 'Hint', pl: 'Podpowiedź' }[l], prompt: { de: 'Daj mi małą podpowiedź, ale bez gotowej odpowiedzi.', en: 'Give me a small hint without the final answer.', pl: 'Daj mi małą podpowiedź, ale bez gotowej odpowiedzi.' }[l] },
  { id: 'how_think', label: { de: 'Jak myśleć?', en: 'How should I think?', pl: 'Jak myśleć?' }[l], prompt: { de: 'Wyjaśnij, jak podejść do tego pytania krok po kroku, bez podawania odpowiedzi.', en: 'Explain how to approach this step by step without giving the answer.', pl: 'Wyjaśnij, jak podejść do tego pytania krok po kroku, bez podawania odpowiedzi.' }[l] },
  { id: 'next_step', label: { de: 'Co dalej?', en: 'What next?', pl: 'Co dalej?' }[l], prompt: { de: 'Powiedz, co warto ćwiczyć dalej na podstawie mojego postępu.', en: 'Tell me what is worth practising next based on my progress.', pl: 'Powiedz, co warto ćwiczyć dalej na podstawie mojego postępu.' }[l] },
];

const buildFallbackQuickActions = (l: 'de' | 'en' | 'pl', s: string, fk: string, ans: boolean): KangurMobileAiTutorQuickAction[] => {
  const isR = fk === 'review' || fk === 'summary' || ans;
  if (s === 'test' && isR) return buildTReviewActions(l);
  if (s === 'game' && fk === 'summary') return buildGSummaryActions(l);
  return buildDFallbackActions(l);
};

const buildCReviewActions = (cont: KangurAiTutorContent, c: KangurAiTutorConversationContext): KangurMobileAiTutorQuickAction[] => {
  const hasQ = c.questionId !== null && c.questionId !== undefined;
  const { review, nextStep, explain } = cont.quickActions;
  const rL = (hasQ && c.focusKind === 'review') ? review.questionLabel : review.resultLabel;
  const rP = (hasQ && c.focusKind === 'review') ? review.questionPrompt : review.resultPrompt;
  const nL = (hasQ && c.answerRevealed) ? nextStep.reviewQuestionLabel : nextStep.reviewOtherLabel;
  const nP = (hasQ && c.answerRevealed) ? nextStep.reviewQuestionPrompt : nextStep.reviewTestPrompt;
  return [
    { id: 'review', label: rL, prompt: rP },
    { id: 'next_step', label: nL, prompt: nP },
    { id: 'explain', label: explain.defaultLabel, prompt: explain.defaultPrompt },
  ];
};

const buildCGameActions = (cont: KangurAiTutorContent): KangurMobileAiTutorQuickAction[] => {
  const { review, nextStep, explain } = cont.quickActions;
  return [
    { id: 'review', label: review.gameLabel, prompt: review.gamePrompt },
    { id: 'next_step', label: nextStep.reviewOtherLabel, prompt: nextStep.reviewGamePrompt },
    { id: 'explain', label: explain.defaultLabel, prompt: explain.defaultPrompt },
  ];
};

const buildCDefaultActions = (cont: KangurAiTutorContent, c: KangurAiTutorConversationContext): KangurMobileAiTutorQuickAction[] => {
  const { hint, howThink, nextStep, explain } = cont.quickActions;
  const isG = c.surface === 'game';
  return [
    { id: 'hint', label: hint.defaultLabel, prompt: hint.defaultPrompt },
    { id: 'how_think', label: howThink.defaultLabel, prompt: howThink.defaultPrompt },
    { id: 'next_step', label: isG ? nextStep.defaultLabel : explain.defaultLabel, prompt: isG ? nextStep.gamePrompt : explain.defaultPrompt },
  ];
};

const buildQuickActions = (cont: KangurAiTutorContent | null, c: KangurAiTutorConversationContext, l: 'de' | 'en' | 'pl'): KangurMobileAiTutorQuickAction[] => {
  if (cont === null) return buildFallbackQuickActions(l, c.surface, c.focusKind ?? '', c.answerRevealed === true);
  const isR = c.answerRevealed || c.focusKind === 'review' || c.focusKind === 'summary';
  if (c.surface === 'test' && isR) return buildCReviewActions(cont, c);
  if (c.surface === 'game' && c.focusKind === 'summary') return buildCGameActions(cont);
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
  return (typeof m === 'string' && m.length > 0) ? m : (e?.message ?? null);
};

const resolveIsL = (c: KangurAiTutorConversationContext): boolean => {
  const isQ = c.focusKind === 'question' || c.focusKind === 'selection';
  return c.surface === 'test' && isQ && c.answerRevealed === false;
};

const resolveIsLoading = (cQ: { isLoading: boolean }, nQ: { isLoading: boolean }, uQ: { isLoading: boolean }, a: boolean): boolean => cQ.isLoading || nQ.isLoading || (a && uQ.isLoading);

export const useKangurMobileAiTutor = ({ context, enabled = true, gameTarget = 'practice' }: UseKangurMobileAiTutorOptions): UseKangurMobileAiTutorResult => {
  const { apiBaseUrl } = useKangurMobileRuntime();
  const { isLoadingAuth, session } = useKangurMobileAuth();
  const { locale } = useKangurMobileI18n();
  const isAuth = session.status === 'authenticated';
  const isRestAuth = isLoadingAuth && !isAuth;
  const isL = resolveIsL(context);
  const { contentQuery, nativeGuideQuery, usageQuery } = useKangurMobileAiTutorQueries({
    apiBaseUrl, canLoadTutorCatalog: enabled && !isRestAuth, enabled, isAuthenticated: isAuth, isRestoringAuth: isRestAuth, locale, userId: session.user?.id ?? 'anonymous',
  });
  const chatM = useKangurMobileAiTutorMutation({ apiBaseUrl, context, locale });
  useEffect(() => { chatM.reset(); }, [context.surface, context.contentId, context.focusKind, context.focusId, context.questionId, context.answerRevealed]);
  const aState = resolveTutorAvailability(enabled, isRestAuth, isAuth, usageQuery.data?.message);
  const qActions = useMemo(() => isL ? [] : buildQuickActions(contentQuery.data ?? null, context, locale), [contentQuery.data, context, isL, locale]);
  const resActions = useMemo(() => (chatM.data?.followUpActions ?? []).map((a) => ({ href: resolveKangurMobileActionHref(a, { gameTarget }), id: a.id, label: a.label, reason: a.reason ?? null })), [chatM.data?.followUpActions, gameTarget]);
  const helpTarget = useMemo(() => {
    const t = chatM.data?.websiteHelpTarget as KangurAiTutorWebsiteHelpTarget | undefined;
    return (t !== undefined && t !== null) ? { href: resolveKangurMobileWebsiteHelpHref(t, { gameTarget }), label: t.label } : null;
  }, [chatM.data?.websiteHelpTarget, gameTarget]);
  return {
    availabilityMessage: resolveAvailabilityMessage(aState, locale, usageQuery.data?.message, chatM.error),
    availabilityState: aState,
    canSendMessages: aState === 'available' && !isL && qActions.length > 0,
    guideEntry: useMemo(() => selectKangurMobileAiTutorGuideEntry(nativeGuideQuery.data?.entries ?? [], context), [context, nativeGuideQuery.data?.entries]),
    interactionHint: isL ? createLockedTestPromptMessage(locale) : null,
    isLoading: resolveIsLoading(contentQuery, nativeGuideQuery, usageQuery, isAuth),
    isSending: chatM.isPending,
    quickActions: qActions,
    responseActions: resActions,
    responseMessage: resolveResponseMessage(chatM.data, chatM.error),
    sendQuickAction: async (id: string) => { if (aState === 'available') { const a = qActions.find((c) => c.id === id); if (a) await chatM.mutateAsync(a); } },
    tutorName: contentQuery.data?.common.defaultTutorName ?? FALLBACK_TUTOR_NAME[locale],
    usage: usageQuery.data?.usage ?? null,
    websiteHelpTarget: helpTarget,
  };
};
