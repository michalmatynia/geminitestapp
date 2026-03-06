import type { KangurAddXpResult, KangurProgressState, KangurXpRewards } from '@/features/kangur/ui/types';

type KangurProgressLevel = {
  level: number;
  minXp: number;
  title: string;
  color: string;
};

type KangurBadge = {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  condition: (progress: KangurProgressState) => boolean;
};

const STORAGE_KEY = 'mathblast_progress';

const DEFAULT_PROGRESS: KangurProgressState = {
  totalXp: 0,
  gamesPlayed: 0,
  perfectGames: 0,
  lessonsCompleted: 0,
  clockPerfect: 0,
  calendarPerfect: 0,
  geometryPerfect: 0,
  badges: [],
  operationsPlayed: [],
};

export const XP_REWARDS: KangurXpRewards = {
  correct_answer: 10,
  perfect_game: 50,
  great_game: 25,
  good_game: 10,
  lesson_completed: 40,
  clock_training_perfect: 60,
  clock_training_good: 30,
  geometry_training_perfect: 70,
  geometry_training_good: 40,
};

export const LEVELS: KangurProgressLevel[] = [
  { level: 1, minXp: 0, title: 'Raczkujacy 🐣', color: 'text-gray-500' },
  { level: 2, minXp: 100, title: 'Uczen ✏️', color: 'text-green-600' },
  { level: 3, minXp: 250, title: 'Mysliciel 🤔', color: 'text-blue-600' },
  { level: 4, minXp: 500, title: 'Liczmistrz 🔢', color: 'text-indigo-600' },
  { level: 5, minXp: 900, title: 'Matematyk 📐', color: 'text-purple-600' },
  { level: 6, minXp: 1400, title: 'Geniusz 🧠', color: 'text-yellow-600' },
  { level: 7, minXp: 2000, title: 'Legenda 🏆', color: 'text-red-600' },
];

export const BADGES: KangurBadge[] = [
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

export function loadProgress(): KangurProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PROGRESS;
    }
    const parsed = JSON.parse(raw) as Partial<KangurProgressState>;
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      badges: Array.isArray(parsed.badges) ? parsed.badges : DEFAULT_PROGRESS.badges,
      operationsPlayed: Array.isArray(parsed.operationsPlayed)
        ? parsed.operationsPlayed
        : DEFAULT_PROGRESS.operationsPlayed,
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function saveProgress(progress: KangurProgressState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function getCurrentLevel(totalXp: number): KangurProgressLevel {
  let currentLevel = LEVELS[0] ?? FALLBACK_LEVEL;
  for (const level of LEVELS) {
    if (totalXp >= level.minXp) {
      currentLevel = level;
    }
  }
  return currentLevel;
}

export function getNextLevel(totalXp: number): KangurProgressLevel | null {
  for (const level of LEVELS) {
    if (totalXp < level.minXp) {
      return level;
    }
  }
  return null;
}

export function checkNewBadges(progress: KangurProgressState): string[] {
  const newBadges: string[] = [];
  for (const badge of BADGES) {
    if (!progress.badges.includes(badge.id) && badge.condition(progress)) {
      newBadges.push(badge.id);
    }
  }
  return newBadges;
}

export function addXp(
  amount: number,
  extraUpdates: Partial<KangurProgressState> = {}
): KangurAddXpResult {
  const progress = loadProgress();
  const updated: KangurProgressState = {
    ...progress,
    totalXp: progress.totalXp + amount,
    ...extraUpdates,
  };
  const newBadges = checkNewBadges(updated);
  updated.badges = [...updated.badges, ...newBadges];
  saveProgress(updated);
  return { updated, newBadges, xpGained: amount };
}
