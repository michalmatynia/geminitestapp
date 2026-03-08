import type { KangurProgressState } from '@kangur/contracts';

export type KangurProgressLevel = {
  level: number;
  minXp: number;
  title: string;
  color: string;
};

export type KangurBadge = {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  condition: (progress: KangurProgressState) => boolean;
};

export const KANGUR_XP_REWARDS = {
  correct_answer: 10,
  perfect_game: 50,
  great_game: 25,
  good_game: 10,
  lesson_completed: 40,
  clock_training_perfect: 60,
  clock_training_good: 30,
  geometry_training_perfect: 70,
  geometry_training_good: 40,
} as const;

export const KANGUR_LEVELS: KangurProgressLevel[] = [
  { level: 1, minXp: 0, title: 'Raczkujacy 🐣', color: 'text-gray-500' },
  { level: 2, minXp: 100, title: 'Uczen ✏️', color: 'text-green-600' },
  { level: 3, minXp: 250, title: 'Mysliciel 🤔', color: 'text-blue-600' },
  { level: 4, minXp: 500, title: 'Liczmistrz 🔢', color: 'text-indigo-600' },
  { level: 5, minXp: 900, title: 'Matematyk 📐', color: 'text-purple-600' },
  { level: 6, minXp: 1400, title: 'Geniusz 🧠', color: 'text-yellow-600' },
  { level: 7, minXp: 2000, title: 'Legenda 🏆', color: 'text-red-600' },
];

export const KANGUR_BADGES: KangurBadge[] = [
  {
    id: 'first_game',
    emoji: '🎮',
    name: 'Pierwsza gra',
    desc: 'Ukoncz pierwsza gre',
    condition: (progress) => progress.gamesPlayed >= 1,
  },
  {
    id: 'perfect_10',
    emoji: '💯',
    name: 'Idealny wynik',
    desc: 'Zdobadz 10/10 w grze',
    condition: (progress) => progress.perfectGames >= 1,
  },
  {
    id: 'lesson_hero',
    emoji: '📚',
    name: 'Bohater lekcji',
    desc: 'Ukoncz pierwsza lekcje',
    condition: (progress) => progress.lessonsCompleted >= 1,
  },
  {
    id: 'clock_master',
    emoji: '🕐',
    name: 'Mistrz zegara',
    desc: 'Ukoncz trening zegara z 5/5',
    condition: (progress) => progress.clockPerfect >= 1,
  },
  {
    id: 'geometry_artist',
    emoji: '🔷',
    name: 'Artysta figur',
    desc: 'Ukoncz trening figur geometrycznych na pelny wynik',
    condition: (progress) => progress.geometryPerfect >= 1,
  },
  {
    id: 'ten_games',
    emoji: '🔟',
    name: 'Dziesiatka',
    desc: 'Zagraj 10 gier',
    condition: (progress) => progress.gamesPlayed >= 10,
  },
  {
    id: 'xp_500',
    emoji: '⭐',
    name: 'Pol tysiaca XP',
    desc: 'Zdobadz 500 XP lacznie',
    condition: (progress) => progress.totalXp >= 500,
  },
  {
    id: 'xp_1000',
    emoji: '🌟',
    name: 'Tysiacznik',
    desc: 'Zdobadz 1000 XP lacznie',
    condition: (progress) => progress.totalXp >= 1000,
  },
  {
    id: 'variety',
    emoji: '🎲',
    name: 'Wszechstronny',
    desc: 'Zagraj 5 roznych operacji',
    condition: (progress) => progress.operationsPlayed.length >= 5,
  },
];

const FALLBACK_LEVEL: KangurProgressLevel = {
  level: 1,
  minXp: 0,
  title: 'Raczkujacy 🐣',
  color: 'text-gray-500',
};

export const getCurrentKangurLevel = (totalXp: number): KangurProgressLevel => {
  let currentLevel = KANGUR_LEVELS[0] ?? FALLBACK_LEVEL;
  for (const level of KANGUR_LEVELS) {
    if (totalXp >= level.minXp) {
      currentLevel = level;
    }
  }
  return currentLevel;
};

export const getNextKangurLevel = (
  totalXp: number,
): KangurProgressLevel | null => {
  for (const level of KANGUR_LEVELS) {
    if (totalXp < level.minXp) {
      return level;
    }
  }
  return null;
};

export const checkKangurNewBadges = (
  progress: KangurProgressState,
): string[] => {
  const newBadges: string[] = [];
  for (const badge of KANGUR_BADGES) {
    if (!progress.badges.includes(badge.id) && badge.condition(progress)) {
      newBadges.push(badge.id);
    }
  }
  return newBadges;
};
