import type { KangurBadgeTrackKey } from './progress.contracts';

type KangurProgressTranslationValue = string | number;

export type KangurProgressTranslate = (
  key: string,
  values?: Record<string, KangurProgressTranslationValue>
) => string;

export type KangurProgressLocalizer = {
  translate?: KangurProgressTranslate;
};

const interpolateFallbackTemplate = (
  template: string,
  values?: Record<string, KangurProgressTranslationValue>
): string =>
  template.replace(/\{(\w+)\}/g, (match: string, token: string) => {
    const interpolationValues: Record<string, unknown> | undefined = values;
    const value = interpolationValues?.[token];
    return value === undefined ? match : String(value);
  });

const ACTIVITY_LABEL_KEYS: Record<string, string> = {
  alphabet: 'activityLabels.alphabet',
  alphabet_basics: 'activityLabels.alphabet',
  alphabet_copy: 'activityLabels.alphabetCopy',
  alphabet_syllables: 'activityLabels.alphabetSyllables',
  alphabet_words: 'activityLabels.alphabetWords',
  alphabet_matching: 'activityLabels.alphabetMatching',
  alphabet_sequence: 'activityLabels.alphabetSequence',
  art: 'activityLabels.art',
  art_colors_harmony: 'activityLabels.artColorsHarmony',
  art_shapes_basic: 'activityLabels.artShapesBasic',
  music: 'activityLabels.music',
  music_diatonic_scale: 'activityLabels.musicDiatonicScale',
  geometry: 'activityLabels.geometry',
  geometry_shape_recognition: 'activityLabels.geometryShapeRecognition',
  addition: 'activityLabels.addition',
  subtraction: 'activityLabels.subtraction',
  multiplication: 'activityLabels.multiplication',
  division: 'activityLabels.division',
  decimals: 'activityLabels.decimals',
  powers: 'activityLabels.powers',
  roots: 'activityLabels.roots',
  mixed: 'activityLabels.mixed',
  clock: 'activityLabels.clock',
  calendar: 'activityLabels.calendar',
  adding: 'activityLabels.addition',
  subtracting: 'activityLabels.subtraction',
  geometry_basics: 'activityLabels.geometryBasics',
  geometry_shapes: 'activityLabels.geometryShapes',
  geometry_symmetry: 'activityLabels.geometrySymmetry',
  geometry_perimeter: 'activityLabels.geometryPerimeter',
  logical_thinking: 'activityLabels.logicalThinking',
  logical_patterns: 'activityLabels.logicalPatterns',
  logical_classification: 'activityLabels.logicalClassification',
  logical_reasoning: 'activityLabels.logicalReasoning',
  logical_analogies: 'activityLabels.logicalAnalogies',
  logical: 'activityLabels.logical',
};

const CLOCK_SECTION_LABEL_KEYS: Record<string, string> = {
  hours: 'clockSections.hours',
  minutes: 'clockSections.minutes',
  combined: 'clockSections.combined',
  mixed: 'clockSections.mixed',
};

const LEVEL_TITLE_KEYS: Record<number, string> = {
  1: 'levels.1',
  2: 'levels.2',
  3: 'levels.3',
  4: 'levels.4',
  5: 'levels.5',
  6: 'levels.6',
  7: 'levels.7',
};

const BADGE_TRACK_LABEL_KEYS: Record<KangurBadgeTrackKey, string> = {
  onboarding: 'badgeTracks.onboarding',
  consistency: 'badgeTracks.consistency',
  mastery: 'badgeTracks.mastery',
  variety: 'badgeTracks.variety',
  challenge: 'badgeTracks.challenge',
  xp: 'badgeTracks.xp',
  quest: 'badgeTracks.quest',
  english: 'badgeTracks.english',
};

const BADGE_NAME_KEYS: Record<string, string> = {
  first_game: 'badges.first_game.name',
  perfect_10: 'badges.perfect_10.name',
  lesson_hero: 'badges.lesson_hero.name',
  clock_master: 'badges.clock_master.name',
  calendar_keeper: 'badges.calendar_keeper.name',
  geometry_artist: 'badges.geometry_artist.name',
  streak_3: 'badges.streak_3.name',
  accuracy_ace: 'badges.accuracy_ace.name',
  ten_games: 'badges.ten_games.name',
  xp_500: 'badges.xp_500.name',
  xp_1000: 'badges.xp_1000.name',
  quest_starter: 'badges.quest_starter.name',
  quest_keeper: 'badges.quest_keeper.name',
  guided_step: 'badges.guided_step.name',
  guided_keeper: 'badges.guided_keeper.name',
  mastery_builder: 'badges.mastery_builder.name',
  variety: 'badges.variety.name',
  english_first_game: 'badges.english_first_game.name',
  english_perfect: 'badges.english_perfect.name',
  english_pronoun_pro: 'badges.english_pronoun_pro.name',
  english_sorter_star: 'badges.english_sorter_star.name',
  english_sentence_builder: 'badges.english_sentence_builder.name',
  english_agreement_guardian: 'badges.english_agreement_guardian.name',
  english_grammar_collection: 'badges.english_grammar_collection.name',
  english_articles_reader: 'badges.english_articles_reader.name',
  english_mastery_builder: 'badges.english_mastery_builder.name',
};

