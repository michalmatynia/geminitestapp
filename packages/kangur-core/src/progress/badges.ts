import type { KangurProgressState } from '@kangur/contracts';

export type KangurBadgeTrackKey =
  | 'onboarding'
  | 'consistency'
  | 'mastery'
  | 'variety'
  | 'challenge'
  | 'xp'
  | 'quest'
  | 'english';

export type KangurBadge = {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  track: KangurBadgeTrackKey;
  progress: (progress: KangurProgressState) => {
    current: number;
    target: number;
    summary: string;
  };
};

export type KangurBadgeProgress = {
  current: number;
  target: number;
  summary: string;
  isUnlocked: boolean;
  progressPercent: number;
};

export type KangurBadgeStatus = KangurBadge & KangurBadgeProgress;

export type KangurBadgeTrackSummary = {
  key: KangurBadgeTrackKey;
  label: string;
  emoji: string;
  unlockedCount: number;
  totalCount: number;
  progressPercent: number;
  nextBadge: KangurBadgeStatus | null;
  badges: KangurBadgeStatus[];
};

export type KangurVisibleBadgeOptions = {
  maxLocked?: number;
  minimumLockedProgressPercent?: number;
};

export type KangurBadgeTrackOptions = {
  maxTracks?: number;
  minimumTrackProgressPercent?: number;
};

export const BADGE_TRACK_META: Record<
  KangurBadgeTrackKey,
  { label: string; emoji: string; order: number }
> = {
  onboarding: { label: 'Start', emoji: '🚀', order: 1 },
  consistency: { label: 'Seria', emoji: '🔥', order: 2 },
  mastery: { label: 'Mistrzostwo', emoji: '🏗️', order: 3 },
  variety: { label: 'Różnorodność', emoji: '🎲', order: 4 },
  challenge: { label: 'Wyzwania', emoji: '🎯', order: 5 },
  xp: { label: 'XP', emoji: '⭐', order: 6 },
  quest: { label: 'Misje', emoji: '🧭', order: 7 },
  english: { label: 'Angielski', emoji: '🇬🇧', order: 8 },
};

export const getBadgeTrackMeta = (
  key: KangurBadgeTrackKey,
): { label: string; emoji: string; order: number } => BADGE_TRACK_META[key];

export const GUIDED_BADGE_IDS = new Set(['guided_step', 'guided_keeper']);

export const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

export function getAverageAccuracyPercent(progress: KangurProgressState): number {
  const totalQuestionsAnswered = progress.totalQuestionsAnswered ?? 0;
  if (totalQuestionsAnswered <= 0) {
    return 0;
  }

  return clampPercent(((progress.totalCorrectAnswers ?? 0) / totalQuestionsAnswered) * 100);
}

export const getMasteredLessonCount = (
  progress: KangurProgressState,
  minimumMasteryPercent = 75,
): number =>
  Object.values(progress.lessonMastery).filter(
    (entry) => entry.masteryPercent >= clampPercent(minimumMasteryPercent),
  ).length;

const ENGLISH_ACTIVITY_KEYS = [
  'english_pronoun_remix',
  'english_parts_of_speech_sort',
  'english_pronouns_warmup',
  'english_sentence_structure_quiz',
  'english_subject_verb_agreement_quiz',
  'english_prepositions_quiz',
  'english_prepositions_sort',
  'english_prepositions_order',
];

const createEmptyActivityStatsEntry = () => ({
  sessionsPlayed: 0,
  perfectSessions: 0,
  totalCorrectAnswers: 0,
  totalQuestionsAnswered: 0,
  totalXpEarned: 0,
  bestScorePercent: 0,
  lastScorePercent: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastPlayedAt: null,
});

const getActivityStatsEntry = (progress: KangurProgressState, activityKey: string) =>
  progress.activityStats?.[activityKey] ?? createEmptyActivityStatsEntry();

