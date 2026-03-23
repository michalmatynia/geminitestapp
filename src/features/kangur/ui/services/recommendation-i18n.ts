import type { TranslationValues } from 'use-intl';
import type { KangurProgressTranslate } from '@/features/kangur/ui/services/progress-i18n';

type RecommendationTranslationValues = TranslationValues;

export type RecommendationTranslate = (
  key: string,
  values?: RecommendationTranslationValues
) => string;

export type KangurRecommendationLocalizerDto = {
  locale?: string | null;
  translate?: RecommendationTranslate;
  progressTranslate?: KangurProgressTranslate;
};
export type KangurRecommendationLocalizer = KangurRecommendationLocalizerDto;

const ACTIVITY_LABEL_KEY_BY_PRIMARY: Record<string, string> = {
  adding: 'addition',
  addition: 'addition',
  subtracting: 'subtraction',
  subtraction: 'subtraction',
  multiplication: 'multiplication',
  division: 'division',
  decimals: 'decimals',
  powers: 'powers',
  roots: 'roots',
  mixed: 'mixed',
  clock: 'clock',
  calendar: 'calendar',
  geometry: 'geometry',
  geometry_shape_recognition: 'geometry',
  geometry_basics: 'geometry',
  geometry_shapes: 'geometry',
  geometry_symmetry: 'geometry',
  geometry_perimeter: 'geometry',
  logical_thinking: 'logical',
  logical_patterns: 'logical',
  logical_classification: 'logical',
  logical_reasoning: 'logical',
  logical_analogies: 'logical',
  english_pronoun_remix: 'english_basics',
  english_parts_of_speech_sort: 'english_parts_of_speech',
  english_pronouns_warmup: 'english_parts_of_speech',
  english_sentence_structure_quiz: 'english_sentence_structure',
  english_subject_verb_agreement_quiz: 'english_subject_verb_agreement',
  english_articles_drag_drop: 'english_articles',
  english_adjectives_scene_studio: 'english_adjectives',
  english_prepositions_quiz: 'english_prepositions_time_place',
  english_prepositions_sort: 'english_prepositions_time_place',
  english_prepositions_order: 'english_prepositions_time_place',
};

export const translateRecommendationWithFallback = (
  translate: RecommendationTranslate | undefined,
  key: string,
  fallback: string,
  values?: RecommendationTranslationValues
): string => {
  if (!translate) {
    return fallback;
  }

  const translated = translate(key, values);
  return translated === key ? fallback : translated;
};

export const resolveLocalizedRecommendationActivityLabel = ({
  activityKey,
  fallbackLabel,
  translate,
}: {
  activityKey: string;
  fallbackLabel: string;
  translate?: RecommendationTranslate;
}): string => {
  const parts = activityKey.split(':');
  const rawPrimary = parts[1] ?? parts[0] ?? '';
  const normalizedPrimary = rawPrimary.trim();
  const labelKey = ACTIVITY_LABEL_KEY_BY_PRIMARY[normalizedPrimary];

  if (!labelKey) {
    return fallbackLabel;
  }

  return translateRecommendationWithFallback(
    translate,
    `activityLabels.${labelKey}`,
    fallbackLabel
  );
};
