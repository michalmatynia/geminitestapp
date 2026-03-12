import 'server-only';

import type {
  KangurAiTutorCoachingFrame,
  KangurAiTutorCoachingMode,
  KangurAiTutorConversationContext,
} from '@/shared/contracts/kangur-ai-tutor';

// ---------------------------------------------------------------------------
// Coaching mode instruction map
// ---------------------------------------------------------------------------

export const COACHING_MODE_INSTRUCTIONS: Record<KangurAiTutorCoachingMode, string> = {
  hint_ladder:
    'Use a hint ladder: give one small next step or one checkpoint question, then stop.',
  misconception_check:
    'Diagnose the misunderstanding first: explain the concept simply before asking for the next attempt.',
  review_reflection:
    'Use review reflection: explain what happened, name one improvement, and finish with one retry idea.',
  next_best_action:
    'Recommend exactly one concrete Kangur action that best matches the learner context.',
};

// ---------------------------------------------------------------------------
// Coaching frame builder
// ---------------------------------------------------------------------------

export const buildKangurAiTutorCoachingFrame = (input: {
  context: KangurAiTutorConversationContext | undefined;
  averageAccuracy: number;
  weakMasteryPercent: number;
  previousCoachingMode: KangurAiTutorCoachingMode | null;
}): KangurAiTutorCoachingFrame => {
  const { context, averageAccuracy, previousCoachingMode, weakMasteryPercent } = input;
  const hasSelectedExcerpt =
    Boolean(context?.selectedText) ||
    context?.focusKind === 'selection' ||
    context?.promptMode === 'selected_text';
  const repeatedQuestionCount = context?.repeatedQuestionCount ?? 0;
  const recentHintRecoverySignal = context?.recentHintRecoverySignal ?? null;

  if (recentHintRecoverySignal === 'answer_revealed') {
    return {
      mode: 'review_reflection',
      label: 'Omów po wskazówce',
      description:
        'Podsumuj to, co zadziałało po wskazówce, nazwij jedna poprawke i zakończ jednym kolejnym krokiem.',
      rationale:
        'Uczeń przeszedł od wskazówki do omówienia po zobaczeniu odpowiedzi, wiec najlepsze będzie spokojne podsumowanie i jedna poprawka.',
    };
  }

  if (context?.interactionIntent === 'review' || context?.answerRevealed) {
    return {
      mode: 'review_reflection',
      label: 'Omów po próbie',
      description:
        'Podsumuj próbę, nazwij jedna poprawke i zakończ sugestia ponownej próby.',
      rationale: context?.answerRevealed
        ? 'Odpowiedz jest już odslonieta, wiec tutor powinien skupic się na spokojnym omowieniu.'
        : 'To dobry moment na refleksje po próbie i jedna konkretna poprawke.',
    };
  }

  if (context?.interactionIntent === 'next_step') {
    return {
      mode: 'next_best_action',
      label: 'Następny krok',
      description: 'Wskaz jedna konkretna aktywność Kangur jako najlepszy dalszy ruch.',
      rationale: 'Najwięcej wartosci da teraz jedna jasna aktywność, a nie kilka opcji naraz.',
    };
  }

  if (recentHintRecoverySignal === 'focus_advanced' && !hasSelectedExcerpt) {
    return {
      mode: 'next_best_action',
      label: 'Utrwal postęp',
      description:
        'Potwierdź postęp po poprzedniej wskazówce i daj jeden konkretny dalszy krok.',
      rationale:
        'Uczeń ruszyl dalej po poprzedniej wskazówce, wiec zamiast kolejnej podobnej podpowiedzi lepiej utrwalic postęp jednym ruchem.',
    };
  }

  if (
    repeatedQuestionCount > 0 &&
    (context?.promptMode === 'hint' ||
      context?.interactionIntent === 'hint' ||
      context?.surface === 'test' ||
      context?.surface === 'game' ||
      context?.focusKind === 'question')
  ) {
    return {
      mode: 'misconception_check',
      label: 'Zmien podejscie',
      description:
        'Sprawdź, gdzie uczeń blokuje się w rozumowaniu, zamiast dawac kolejny taki sam trop.',
      rationale:
        previousCoachingMode === 'hint_ladder'
          ? 'Uczeń powtorzyl to samo pytanie po wskazówce, wiec trzeba przejść z kolejnego tropu do diagnozy rozumienia.'
          : 'Powtorzone pytanie sugeruje, ze trzeba zmienic strategie i uchwycic zrodlo blokady.',
    };
  }

  if (
    hasSelectedExcerpt ||
    context?.promptMode === 'explain' ||
    context?.interactionIntent === 'explain'
  ) {
    return {
      mode: 'misconception_check',
      label: 'Sprawdź rozumienie',
      description: 'Najpierw wyjaśnij pojecie i sprawdź, co uczeń rozumie blednie.',
      rationale: hasSelectedExcerpt
        ? 'Uczeń wskazal konkretny fragment, wiec trzeba najpierw sprawdzić rozumienie.'
        : 'Najpierw trzeba uchwycic blad w rozumieniu pojecia, zanim padnie kolejna wskazówka.',
    };
  }

  if (
    context?.promptMode === 'hint' ||
    context?.interactionIntent === 'hint' ||
    context?.surface === 'test' ||
    context?.surface === 'game' ||
    context?.focusKind === 'question' ||
    averageAccuracy < 70 ||
    weakMasteryPercent < 60
  ) {
    return {
      mode: 'hint_ladder',
      label: 'Jeden trop',
      description: 'Daj tylko jeden mały krok albo pytanie kontrolne, bez pelnego rozwiązania.',
      rationale:
        context?.surface === 'test' || context?.surface === 'game'
          ? 'Uczeń jest w trakcie próby, wiec tutor powinien prowadzić bardzo malymi krokami.'
          : 'Nizsza skuteczność sugeruje prace malymi krokami zamiast pelnego wyjaśnienia naraz.',
    };
  }

  return {
    mode: 'misconception_check',
    label: 'Sprawdź rozumienie',
    description: 'Najpierw wyjaśnij pojecie i sprawdź, co uczeń rozumie blednie.',
    rationale: 'Krótka diagnoza rozumienia daje lepszy kolejny krok niż szybka odpowiedz.',
  };
};

// ---------------------------------------------------------------------------
// Coaching frame instruction appender
// ---------------------------------------------------------------------------

export const appendCoachingFrameInstructions = (
  lines: string[],
  coachingFrame: KangurAiTutorCoachingFrame
): void => {
  lines.push(
    `Structured coaching mode: ${coachingFrame.mode}. ${COACHING_MODE_INSTRUCTIONS[coachingFrame.mode]}`
  );

  if (coachingFrame.rationale) {
    lines.push(`Mode rationale: ${coachingFrame.rationale}`);
  }
};