const getEnglishActivityTotals = (progress: KangurProgressState) =>
  ENGLISH_ACTIVITY_KEYS.reduce(
    (acc, key) => {
      const stats = getActivityStatsEntry(progress, key);
      return {
        sessionsPlayed: acc.sessionsPlayed + stats.sessionsPlayed,
        perfectSessions: acc.perfectSessions + stats.perfectSessions,
        totalCorrectAnswers: acc.totalCorrectAnswers + stats.totalCorrectAnswers,
        totalQuestionsAnswered: acc.totalQuestionsAnswered + stats.totalQuestionsAnswered,
      };
    },
    {
      sessionsPlayed: 0,
      perfectSessions: 0,
      totalCorrectAnswers: 0,
      totalQuestionsAnswered: 0,
    },
  );

const getEnglishActivitiesPlayedCount = (progress: KangurProgressState): number =>
  ENGLISH_ACTIVITY_KEYS.filter(
    (key) => getActivityStatsEntry(progress, key).sessionsPlayed > 0,
  ).length;

const getEnglishMasteredLessonCount = (
  progress: KangurProgressState,
  minimumMasteryPercent = 75,
): number =>
  Object.entries(progress.lessonMastery).filter(
    ([key, entry]) =>
      key.startsWith('english_') && entry.masteryPercent >= clampPercent(minimumMasteryPercent),
  ).length;