const BADGE_DESC_KEYS: Record<string, string> = {
  first_game: 'badges.first_game.desc',
  perfect_10: 'badges.perfect_10.desc',
  lesson_hero: 'badges.lesson_hero.desc',
  clock_master: 'badges.clock_master.desc',
  calendar_keeper: 'badges.calendar_keeper.desc',
  geometry_artist: 'badges.geometry_artist.desc',
  streak_3: 'badges.streak_3.desc',
  accuracy_ace: 'badges.accuracy_ace.desc',
  ten_games: 'badges.ten_games.desc',
  xp_500: 'badges.xp_500.desc',
  xp_1000: 'badges.xp_1000.desc',
  quest_starter: 'badges.quest_starter.desc',
  quest_keeper: 'badges.quest_keeper.desc',
  guided_step: 'badges.guided_step.desc',
  guided_keeper: 'badges.guided_keeper.desc',
  mastery_builder: 'badges.mastery_builder.desc',
  variety: 'badges.variety.desc',
  english_first_game: 'badges.english_first_game.desc',
  english_perfect: 'badges.english_perfect.desc',
  english_pronoun_pro: 'badges.english_pronoun_pro.desc',
  english_sorter_star: 'badges.english_sorter_star.desc',
  english_sentence_builder: 'badges.english_sentence_builder.desc',
  english_agreement_guardian: 'badges.english_agreement_guardian.desc',
  english_grammar_collection: 'badges.english_grammar_collection.desc',
  english_articles_reader: 'badges.english_articles_reader.desc',
  english_mastery_builder: 'badges.english_mastery_builder.desc',
};

const REWARD_BREAKDOWN_LABEL_KEYS: Record<string, string> = {
  base: 'rewardBreakdown.base',
  accuracy: 'rewardBreakdown.accuracy',
  difficulty: 'rewardBreakdown.difficulty',
  speed: 'rewardBreakdown.speed',
  streak: 'rewardBreakdown.streak',
  first_activity: 'rewardBreakdown.firstActivity',
  improvement: 'rewardBreakdown.improvement',
  mastery: 'rewardBreakdown.mastery',
  variety: 'rewardBreakdown.variety',
  guided_focus: 'rewardBreakdown.guidedFocus',
  perfect: 'rewardBreakdown.perfect',
  anti_repeat: 'rewardBreakdown.antiRepeat',
  minimum_floor: 'rewardBreakdown.minimumFloor',
  daily_quest: 'rewardBreakdown.dailyQuest',
};

export const translateKangurProgressWithFallback = (
  translate: KangurProgressTranslate | undefined,
  key: string,
  fallback: string,
  values?: Record<string, KangurProgressTranslationValue>
): string => {
  if (!translate) {
    return interpolateFallbackTemplate(fallback, values);
  }

  const translated = translate(key, values);
  return translated === key || translated.endsWith(`.${key}`)
    ? interpolateFallbackTemplate(fallback, values)
    : interpolateFallbackTemplate(translated, values);
};

export const getLocalizedKangurProgressTokenLabel = ({
  token,
  fallback,
  translate,
}: {
  token: string;
  fallback: string;
  translate?: KangurProgressTranslate;
}): string => {
  const key = ACTIVITY_LABEL_KEYS[token];
  if (!key) {
    return fallback;
  }

  return translateKangurProgressWithFallback(translate, key, fallback);
};

export const getLocalizedKangurClockSectionLabel = ({
  token,
  fallback,
  translate,
}: {
  token: string;
  fallback: string;
  translate?: KangurProgressTranslate;
}): string => {
  const key = CLOCK_SECTION_LABEL_KEYS[token];
  if (!key) {
    return fallback;
  }

  return translateKangurProgressWithFallback(translate, key, fallback);
};

export const getLocalizedKangurProgressLevelTitle = ({
  level,
  fallback,
  translate,
}: {
  level: number;
  fallback: string;
  translate?: KangurProgressTranslate;
}): string => {
  const key = LEVEL_TITLE_KEYS[level];
  if (!key) {
    return fallback;
  }

  return translateKangurProgressWithFallback(translate, key, fallback);
};

