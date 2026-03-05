// XP per event
export const XP_REWARDS = {
  correct_answer: 10,
  perfect_game: 50,
  great_game: 25,
  good_game: 10,
  lesson_completed: 40,
  clock_training_perfect: 60,
  clock_training_good: 30,
};

export const LEVELS = [
  { level: 1, minXp: 0, title: 'Raczkujący 🐣', color: 'text-gray-500' },
  { level: 2, minXp: 100, title: 'Uczeń ✏️', color: 'text-green-600' },
  { level: 3, minXp: 250, title: 'Myśliciel 🤔', color: 'text-blue-600' },
  { level: 4, minXp: 500, title: 'Liczmistrz 🔢', color: 'text-indigo-600' },
  { level: 5, minXp: 900, title: 'Matematyk 📐', color: 'text-purple-600' },
  { level: 6, minXp: 1400, title: 'Geniusz 🧠', color: 'text-yellow-600' },
  { level: 7, minXp: 2000, title: 'Legenda 🏆', color: 'text-red-600' },
];

export const BADGES = [
  {
    id: 'first_game',
    emoji: '🎮',
    name: 'Pierwsza gra',
    desc: 'Ukończ pierwszą grę',
    condition: (p) => p.gamesPlayed >= 1,
  },
  {
    id: 'perfect_10',
    emoji: '💯',
    name: 'Idealny wynik',
    desc: 'Zdobądź 10/10 w grze',
    condition: (p) => p.perfectGames >= 1,
  },
  {
    id: 'lesson_hero',
    emoji: '📚',
    name: 'Bohater lekcji',
    desc: 'Ukończ pierwszą lekcję',
    condition: (p) => p.lessonsCompleted >= 1,
  },
  {
    id: 'clock_master',
    emoji: '🕐',
    name: 'Mistrz zegara',
    desc: 'Ukończ trening zegara z 5/5',
    condition: (p) => p.clockPerfect >= 1,
  },
  {
    id: 'ten_games',
    emoji: '🔟',
    name: 'Dziesiątka',
    desc: 'Zagraj 10 gier',
    condition: (p) => p.gamesPlayed >= 10,
  },
  {
    id: 'xp_500',
    emoji: '⭐',
    name: 'Pół tysiąca XP',
    desc: 'Zdobądź 500 XP łącznie',
    condition: (p) => p.totalXp >= 500,
  },
  {
    id: 'xp_1000',
    emoji: '🌟',
    name: 'Tysiącznik',
    desc: 'Zdobądź 1000 XP łącznie',
    condition: (p) => p.totalXp >= 1000,
  },
  {
    id: 'variety',
    emoji: '🎲',
    name: 'Wszechstronny',
    desc: 'Zagraj 5 różnych operacji',
    condition: (p) => (p.operationsPlayed || []).length >= 5,
  },
];

const STORAGE_KEY = 'mathblast_progress';

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    totalXp: 0,
    gamesPlayed: 0,
    perfectGames: 0,
    lessonsCompleted: 0,
    clockPerfect: 0,
    badges: [],
    operationsPlayed: [],
  };
}

export function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function getCurrentLevel(totalXp) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (totalXp >= lvl.minXp) current = lvl;
  }
  return current;
}

export function getNextLevel(totalXp) {
  for (const lvl of LEVELS) {
    if (totalXp < lvl.minXp) return lvl;
  }
  return null;
}

export function checkNewBadges(progress) {
  const newBadges = [];
  for (const badge of BADGES) {
    if (!progress.badges.includes(badge.id) && badge.condition(progress)) {
      newBadges.push(badge.id);
    }
  }
  return newBadges;
}

export function addXp(amount, extraUpdates = {}) {
  const progress = loadProgress();
  const updated = { ...progress, totalXp: progress.totalXp + amount, ...extraUpdates };
  const newBadges = checkNewBadges(updated);
  updated.badges = [...updated.badges, ...newBadges];
  saveProgress(updated);
  return { updated, newBadges, xpGained: amount };
}