export const BADGES: KangurBadge[] = [
  {
    id: 'first_game',
    emoji: '🎮',
    name: 'Pierwsza gra',
    desc: 'Ukończ pierwszą grę',
    track: 'onboarding',
    progress: (progress) => ({
      current: progress.gamesPlayed,
      target: 1,
      summary: `${Math.min(progress.gamesPlayed, 1)}/1 gra`,
    }),
  },
  {
    id: 'perfect_10',
    emoji: '💯',
    name: 'Idealny wynik',
    desc: 'Zdobądź pełny wynik w grze',
    track: 'challenge',
    progress: (progress) => ({
      current: progress.perfectGames,
      target: 1,
      summary: `${Math.min(progress.perfectGames, 1)}/1 idealna gra`,
    }),
  },
  {
    id: 'lesson_hero',
    emoji: '📚',
    name: 'Bohater lekcji',
    desc: 'Ukończ pierwszą lekcję',
    track: 'onboarding',
    progress: (progress) => ({
      current: progress.lessonsCompleted,
      target: 1,
      summary: `${Math.min(progress.lessonsCompleted, 1)}/1 lekcja`,
    }),
  },
  {
    id: 'clock_master',
    emoji: '🕐',
    name: 'Mistrz zegara',
    desc: 'Ukończ trening zegara z wynikiem 5/5',
    track: 'mastery',
    progress: (progress) => ({
      current: progress.clockPerfect,
      target: 1,
      summary: `${Math.min(progress.clockPerfect, 1)}/1 perfect`,
    }),
  },
  {
    id: 'calendar_keeper',
    emoji: '📅',
    name: 'Mistrz kalendarza',
    desc: 'Ukończ trening kalendarza z pełnym wynikiem',
    track: 'mastery',
    progress: (progress) => ({
      current: progress.calendarPerfect,
      target: 1,
      summary: `${Math.min(progress.calendarPerfect, 1)}/1 perfect`,
    }),
  },
  {
    id: 'geometry_artist',
    emoji: '🔷',
    name: 'Artysta figur',
    desc: 'Ukończ trening figur geometrycznych z pełnym wynikiem',
    track: 'mastery',
    progress: (progress) => ({
      current: progress.geometryPerfect,
      target: 1,
      summary: `${Math.min(progress.geometryPerfect, 1)}/1 perfect`,
    }),
  },
  {
    id: 'streak_3',
    emoji: '🔥',
    name: 'Seria mocy',
    desc: 'Utrzymaj 3 mocne rundy z rzędu',
    track: 'consistency',
    progress: (progress) => ({
      current: progress.bestWinStreak ?? 0,
      target: 3,
      summary: `${Math.min(progress.bestWinStreak ?? 0, 3)}/3 w serii`,
    }),
  },
  {
    id: 'accuracy_ace',
    emoji: '🎯',
    name: 'Celny umysł',
    desc: 'Utrzymaj średnio co najmniej 85% poprawnych odpowiedzi po 25 pytaniach',
    track: 'challenge',
    progress: (progress) => {
      const totalQuestionsAnswered = progress.totalQuestionsAnswered ?? 0;
      const averageAccuracy = getAverageAccuracyPercent(progress);
      if (totalQuestionsAnswered < 25) {
        return {
          current: totalQuestionsAnswered,
          target: 25,
          summary: `${totalQuestionsAnswered}/25 pytań`,
        };
      }

      return {
        current: averageAccuracy,
        target: 85,
        summary: `${averageAccuracy}% / 85%`,
      };
    },
  },
  {
    id: 'ten_games',
    emoji: '🔟',
    name: 'Dziesiątka',
    desc: 'Zagraj 10 gier',
    track: 'consistency',
    progress: (progress) => ({
      current: progress.gamesPlayed,
      target: 10,
      summary: `${Math.min(progress.gamesPlayed, 10)}/10 gier`,
    }),
  },
  {
    id: 'xp_500',
    emoji: '⭐',
    name: 'Pół tysiąca XP',
    desc: 'Zdobądź 500 XP łącznie',
    track: 'xp',
    progress: (progress) => ({
      current: progress.totalXp,
      target: 500,
      summary: `${Math.min(progress.totalXp, 500)}/500 XP`,
    }),
  },
  {
    id: 'xp_1000',
    emoji: '🌟',
    name: 'Tysiącznik',
    desc: 'Zdobądź 1000 XP łącznie',
    track: 'xp',
    progress: (progress) => ({
      current: progress.totalXp,
      target: 1000,
      summary: `${Math.min(progress.totalXp, 1000)}/1000 XP`,
    }),
  },
  {
    id: 'quest_starter',
    emoji: '🧭',
    name: 'Odkrywca misji',
    desc: 'Ukończ pierwszą misję dnia',
    track: 'quest',
    progress: (progress) => ({
      current: progress.dailyQuestsCompleted ?? 0,
      target: 1,
      summary: `${Math.min(progress.dailyQuestsCompleted ?? 0, 1)}/1 misja`,
    }),
  },
  {
    id: 'quest_keeper',
    emoji: '🎯',
    name: 'Łowca misji',
    desc: 'Ukończ 3 misje dnia',
    track: 'quest',
    progress: (progress) => ({
      current: progress.dailyQuestsCompleted ?? 0,
      target: 3,
      summary: `${Math.min(progress.dailyQuestsCompleted ?? 0, 3)}/3 misje`,
    }),
  },
  {
    id: 'guided_step',
    emoji: '🪄',
    name: 'Pewny krok',
    desc: 'Ukończ pierwszą rundę zgodnie z rekomendacją',
    track: 'quest',
    progress: (progress) => ({
      current: progress.recommendedSessionsCompleted ?? 0,
      target: 1,
      summary: `${Math.min(progress.recommendedSessionsCompleted ?? 0, 1)}/1 runda`,
    }),
  },
  {
    id: 'guided_keeper',
    emoji: '🧭',
    name: 'Trzymam kierunek',
    desc: 'Ukończ 3 rundy zgodnie z rekomendacją',
    track: 'quest',
    progress: (progress) => ({
      current: progress.recommendedSessionsCompleted ?? 0,
      target: 3,
      summary: `${Math.min(progress.recommendedSessionsCompleted ?? 0, 3)}/3 rundy`,
    }),
  },
  {
    id: 'mastery_builder',
    emoji: '🏗️',
    name: 'Budowniczy mistrzostwa',
    desc: 'Doprowadź 3 lekcje do co najmniej 75% opanowania',
    track: 'mastery',
    progress: (progress) => {
      const masteredLessons = getMasteredLessonCount(progress, 75);
      return {
        current: masteredLessons,
        target: 3,
        summary: `${Math.min(masteredLessons, 3)}/3 lekcje`,
      };
    },
  },
  {
    id: 'variety',
    emoji: '🎲',
    name: 'Wszechstronny',
    desc: 'Zagraj 5 różnych operacji',
    track: 'variety',
    progress: (progress) => ({
      current: progress.operationsPlayed.length,
      target: 5,
      summary: `${Math.min(progress.operationsPlayed.length, 5)}/5 typów`,
    }),
  },
  {
    id: 'english_first_game',
    emoji: '🇬🇧',
    name: 'Start z angielskim',
    desc: 'Zagraj pierwszą grę z angielskiego',
    track: 'english',
    progress: (progress) => {
      const sessions = getEnglishActivityTotals(progress).sessionsPlayed;
      return {
        current: sessions,
        target: 1,
        summary: `${Math.min(sessions, 1)}/1 gra`,
      };
    },
  },
  {
    id: 'english_perfect',
    emoji: '🏅',
    name: 'Perfekcyjny angielski',
    desc: 'Zdobądź 100% w grze z angielskiego',
    track: 'english',
    progress: (progress) => {
      const perfect = getEnglishActivityTotals(progress).perfectSessions;
      return {
        current: perfect,
        target: 1,
        summary: `${Math.min(perfect, 1)}/1 perfect`,
      };
    },
  },
  {
    id: 'english_pronoun_pro',
    emoji: '🧩',
    name: 'Pronoun Pro',
    desc: 'Zdobądź 2 perfekcyjne wyniki w Pronoun Remix',
    track: 'english',
    progress: (progress) => {
      const perfect = getActivityStatsEntry(progress, 'english_pronoun_remix').perfectSessions;
      return {
        current: perfect,
        target: 2,
        summary: `${Math.min(perfect, 2)}/2 perfect`,
      };
    },
  },
  {
    id: 'english_sorter_star',
    emoji: '🔤',
    name: 'Mistrz części mowy',
    desc: 'Zdobądź 2 perfekcyjne wyniki w Parts of Speech',
    track: 'english',
    progress: (progress) => {
      const perfect = getActivityStatsEntry(progress, 'english_parts_of_speech_sort').perfectSessions;
      return {
        current: perfect,
        target: 2,
        summary: `${Math.min(perfect, 2)}/2 perfect`,
      };
    },
  },
  {
    id: 'english_sentence_builder',
    emoji: '🧱',
    name: 'Architekt zdań',
    desc: 'Osiągnij 80%+ i rozegraj 3 sesje Sentence Structure',
    track: 'english',
    progress: (progress) => {
      const stats = getActivityStatsEntry(progress, 'english_sentence_structure_quiz');
      if (stats.bestScorePercent < 80) {
        return {
          current: stats.bestScorePercent,
          target: 80,
          summary: `${stats.bestScorePercent}% / 80%`,
        };
      }

      return {
        current: stats.sessionsPlayed,
        target: 3,
        summary: `${Math.min(stats.sessionsPlayed, 3)}/3 sesje`,
      };
    },
  },
  {
    id: 'english_agreement_guardian',
    emoji: '🤝',
    name: 'Strażnik zgodności',
    desc: 'Zdobądź perfekcyjny wynik w Subject-Verb Agreement',
    track: 'english',
    progress: (progress) => {
      const perfect = getActivityStatsEntry(
        progress,
        'english_subject_verb_agreement_quiz',
      ).perfectSessions;
      return {
        current: perfect,
        target: 1,
        summary: `${Math.min(perfect, 1)}/1 perfect`,
      };
    },
  },
  {
    id: 'english_grammar_collection',
    emoji: '📚',
    name: 'Kolekcja gramatyki',
    desc: 'Zagraj we wszystkie gry z angielskiego',
    track: 'english',
    progress: (progress) => {
      const played = getEnglishActivitiesPlayedCount(progress);
      return {
        current: played,
        target: ENGLISH_ACTIVITY_KEYS.length,
        summary: `${Math.min(played, ENGLISH_ACTIVITY_KEYS.length)}/${ENGLISH_ACTIVITY_KEYS.length} gier`,
      };
    },
  },
  {
    id: 'english_articles_reader',
    emoji: '📰',
    name: 'Mistrz przedimków',
    desc: 'Ukończ lekcję English: Articles',
    track: 'english',
    progress: (progress) => {
      const completions = progress.lessonMastery['english_articles']?.completions ?? 0;
      return {
        current: completions,
        target: 1,
        summary: `${Math.min(completions, 1)}/1 lekcja`,
      };
    },
  },
  {
    id: 'english_mastery_builder',
    emoji: '🏗️',
    name: 'Budowniczy English',
    desc: 'Doprowadź 3 lekcje z angielskiego do 75% opanowania',
    track: 'english',
    progress: (progress) => {
      const mastered = getEnglishMasteredLessonCount(progress, 75);
      return {
        current: mastered,
        target: 3,
        summary: `${Math.min(mastered, 3)}/3 lekcje`,
      };
    },
  },
];

