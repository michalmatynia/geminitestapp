import { type ComponentType } from 'react';
import dynamic from 'next/dynamic';

import type { LessonProps } from '../lesson-ui-registry';

const loadLessonComponent = (loader: () => Promise<unknown>): ComponentType<LessonProps> =>
  dynamic<LessonProps>(
    async () => {
      const module = (await loader()) as { default: ComponentType<LessonProps> };
      return module.default;
    },
    { ssr: false }
  );

export const coreLessons = {
  art_colors_harmony: loadLessonComponent(
    () => import('@/features/kangur/ui/components/ArtColorsHarmonyLesson')
  ),
  art_shapes_basic: loadLessonComponent(
    () => import('@/features/kangur/ui/components/ArtShapesBasicLesson')
  ),
  music_diatonic_scale: loadLessonComponent(
    () => import('@/features/kangur/ui/components/MusicDiatonicScaleLesson')
  ),
  geometry_shape_recognition: loadLessonComponent(
    () => import('@/features/kangur/ui/components/GeometryShapeRecognitionLesson')
  ),
  clock: loadLessonComponent(() => import('@/features/kangur/ui/components/ClockLesson')),
  calendar: loadLessonComponent(() => import('@/features/kangur/ui/components/CalendarLesson')),
  adding: loadLessonComponent(() => import('@/features/kangur/ui/components/AddingLesson')),
  subtracting: loadLessonComponent(
    () => import('@/features/kangur/ui/components/SubtractingLesson')
  ),
  multiplication: loadLessonComponent(
    () => import('@/features/kangur/ui/components/MultiplicationLesson')
  ),
  division: loadLessonComponent(() => import('@/features/kangur/ui/components/DivisionLesson')),
  geometry_basics: loadLessonComponent(
    () => import('@/features/kangur/ui/components/GeometryBasicsLesson')
  ),
  geometry_shapes: loadLessonComponent(
    () => import('@/features/kangur/ui/components/GeometryShapesLesson')
  ),
  geometry_symmetry: loadLessonComponent(
    () => import('@/features/kangur/ui/components/GeometrySymmetryLesson')
  ),
  geometry_perimeter: loadLessonComponent(
    () => import('@/features/kangur/ui/components/GeometryPerimeterLesson')
  ),
  logical_thinking: loadLessonComponent(
    () => import('@/features/kangur/ui/components/LogicalThinkingLesson')
  ),
  logical_patterns: loadLessonComponent(
    () => import('@/features/kangur/ui/components/LogicalPatternsLesson')
  ),
  logical_classification: loadLessonComponent(
    () => import('@/features/kangur/ui/components/LogicalClassificationLesson')
  ),
  logical_reasoning: loadLessonComponent(
    () => import('@/features/kangur/ui/components/LogicalReasoningLesson')
  ),
  logical_analogies: loadLessonComponent(
    () => import('@/features/kangur/ui/components/LogicalAnalogiesLesson')
  ),
  english_basics: loadLessonComponent(
    () => import('@/features/kangur/ui/components/EnglishLesson')
  ),
  english_parts_of_speech: loadLessonComponent(
    () => import('@/features/kangur/ui/components/EnglishPartsOfSpeechLesson')
  ),
  english_sentence_structure: loadLessonComponent(
    () => import('@/features/kangur/ui/components/EnglishSentenceStructureLesson')
  ),
  english_subject_verb_agreement: loadLessonComponent(
    () => import('@/features/kangur/ui/components/EnglishSubjectVerbAgreementLesson')
  ),
  english_articles: loadLessonComponent(
    () => import('@/features/kangur/ui/components/EnglishArticlesLesson')
  ),
  english_adjectives: loadLessonComponent(
    () => import('@/features/kangur/ui/components/EnglishAdjectivesLesson')
  ),
  english_comparatives_superlatives: loadLessonComponent(
    () => import('@/features/kangur/ui/components/EnglishComparativesSuperlativesLesson')
  ),
  english_adverbs: loadLessonComponent(
    () => import('@/features/kangur/ui/components/EnglishAdverbsLesson')
  ),
  english_adverbs_frequency: loadLessonComponent(
    () => import('@/features/kangur/ui/components/EnglishAdverbsFrequencyLesson')
  ),
  english_prepositions_time_place: loadLessonComponent(
    () => import('@/features/kangur/ui/components/EnglishPrepositionsLesson')
  ),
};
