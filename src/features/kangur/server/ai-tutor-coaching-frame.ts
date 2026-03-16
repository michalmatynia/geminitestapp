import 'server-only';

import type {
  KangurAiTutorCoachingFrame,
  KangurAiTutorCoachingMode,
  KangurAiTutorConversationContext,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';

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
        'Podsumuj to, co zadziałało po wskazówce, nazwij jedną poprawkę i zakończ jednym kolejnym krokiem.',
      rationale:
        'Uczeń przeszedł od wskazówki do omówienia po zobaczeniu odpowiedzi, więc najlepsze będzie spokojne podsumowanie i jedna poprawka.',
    };
  }

  if (context?.interactionIntent === 'review' || context?.answerRevealed) {
    return {
      mode: 'review_reflection',
      label: 'Omów po próbie',
      description:
        'Podsumuj próbę, nazwij jedną poprawkę i zakończ sugestią ponownej próby.',
      rationale: context?.answerRevealed
        ? 'Odpowiedź jest już odsłonięta, więc tutor powinien skupić się na spokojnym omówieniu.'
        : 'To dobry moment na refleksję po próbie i jedną konkretną poprawkę.',
    };
  }

  if (context?.interactionIntent === 'next_step') {
    return {
      mode: 'next_best_action',
      label: 'Następny krok',
      description: 'Wskaż jedną konkretną aktywność Kangur jako najlepszy dalszy ruch.',
      rationale: 'Najwięcej wartości da teraz jedna jasna aktywność, a nie kilka opcji naraz.',
    };
  }

  if (recentHintRecoverySignal === 'focus_advanced' && !hasSelectedExcerpt) {
    return {
      mode: 'next_best_action',
      label: 'Utrwal postęp',
      description:
        'Potwierdź postęp po poprzedniej wskazówce i daj jeden konkretny dalszy krok.',
      rationale:
        'Uczeń ruszył dalej po poprzedniej wskazówce, więc zamiast kolejnej podobnej podpowiedzi lepiej utrwalić postęp jednym ruchem.',
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
      label: 'Zmień podejście',
      description:
        'Sprawdź, gdzie uczeń blokuje się w rozumowaniu, zamiast dawać kolejny taki sam trop.',
      rationale:
        previousCoachingMode === 'hint_ladder'
          ? 'Uczeń powtórzył to samo pytanie po wskazówce, więc trzeba przejść z kolejnego tropu do diagnozy rozumienia.'
          : 'Powtórzone pytanie sugeruje, że trzeba zmienić strategię i uchwycić źródło blokady.',
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
      description: 'Najpierw wyjaśnij pojęcie i sprawdź, co uczeń rozumie błędnie.',
      rationale: hasSelectedExcerpt
        ? 'Uczeń wskazał konkretny fragment, więc trzeba najpierw sprawdzić rozumienie.'
        : 'Najpierw trzeba uchwycić błąd w rozumieniu pojęcia, zanim padnie kolejna wskazówka.',
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
      description: 'Daj tylko jeden mały krok albo pytanie kontrolne, bez pełnego rozwiązania.',
      rationale:
        context?.surface === 'test' || context?.surface === 'game'
          ? 'Uczeń jest w trakcie próby, więc tutor powinien prowadzić bardzo małymi krokami.'
          : 'Niższa skuteczność sugeruje pracę małymi krokami zamiast pełnego wyjaśnienia naraz.',
    };
  }

  return {
    mode: 'misconception_check',
    label: 'Sprawdź rozumienie',
    description: 'Najpierw wyjaśnij pojęcie i sprawdź, co uczeń rozumie błędnie.',
    rationale: 'Krótka diagnoza rozumienia daje lepszy kolejny krok niż szybka odpowiedź.',
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