export const getBadgeProgress = (
  progress: KangurProgressState,
  badge: KangurBadge,
): KangurBadgeProgress => {
  const details = badge.progress(progress);
  const target = Math.max(1, Math.round(details.target));
  const current = Math.max(0, Math.round(details.current));

  return {
    current,
    target,
    summary: details.summary,
    isUnlocked: current >= target,
    progressPercent: clampPercent((Math.min(current, target) / target) * 100),
  };
};

export const getProgressBadges = (progress: KangurProgressState): KangurBadgeStatus[] =>
  BADGES.map((badge) => ({
    ...badge,
    ...getBadgeProgress(progress, badge),
  }));

export const getVisibleProgressBadges = (
  progress: KangurProgressState,
  options: KangurVisibleBadgeOptions = {},
): KangurBadgeStatus[] => {
  const { maxLocked = 3, minimumLockedProgressPercent = 25 } = options;
  const badgeStatuses = getProgressBadges(progress);
  const visibleLockedBadgeIds = new Set(
    badgeStatuses
      .filter(
        (badge) =>
          !badge.isUnlocked &&
          badge.current > 0 &&
          badge.progressPercent >= minimumLockedProgressPercent,
      )
      .sort((left, right) => {
        if (left.progressPercent !== right.progressPercent) {
          return right.progressPercent - left.progressPercent;
        }

        const leftRemaining = Math.max(0, left.target - left.current);
        const rightRemaining = Math.max(0, right.target - right.current);
        if (leftRemaining !== rightRemaining) {
          return leftRemaining - rightRemaining;
        }

        return left.target - right.target;
      })
      .slice(0, Math.max(0, Math.floor(maxLocked)))
      .map((badge) => badge.id),
  );

  return badgeStatuses.filter((badge) => badge.isUnlocked || visibleLockedBadgeIds.has(badge.id));
};