export const getLocalizedKangurBadgeTrackLabel = ({
  key,
  fallback,
  translate,
}: {
  key: KangurBadgeTrackKey;
  fallback: string;
  translate?: KangurProgressTranslate;
}): string =>
  translateKangurProgressWithFallback(
    translate,
    BADGE_TRACK_LABEL_KEYS[key],
    fallback
  );

export const getLocalizedKangurBadgeName = ({
  badgeId,
  fallback,
  translate,
}: {
  badgeId: string;
  fallback: string;
  translate?: KangurProgressTranslate;
}): string => {
  const key = BADGE_NAME_KEYS[badgeId];
  if (!key) {
    return fallback;
  }

  return translateKangurProgressWithFallback(translate, key, fallback);
};

export const getLocalizedKangurBadgeDescription = ({
  badgeId,
  fallback,
  translate,
}: {
  badgeId: string;
  fallback: string;
  translate?: KangurProgressTranslate;
}): string => {
  const key = BADGE_DESC_KEYS[badgeId];
  if (!key) {
    return fallback;
  }

  return translateKangurProgressWithFallback(translate, key, fallback);
};

export const getLocalizedKangurRewardBreakdownLabel = ({
  kind,
  fallback,
  translate,
}: {
  kind: string;
  fallback: string;
  translate?: KangurProgressTranslate;
}): string => {
  const key = REWARD_BREAKDOWN_LABEL_KEYS[kind];
  if (!key) {
    return fallback;
  }

  return translateKangurProgressWithFallback(translate, key, fallback);
};

const getLocalizedBadgeSummaryByKind = ({
  kind,
  current,
  target,
  fallback,
  translate,
}: {
  kind:
    | 'game'
    | 'perfectGame'
    | 'lesson'
    | 'perfect'
    | 'streak'
    | 'questions'
    | 'percentGoal'
    | 'games'
    | 'xp'
    | 'quest'
    | 'round'
    | 'types'
    | 'sessions';
  current: number;
  target: number;
  fallback: string;
  translate?: KangurProgressTranslate;
}): string =>
  translateKangurProgressWithFallback(
    translate,
    `badgeSummaries.${kind}`,
    fallback,
    { current, target }
  );

export const getLocalizedKangurBadgeSummary = ({
  badgeId,
  current,
  target,
  fallback,
  translate,
}: {
  badgeId: string;
  current: number;
  target: number;
  fallback: string;
  translate?: KangurProgressTranslate;
}): string => {
  switch (badgeId) {
    case 'first_game':
    case 'english_first_game':
      return getLocalizedBadgeSummaryByKind({ kind: 'game', current, target, fallback, translate });
    case 'perfect_10':
      return getLocalizedBadgeSummaryByKind({
        kind: 'perfectGame',
        current,
        target,
        fallback,
        translate,
      });
    case 'lesson_hero':
    case 'mastery_builder':
    case 'english_articles_reader':
    case 'english_mastery_builder':
      return getLocalizedBadgeSummaryByKind({
        kind: 'lesson',
        current,
        target,
        fallback,
        translate,
      });
    case 'clock_master':
    case 'calendar_keeper':
    case 'geometry_artist':
    case 'english_perfect':
    case 'english_pronoun_pro':
    case 'english_sorter_star':
    case 'english_agreement_guardian':
      return getLocalizedBadgeSummaryByKind({
        kind: 'perfect',
        current,
        target,
        fallback,
        translate,
      });
    case 'streak_3':
      return getLocalizedBadgeSummaryByKind({ kind: 'streak', current, target, fallback, translate });
    case 'accuracy_ace':
      return getLocalizedBadgeSummaryByKind({
        kind: target >= 85 ? 'percentGoal' : 'questions',
        current,
        target,
        fallback,
        translate,
      });
    case 'ten_games':
    case 'english_grammar_collection':
      return getLocalizedBadgeSummaryByKind({ kind: 'games', current, target, fallback, translate });
    case 'xp_500':
    case 'xp_1000':
      return getLocalizedBadgeSummaryByKind({ kind: 'xp', current, target, fallback, translate });
    case 'quest_starter':
    case 'quest_keeper':
      return getLocalizedBadgeSummaryByKind({ kind: 'quest', current, target, fallback, translate });
    case 'guided_step':
    case 'guided_keeper':
      return getLocalizedBadgeSummaryByKind({ kind: 'round', current, target, fallback, translate });
    case 'variety':
      return getLocalizedBadgeSummaryByKind({ kind: 'types', current, target, fallback, translate });
    case 'english_sentence_builder':
      return getLocalizedBadgeSummaryByKind({
        kind: target >= 80 ? 'percentGoal' : 'sessions',
        current,
        target,
        fallback,
        translate,
      });
    default:
      return fallback;
  }
};
