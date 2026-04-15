import { type normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import type { ScoreHistoryFallbackCopy } from './ScoreHistory.types';

export const getScoreHistoryFallbackCopy = (
  locale: ReturnType<typeof normalizeSiteLocale>
): ScoreHistoryFallbackCopy => {
  if (locale === 'uk') {
    return {
      byOperationHeading: 'Результати за операціями',
      emptyDescription: 'Немає збережених результатів.',
      loadingDescription: 'Отримуємо найновіші результати та готуємо підсумок прогресу.',
      loadingTitle: 'Завантаження результатів...',
      recentHeading: 'Останні ігри',
      relative: {
        daysAgo: '{days} днів тому',
        noActivity: 'Немає активності',
        today: 'Сьогодні',
        yesterday: 'Учора',
      },
      shared: {
        noData: 'Немає даних',
        operationSummary: 'У середньому {accuracy}% · спроб {attempts} · +{xp} XP / сесію',
      },
      strongest: {
        empty: 'Недостатньо даних, щоб визначити сильну сторону.',
        label: 'Сильна сторона',
      },
      summary: {
        averageAccuracy: 'Середня точність',
        perfectGames: 'Ідеальні результати',
        totalGames: 'Усього ігор',
      },
      trend: {
        context: {
          down: 'Спад з {previous}% до {recent}%.',
          flat: 'Стабільно: {recent}% тиждень до тижня.',
          insufficient: 'Потрібні старіші результати для порівняння.',
          up: 'Зростання з {previous}% до {recent}%.',
        },
        label: 'Тижневий тренд',
        newRange: 'Новий діапазон',
      },
      weakest: {
        empty:
          'Потрібно більше ніж один тип завдань, щоб визначити зону, яка потребує підтримки.',
        label: 'Потребує підтримки',
        reviewLesson: 'Повторити урок',
      },
      window: {
        lastActivityPrefix: 'Остання активність:',
        title: 'Огляд за останні {days} днів',
        weeklySessions: 'Сесій цього тижня',
        weeklySummary: 'У середньому {accuracy}% · ідеальних {perfect}',
        weeklyXp: 'XP: +{xp} · у середньому {average} за сесію',
      },
    };
  }

  if (locale === 'de') {
    return {
      byOperationHeading: 'Ergebnisse nach Operation',
      emptyDescription: 'Keine gespeicherten Ergebnisse.',
      loadingDescription:
        'Wir laden die neuesten Ergebnisse und bereiten die Fortschrittsübersicht vor.',
      loadingTitle: 'Ergebnisse werden geladen...',
      recentHeading: 'Letzte Spiele',
      relative: {
        daysAgo: 'vor {days} Tagen',
        noActivity: 'Keine Aktivität',
        today: 'Heute',
        yesterday: 'Gestern',
      },
      shared: {
        noData: 'Keine Daten',
        operationSummary: 'Durchschnitt {accuracy}% · Versuche {attempts} · +{xp} XP / Sitzung',
      },
      strongest: {
        empty: 'Nicht genug Daten, um eine Stärke zu erkennen.',
        label: 'Starke Seite',
      },
      summary: {
        averageAccuracy: 'Durchschn. Genauigkeit',
        perfectGames: 'Perfekte Ergebnisse',
        totalGames: 'Spiele insgesamt',
      },
      trend: {
        context: {
          down: 'Rückgang von {previous}% auf {recent}%.',
          flat: 'Stabil: {recent}% Woche zu Woche.',
          insufficient: 'Zum Vergleichen werden ältere Ergebnisse benötigt.',
          up: 'Anstieg von {previous}% auf {recent}%.',
        },
        label: 'Wochentrend',
        newRange: 'Neuer Bereich',
      },
      weakest: {
        empty: 'Wir brauchen mehr als einen Aufgabentyp, um einen Förderbereich zu erkennen.',
        label: 'Braucht Unterstützung',
        reviewLesson: 'Lektion wiederholen',
      },
      window: {
        lastActivityPrefix: 'Letzte Aktivität:',
        title: 'Überblick über die letzten {days} Tage',
        weeklySessions: 'Sitzungen dieser Woche',
        weeklySummary: 'Durchschnitt {accuracy}% · perfekt {perfect}',
        weeklyXp: 'XP: +{xp} · durchschnittlich {average} pro Sitzung',
      },
    };
  }

  if (locale === 'en') {
    return {
      byOperationHeading: 'Results by operation',
      emptyDescription: 'No saved scores.',
      loadingDescription: 'We are fetching the latest results and preparing the progress summary.',
      loadingTitle: 'Loading scores...',
      recentHeading: 'Recent games',
      relative: {
        daysAgo: '{days} days ago',
        noActivity: 'No activity',
        today: 'Today',
        yesterday: 'Yesterday',
      },
      shared: {
        noData: 'No data',
        operationSummary: 'Average {accuracy}% · attempts {attempts} · +{xp} XP / session',
      },
      strongest: {
        empty: 'Not enough data to identify a strength.',
        label: 'Strong area',
      },
      summary: {
        averageAccuracy: 'Avg. accuracy',
        perfectGames: 'Perfect scores',
        totalGames: 'Games total',
      },
      trend: {
        context: {
          down: 'Down from {previous}% to {recent}%.',
          flat: 'Stable: {recent}% week over week.',
          insufficient: 'We need older results to compare.',
          up: 'Up from {previous}% to {recent}%.',
        },
        label: 'Weekly trend',
        newRange: 'New range',
      },
      weakest: {
        empty: 'We need more than one task type to identify a support area.',
        label: 'Needs support',
        reviewLesson: 'Review lesson',
      },
      window: {
        lastActivityPrefix: 'Last activity:',
        title: 'Overview of the last {days} days',
        weeklySessions: 'Sessions this week',
        weeklySummary: 'Average {accuracy}% · perfect {perfect}',
        weeklyXp: 'XP: +{xp} · average {average} per session',
      },
    };
  }

  return {
    byOperationHeading: 'Wyniki wg operacji',
    emptyDescription: 'Brak zapisanych wyników.',
    loadingDescription: 'Pobieramy ostatnie wyniki i przygotowujemy podsumowanie postępu.',
    loadingTitle: 'Ładowanie wyników...',
    recentHeading: 'Ostatnie gry',
    relative: {
      daysAgo: '{days} dni temu',
      noActivity: 'Brak aktywności',
      today: 'Dzisiaj',
      yesterday: 'Wczoraj',
    },
    shared: {
      noData: 'Brak danych',
      operationSummary: 'Średnio {accuracy}% · próby {attempts} · +{xp} XP / sesję',
    },
    strongest: {
      empty: 'Za mało danych na wskazanie przewagi.',
      label: 'Mocna strona',
    },
    summary: {
      averageAccuracy: 'Śr. skuteczność',
      perfectGames: 'Idealne wyniki',
      totalGames: 'Gier łącznie',
    },
    trend: {
      context: {
        down: 'Spadek z {previous}% na {recent}%.',
        flat: 'Stabilnie: {recent}% tydzień do tygodnia.',
        insufficient: 'Potrzeba starszych wyników do porównania.',
        up: 'Wzrost z {previous}% na {recent}%.',
      },
      label: 'Trend tygodnia',
      newRange: 'Nowy zakres',
    },
    weakest: {
      empty: 'Potrzeba więcej niż jednego typu zadania, aby wskazać obszar do wsparcia.',
      label: 'Do wsparcia',
      reviewLesson: 'Powtórz lekcję',
    },
    window: {
      lastActivityPrefix: 'Ostatnia aktywność:',
      title: 'Obraz ostatnich {days} dni',
      weeklySessions: 'Sesje tygodnia',
      weeklySummary: 'Średnia {accuracy}% · idealne {perfect}',
      weeklyXp: 'XP: +{xp} · średnio {average} na sesję',
    },
  };
};