export const getProgressBadgeTrackSummaries = (
  progress: KangurProgressState,
  options: KangurBadgeTrackOptions = {},
): KangurBadgeTrackSummary[] => {
  const { maxTracks = 4, minimumTrackProgressPercent = 25 } = options;
  const badgeStatuses = getProgressBadges(progress);
  return Object.entries(BADGE_TRACK_META)
    .map(([key, meta]) => {
      const badges = badgeStatuses.filter((badge) => badge.track === key);
      const unlockedCount = badges.filter((badge) => badge.isUnlocked).length;
      const nextBadge =
        badges
          .filter((badge) => !badge.isUnlocked)
          .sort((left, right) => {
            if (left.progressPercent !== right.progressPercent) {
              return right.progressPercent - left.progressPercent;
            }

            const leftRemaining = Math.max(0, left.target - left.current);
            const rightRemaining = Math.max(0, right.target - right.current);
            if (leftRemaining !== rightRemaining) {
              return leftRemaining - rightRemaining;
            }

            return left.target - right.target;
          })[0] ?? null;
      const progressPercent =
        badges.length > 0
          ? clampPercent(
              badges.reduce((sum, badge) => sum + badge.progressPercent, 0) / badges.length,
            )
          : 0;

      return {
        key: key as KangurBadgeTrackKey,
        label: meta.label,
        emoji: meta.emoji,
        unlockedCount,
        totalCount: badges.length,
        progressPercent,
        nextBadge,
        badges,
      };
    })
    .filter((track) => {
      if (track.totalCount === 0) {
        return false;
      }
      if (track.unlockedCount > 0) {
        return true;
      }
      return track.progressPercent >= minimumTrackProgressPercent;
    })
    .sort((left, right) => {
      if (left.progressPercent !== right.progressPercent) {
        return right.progressPercent - left.progressPercent;
      }
      const leftMeta = BADGE_TRACK_META[left.key];
      const rightMeta = BADGE_TRACK_META[right.key];
      return (leftMeta?.order ?? 99) - (rightMeta?.order ?? 99);
    })
    .slice(0, Math.max(1, Math.floor(maxTracks)));
};
