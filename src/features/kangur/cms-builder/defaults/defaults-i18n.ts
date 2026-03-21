import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

export type KangurCmsDefaultsCopy = {
  shared: {
    trainingSetupTitle: string;
    operationSelectorTitle: string;
    leaderboard: {
      title: string;
      description: string;
      playerFallback: string;
      metaFallback: string;
    };
  };
  lessons: {
    title: string;
    description: string;
    priorityAssignmentsTitle: string;
    priorityAssignmentsEmpty: string;
  };
  game: {
    guest: {
      playerLabel: string;
      playerPlaceholder: string;
      loginCopy: string;
      loginButton: string;
    };
    spotlight: {
      priority: string;
      title: string;
      description: string;
      progressLabel: string;
      actionLabel: string;
    };
    priorityPanel: {
      title: string;
      countLabel: string;
      itemPriority: string;
      itemTitle: string;
      itemDescription: string;
      itemProgressLabel: string;
      itemActionLabel: string;
      emptyMessage: string;
    };
    actions: {
      title: string;
      description: string;
      lessonsLabel: string;
      playLabel: string;
      duelsLabel: string;
      kangurLabel: string;
    };
    progress: {
      levelTitle: string;
      summary: string;
      currentXp: string;
      remainingXp: string;
      gamesLabel: string;
      lessonsLabel: string;
      badgesLabel: string;
    };
    homeLeaderboard: {
      title: string;
      description: string;
    };
    result: {
      assignmentEyebrow: string;
      assignmentTitle: string;
      assignmentDescription: string;
      assignmentProgressLabel: string;
      assignmentActionLabel: string;
      starsLabel: string;
      title: string;
      message: string;
      scoreMetric: string;
      accuracyMetric: string;
      timeMetric: string;
      topicMetric: string;
      topicFallback: string;
      restartLabel: string;
      homeLabel: string;
      leaderboardTitle: string;
      leaderboardDescription: string;
    };
  };
};

const PL_COPY: KangurCmsDefaultsCopy = {
  shared: {
    trainingSetupTitle: 'Ustawienia treningu',
    operationSelectorTitle: 'Wybierz operację',
    leaderboard: {
      title: 'Ranking',
      description: 'Najlepsze wyniki uczniów z ostatnich 7 dni.',
      playerFallback: 'Gracz',
      metaFallback: '🎲 Mieszane · Anonim',
    },
  },
  lessons: {
    title: 'Lekcje',
    description:
      'Ten ekran jest już składany w CMS builderze. Zmieniaj układ, teksty i rozmieszczenie widgetów bez wracania do kodu strony.',
    priorityAssignmentsTitle: 'Priorytetowe zadania',
    priorityAssignmentsEmpty: 'Brak aktywnych priorytetów.',
  },
  game: {
    guest: {
      playerLabel: 'Imię gracza',
      playerPlaceholder: 'Wpisz swoje imię...',
      loginCopy: 'Zaloguj się, aby Twój wynik pojawił się na tablicy.',
      loginButton: 'Zaloguj się',
    },
    spotlight: {
      priority: 'Priorytet wysoki',
      title: 'Zadanie od rodzica',
      description: 'Wróć do zadania i kontynuuj wyzwanie.',
      progressLabel: '0% ukończono',
      actionLabel: 'Kontynuuj zadanie',
    },
    priorityPanel: {
      title: 'Priorytetowe zadania',
      countLabel: '0 zadań',
      itemPriority: 'Priorytet wysoki',
      itemTitle: 'Zadanie',
      itemDescription: 'Opis zadania.',
      itemProgressLabel: '0% ukończono',
      itemActionLabel: 'Kontynuuj zadanie',
      emptyMessage: 'Brak aktywnych zadań od rodzica.',
    },
    actions: {
      title: 'Co chcesz zrobić?',
      description:
        'Ten panel jest już złożony z bloków CMS. Zmieniaj etykiety, kolejność i akcje bez wracania do kodu.',
      lessonsLabel: 'Lekcje',
      playLabel: 'Grajmy!',
      duelsLabel: 'Pojedynki',
      kangurLabel: 'Kangur Matematyczny',
    },
    progress: {
      levelTitle: 'Raczkujący',
      summary: 'Poziom 1 · 0 XP łącznie',
      currentXp: '0 XP',
      remainingXp: 'Do poziomu 2: 100 XP',
      gamesLabel: 'Gier',
      lessonsLabel: 'Lekcji',
      badgesLabel: 'Odznak',
    },
    homeLeaderboard: {
      title: 'Najlepsze wyniki',
      description:
        'Ta tablica wyników jest teraz składana z bloków CMS. Zmieniaj filtry, teksty i wygląd bez wracania do widgetu.',
    },
    result: {
      assignmentEyebrow: 'Zadanie od rodzica',
      assignmentTitle: 'Priorytetowe zadanie',
      assignmentDescription: 'Wróć do zadania i kontynuuj wyzwanie.',
      assignmentProgressLabel: '0% ukończono',
      assignmentActionLabel: 'Kontynuuj zadanie',
      starsLabel: '1 / 3 gwiazdki',
      title: 'Świetna robota, Graczu!',
      message: 'Dobra robota! Ćwiczenie czyni mistrza.',
      scoreMetric: 'Wynik',
      accuracyMetric: 'Dokładność',
      timeMetric: 'Czas',
      topicMetric: 'Temat',
      topicFallback: 'Trening mieszany',
      restartLabel: 'Zagraj ponownie',
      homeLabel: 'Strona główna',
      leaderboardTitle: 'Tablica wyników',
      leaderboardDescription:
        'Po zakończeniu gry nadal możesz przebudować ten ranking z poziomu CMS buildera.',
    },
  },
};

