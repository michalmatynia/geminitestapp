'use client';

import { useMemo, useRef, type RefObject } from 'react';

import { useKangurMusicPianoRollLaunchableScreenRefs } from '@/features/kangur/ui/pages/music-piano-roll-launchable-screen-refs';
import { type KangurLaunchableGameScreen } from '@/features/kangur/ui/services/game-launch';

export type GameLaunchableScreenRefs = Record<
  KangurLaunchableGameScreen,
  RefObject<HTMLDivElement | null>
>;

export function useGameLaunchableScreenRefs(): GameLaunchableScreenRefs {
  const agenticApprovalGateQuizRef = useRef<HTMLDivElement | null>(null);
  const agenticPromptTrimQuizRef = useRef<HTMLDivElement | null>(null);
  const agenticReasoningRouterQuizRef = useRef<HTMLDivElement | null>(null);
  const agenticSurfaceMatchQuizRef = useRef<HTMLDivElement | null>(null);
  const alphabetFirstWordsQuizRef = useRef<HTMLDivElement | null>(null);
  const alphabetLetterMatchingQuizRef = useRef<HTMLDivElement | null>(null);
  const alphabetLetterOrderQuizRef = useRef<HTMLDivElement | null>(null);
  const artColorHarmonyQuizRef = useRef<HTMLDivElement | null>(null);
  const artShapeRotationQuizRef = useRef<HTMLDivElement | null>(null);
  const calendarQuizRef = useRef<HTMLDivElement | null>(null);
  const geometryQuizRef = useRef<HTMLDivElement | null>(null);
  const geometryShapeSpotterQuizRef = useRef<HTMLDivElement | null>(null);
  const clockQuizRef = useRef<HTMLDivElement | null>(null);
  const musicLaunchableGameScreenRefs = useKangurMusicPianoRollLaunchableScreenRefs();
  const additionQuizRef = useRef<HTMLDivElement | null>(null);
  const addingSynthesisQuizRef = useRef<HTMLDivElement | null>(null);
  const subtractionQuizRef = useRef<HTMLDivElement | null>(null);
  const multiplicationArrayQuizRef = useRef<HTMLDivElement | null>(null);
  const divisionQuizRef = useRef<HTMLDivElement | null>(null);
  const multiplicationQuizRef = useRef<HTMLDivElement | null>(null);
  const logicalPatternsQuizRef = useRef<HTMLDivElement | null>(null);
  const logicalClassificationQuizRef = useRef<HTMLDivElement | null>(null);
  const logicalAnalogiesQuizRef = useRef<HTMLDivElement | null>(null);
  const englishSubjectVerbAgreementQuizRef = useRef<HTMLDivElement | null>(null);
  const englishAdjectivesQuizRef = useRef<HTMLDivElement | null>(null);
  const englishCompareAndCrownQuizRef = useRef<HTMLDivElement | null>(null);
  const englishAdverbsQuizRef = useRef<HTMLDivElement | null>(null);
  const englishAdverbsFrequencyQuizRef = useRef<HTMLDivElement | null>(null);
  const englishArticlesQuizRef = useRef<HTMLDivElement | null>(null);
  const englishPrepositionsQuizRef = useRef<HTMLDivElement | null>(null);
  const englishPrepositionsSortQuizRef = useRef<HTMLDivElement | null>(null);
  const englishPrepositionsOrderQuizRef = useRef<HTMLDivElement | null>(null);
  const englishPronounsWarmupQuizRef = useRef<HTMLDivElement | null>(null);
  const englishSentenceQuizRef = useRef<HTMLDivElement | null>(null);
  const englishPartsOfSpeechQuizRef = useRef<HTMLDivElement | null>(null);

  return useMemo(
    () => ({
      agentic_approval_gate_quiz: agenticApprovalGateQuizRef,
      agentic_prompt_trim_quiz: agenticPromptTrimQuizRef,
      agentic_reasoning_router_quiz: agenticReasoningRouterQuizRef,
      agentic_surface_match_quiz: agenticSurfaceMatchQuizRef,
      alphabet_first_words_quiz: alphabetFirstWordsQuizRef,
      alphabet_letter_matching_quiz: alphabetLetterMatchingQuizRef,
      alphabet_letter_order_quiz: alphabetLetterOrderQuizRef,
      art_color_harmony_quiz: artColorHarmonyQuizRef,
      art_shape_rotation_quiz: artShapeRotationQuizRef,
      calendar_quiz: calendarQuizRef,
      geometry_quiz: geometryQuizRef,
      geometry_shape_spotter_quiz: geometryShapeSpotterQuizRef,
      clock_quiz: clockQuizRef,
      ...musicLaunchableGameScreenRefs,
      addition_quiz: additionQuizRef,
      adding_synthesis_quiz: addingSynthesisQuizRef,
      subtraction_quiz: subtractionQuizRef,
      multiplication_array_quiz: multiplicationArrayQuizRef,
      multiplication_quiz: multiplicationQuizRef,
      division_quiz: divisionQuizRef,
      logical_patterns_quiz: logicalPatternsQuizRef,
      logical_classification_quiz: logicalClassificationQuizRef,
      logical_analogies_quiz: logicalAnalogiesQuizRef,
      english_subject_verb_agreement_quiz: englishSubjectVerbAgreementQuizRef,
      english_going_to_quiz: englishSentenceQuizRef,
      english_adjectives_quiz: englishAdjectivesQuizRef,
      english_compare_and_crown_quiz: englishCompareAndCrownQuizRef,
      english_adverbs_quiz: englishAdverbsQuizRef,
      english_adverbs_frequency_quiz: englishAdverbsFrequencyQuizRef,
      english_articles_quiz: englishArticlesQuizRef,
      english_prepositions_quiz: englishPrepositionsQuizRef,
      english_prepositions_sort_quiz: englishPrepositionsSortQuizRef,
      english_prepositions_order_quiz: englishPrepositionsOrderQuizRef,
      english_pronouns_warmup_quiz: englishPronounsWarmupQuizRef,
      english_sentence_quiz: englishSentenceQuizRef,
      english_parts_of_speech_quiz: englishPartsOfSpeechQuizRef,
    }),
    [
      additionQuizRef,
      addingSynthesisQuizRef,
      agenticApprovalGateQuizRef,
      agenticPromptTrimQuizRef,
      agenticReasoningRouterQuizRef,
      agenticSurfaceMatchQuizRef,
      alphabetFirstWordsQuizRef,
      alphabetLetterMatchingQuizRef,
      alphabetLetterOrderQuizRef,
      artColorHarmonyQuizRef,
      artShapeRotationQuizRef,
      calendarQuizRef,
      clockQuizRef,
      divisionQuizRef,
      englishAdjectivesQuizRef,
      englishAdverbsFrequencyQuizRef,
      englishAdverbsQuizRef,
      englishArticlesQuizRef,
      englishCompareAndCrownQuizRef,
      englishPartsOfSpeechQuizRef,
      englishPrepositionsOrderQuizRef,
      englishPrepositionsQuizRef,
      englishPrepositionsSortQuizRef,
      englishPronounsWarmupQuizRef,
      englishSentenceQuizRef,
      englishSubjectVerbAgreementQuizRef,
      geometryQuizRef,
      geometryShapeSpotterQuizRef,
      logicalAnalogiesQuizRef,
      logicalClassificationQuizRef,
      logicalPatternsQuizRef,
      multiplicationArrayQuizRef,
      multiplicationQuizRef,
      musicLaunchableGameScreenRefs,
      subtractionQuizRef,
    ]
  );
}
