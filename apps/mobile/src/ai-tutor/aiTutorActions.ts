import type { KangurAiTutorConversationContext } from '../../../../src/shared/contracts/kangur-ai-tutor';
import type { KangurAiTutorContent } from '../../../../src/shared/contracts/kangur-ai-tutor-content';
import type { KangurMobileAiTutorQuickAction } from './useKangurMobileAiTutorHooks';

export const buildTReviewActions = (l: 'de' | 'en' | 'pl'): KangurMobileAiTutorQuickAction[] => [
  { id: 'review', label: { de: 'Antwort besprechen', en: 'Review answer', pl: 'Omów odpowiedź' }[l], prompt: { de: 'Omów mój wynik testu: co poszło dobrze i co warto poprawić następnym razem.', en: 'Review my test result: what went well and what to improve next.', pl: 'Omów mój wynik testu: co poszło dobrze i co warto poprawić następnym razem.' }[l] },
  { id: 'next_step', label: { de: 'Co dalej?', en: 'What next?', pl: 'Co dalej?' }[l], prompt: { de: 'Powiedz, jaki powinien być mój następny krok po tym teście.', en: 'Tell me what my next step should be after this test.', pl: 'Powiedz, jaki powinien być mój następny krok po tym teście.' }[l] },
  { id: 'explain', label: { de: 'Wyjaśnij', en: 'Explain', pl: 'Wyjaśnij' }[l], prompt: { de: 'Wyjaśnij mi to prostymi słowami.', en: 'Explain this in simple words.', pl: 'Wyjaśnij mi to prostymi słowami.' }[l] },
];

export const buildGSummaryActions = (l: 'de' | 'en' | 'pl'): KangurMobileAiTutorQuickAction[] => [
  { id: 'review', label: { de: 'Omów rundę', en: 'Review the round', pl: 'Omów rundę' }[l], prompt: { de: 'Omów moją ostatnią grę: co poszło dobrze i co warto ćwiczyć dalej.', en: 'Review my latest round: what went well and what should I practise next.', pl: 'Omów moją ostatnią grę: co poszło dobrze i co warto ćwiczyć dalej.' }[l] },
  { id: 'next_step', label: { de: 'Co dalej?', en: 'What next?', pl: 'Co dalej?' }[l], prompt: { de: 'Powiedz, jaki powinien być mój następny krok po tej grze.', en: 'Tell me what my next step should be after this round.', pl: 'Powiedz, jaki powinien być mój następny krok po tej grze.' }[l] },
  { id: 'explain', label: { de: 'Wyjaśnij', en: 'Explain', pl: 'Wyjaśnij' }[l], prompt: { de: 'Wyjaśnij mi to prostymi słowami.', en: 'Explain this in simple words.', pl: 'Wyjaśnij mi to prostymi słowami.' }[l] },
];

export const buildDFallbackActions = (l: 'de' | 'en' | 'pl'): KangurMobileAiTutorQuickAction[] => [
  { id: 'hint', label: { de: 'Podpowiedź', en: 'Hint', pl: 'Podpowiedź' }[l], prompt: { de: 'Daj mi małą podpowiedź, ale bez gotowej odpowiedzi.', en: 'Give me a small hint without the final answer.', pl: 'Daj mi małą podpowiedź, ale bez gotowej odpowiedzi.' }[l] },
  { id: 'how_think', label: { de: 'Jak myśleć?', en: 'How should I think?', pl: 'Jak myśleć?' }[l], prompt: { de: 'Wyjaśnij, jak podejść do tego pytania krok po kroku, bez podawania odpowiedzi.', en: 'Explain how to approach this step by step without giving the answer.', pl: 'Wyjaśnij, jak podejść do tego pytania krok po kroku, bez podawania odpowiedzi.' }[l] },
  { id: 'next_step', label: { de: 'Co dalej?', en: 'What next?', pl: 'Co dalej?' }[l], prompt: { de: 'Powiedz, co warto ćwiczyć dalej na podstawie mojego postępu.', en: 'Tell me what is worth practising next based on my progress.', pl: 'Powiedz, co warto ćwiczyć dalej na podstawie mojego postępu.' }[l] },
];

export const buildFallbackQuickActions = (l: 'de' | 'en' | 'pl', s: string, fk: string, ans: boolean): KangurMobileAiTutorQuickAction[] => {
  const isR = fk === 'review' || fk === 'summary' || ans;
  if (s === 'test' && isR) return buildTReviewActions(l);
  if (s === 'game' && fk === 'summary') return buildGSummaryActions(l);
  return buildDFallbackActions(l);
};

export const buildCReviewActions = (cont: KangurAiTutorContent, c: KangurAiTutorConversationContext): KangurMobileAiTutorQuickAction[] => {
  const hasQ = typeof c.questionId === 'string' && c.questionId.length > 0;
  const isReviewFocus = hasQ && c.focusKind === 'review';
  const isAnswerRevealed = hasQ && c.answerRevealed === true;
  const { review, nextStep, explain } = cont.quickActions;
  
  return [
    { 
      id: 'review', 
      label: isReviewFocus ? review.questionLabel : review.resultLabel, 
      prompt: isReviewFocus ? review.questionPrompt : review.resultPrompt 
    },
    { 
      id: 'next_step', 
      label: isAnswerRevealed ? nextStep.reviewQuestionLabel : nextStep.reviewOtherLabel, 
      prompt: isAnswerRevealed ? nextStep.reviewQuestionPrompt : nextStep.reviewTestPrompt 
    },
    { id: 'explain', label: explain.defaultLabel, prompt: explain.defaultPrompt },
  ];
};

export const buildCGameActions = (cont: KangurAiTutorContent): KangurMobileAiTutorQuickAction[] => {
  const { review, nextStep, explain } = cont.quickActions;
  return [
    { id: 'review', label: review.gameLabel, prompt: review.gamePrompt },
    { id: 'next_step', label: nextStep.reviewOtherLabel, prompt: nextStep.reviewGamePrompt },
    { id: 'explain', label: explain.defaultLabel, prompt: explain.defaultPrompt },
  ];
};

export const buildCDefaultActions = (cont: KangurAiTutorContent, c: KangurAiTutorConversationContext): KangurMobileAiTutorQuickAction[] => {
  const { hint, howThink, nextStep, explain } = cont.quickActions;
  const isG = c.surface === 'game';
  return [
    { id: 'hint', label: hint.defaultLabel, prompt: hint.defaultPrompt },
    { id: 'how_think', label: howThink.defaultLabel, prompt: howThink.defaultPrompt },
    { id: 'next_step', label: isG ? nextStep.defaultLabel : explain.defaultLabel, prompt: isG ? nextStep.gamePrompt : explain.defaultPrompt },
  ];
};