const EN_COPY: KangurCmsDefaultsCopy = {
  shared: {
    trainingSetupTitle: 'Training setup',
    operationSelectorTitle: 'Choose an operation',
    leaderboard: {
      title: 'Leaderboard',
      description: 'Top learner scores from the last 7 days.',
      playerFallback: 'Player',
      metaFallback: '🎲 Mixed · Anonymous',
    },
  },
  lessons: {
    title: 'Lessons',
    description:
      'This screen is already built in the CMS builder. Change the layout, copy, and widget placement without going back to the page code.',
    priorityAssignmentsTitle: 'Priority assignments',
    priorityAssignmentsEmpty: 'No active priorities.',
  },
  game: {
    guest: {
      playerLabel: 'Player name',
      playerPlaceholder: 'Enter your name...',
      loginCopy: 'Sign in to show your score on the leaderboard.',
      loginButton: 'Sign in',
    },
    spotlight: {
      priority: 'High priority',
      title: 'Parent assignment',
      description: 'Return to the assignment and continue the challenge.',
      progressLabel: '0% completed',
      actionLabel: 'Continue assignment',
    },
    priorityPanel: {
      title: 'Priority assignments',
      countLabel: '0 assignments',
      itemPriority: 'High priority',
      itemTitle: 'Assignment',
      itemDescription: 'Assignment description.',
      itemProgressLabel: '0% completed',
      itemActionLabel: 'Continue assignment',
      emptyMessage: 'No active parent assignments.',
    },
    actions: {
      title: 'What do you want to do?',
      description:
        'This panel is already assembled from CMS blocks. Change labels, order, and actions without going back to code.',
      lessonsLabel: 'Lessons',
      playLabel: 'Let\'s play!',
      duelsLabel: 'Duels',
      kangurLabel: 'Kangur Mathematics',
    },
    progress: {
      levelTitle: 'Beginner',
      summary: 'Level 1 · 0 XP total',
      currentXp: '0 XP',
      remainingXp: 'To level 2: 100 XP',
      gamesLabel: 'Games',
      lessonsLabel: 'Lessons',
      badgesLabel: 'Badges',
    },
    homeLeaderboard: {
      title: 'Top scores',
      description:
        'This leaderboard is now assembled from CMS blocks. Change filters, copy, and appearance without going back to the widget.',
    },
    result: {
      assignmentEyebrow: 'Parent assignment',
      assignmentTitle: 'Priority assignment',
      assignmentDescription: 'Return to the assignment and continue the challenge.',
      assignmentProgressLabel: '0% completed',
      assignmentActionLabel: 'Continue assignment',
      starsLabel: '1 / 3 stars',
      title: 'Great job, Player!',
      message: 'Good work! Practice makes progress.',
      scoreMetric: 'Score',
      accuracyMetric: 'Accuracy',
      timeMetric: 'Time',
      topicMetric: 'Topic',
      topicFallback: 'Mixed training',
      restartLabel: 'Play again',
      homeLabel: 'Home',
      leaderboardTitle: 'Leaderboard',
      leaderboardDescription:
        'After the game ends, you can still rebuild this ranking from the CMS builder.',
    },
  },
};

export const resolveKangurCmsDefaultsCopy = (
  locale?: string | null
): KangurCmsDefaultsCopy =>
  normalizeSiteLocale(locale ?? 'pl') === 'pl' ? PL_COPY : EN_COPY;
