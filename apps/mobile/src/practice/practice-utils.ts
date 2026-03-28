import type { KangurPracticeCompletionResult } from '@kangur/core/practice';

import type { KangurMobileLocale } from '../i18n/kangurMobileI18n';
import type { KangurMobileTone as Tone } from '../shared/KangurMobileUi';

export const PRACTICE_QUESTION_COUNT = 8;
export const PROFILE_ROUTE = '/profile' as const;

type PracticePlayerSession = {
  user?: {
    activeLearner?: {
      displayName?: string | null;
    } | null;
    full_name?: string | null;
  } | null;
} | null | undefined;

export const resolvePracticePlayerName = (
  session: PracticePlayerSession,
  locale: KangurMobileLocale,
): string => {
  const activeLearnerName = session?.user?.activeLearner?.displayName?.trim();
  if (activeLearnerName) {
    return activeLearnerName;
  }

  const fullName = session?.user?.full_name?.trim();
  if (fullName) {
    return fullName;
  }

  return {
    de: 'Lernender',
    en: 'Learner',
    pl: 'Uczeń',
  }[locale];
};

export const formatPracticeProgressLabel = (
  current: number,
  total: number,
  locale: KangurMobileLocale,
): string =>
  ({
    de: `Frage ${current} von ${total}`,
    en: `Question ${current} of ${total}`,
    pl: `Pytanie ${current} z ${total}`,
  })[locale];

export const formatPracticeResultLabel = (
  correctAnswers: number,
  totalQuestions: number,
  locale: KangurMobileLocale,
): string =>
  ({
    de: `Ergebnis: ${correctAnswers}/${totalQuestions}`,
    en: `Score: ${correctAnswers}/${totalQuestions}`,
    pl: `Wynik: ${correctAnswers}/${totalQuestions}`,
  })[locale];

export const formatPracticeSummaryMeta = (
  completion: KangurPracticeCompletionResult,
  locale: KangurMobileLocale,
): string => {
  const base = {
    de: `Trefferquote ${completion.scorePercent}% · XP +${completion.xpGained}`,
    en: `Accuracy ${completion.scorePercent}% · XP +${completion.xpGained}`,
    pl: `Skuteczność ${completion.scorePercent}% · XP +${completion.xpGained}`,
  }[locale];

  if (!completion.isPerfect) {
    return base;
  }

  return `${base} · ${
    {
      de: 'Perfektes Spiel',
      en: 'Perfect game',
      pl: 'Perfekcyjna gra',
    }[locale]
  }`;
};

export const formatPracticeDuration = (
  value: number | null | undefined,
): string => {
  const safeValue = Math.max(0, Math.floor(value ?? 0));
  if (safeValue < 60) {
    return `${safeValue}s`;
  }

  const minutes = Math.floor(safeValue / 60);
  const seconds = safeValue % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};

export const getPracticeAccuracyTone = (accuracyPercent: number): Tone => {
  if (accuracyPercent >= 80) {
    return {
      backgroundColor: '#ecfdf5',
      borderColor: '#a7f3d0',
      textColor: '#047857',
    };
  }
  if (accuracyPercent >= 60) {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
    };
  }
  return {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    textColor: '#b91c1c',
  };
};

export const PRACTICE_COUNT_TONE: Tone = {
  backgroundColor: '#f1f5f9',
  borderColor: '#cbd5e1',
  textColor: '#475569',
};

export const PRACTICE_KIND_TONE: Tone = {
  backgroundColor: '#eef2ff',
  borderColor: '#c7d2fe',
  textColor: '#4338ca',
};

const PRACTICE_LOADING_TONE: Tone = {
  backgroundColor: '#eff6ff',
  borderColor: '#bfdbfe',
  textColor: '#1d4ed8',
};

const PRACTICE_SYNCED_TONE: Tone = {
  backgroundColor: '#ecfdf5',
  borderColor: '#a7f3d0',
  textColor: '#047857',
};

const PRACTICE_LOCAL_ONLY_TONE: Tone = {
  backgroundColor: '#fffbeb',
  borderColor: '#fde68a',
  textColor: '#b45309',
};

export const formatPracticeAnswerFeedback = (
  isChoiceCorrect: boolean,
  answer: string,
  locale: KangurMobileLocale,
): string =>
  isChoiceCorrect
    ? {
        de: 'Richtige Antwort.',
        en: 'Correct answer.',
        pl: 'Dobra odpowiedź.',
      }[locale]
    : {
        de: `Richtige Antwort: ${answer}.`,
        en: `Correct answer: ${answer}.`,
        pl: `Poprawna odpowiedź: ${answer}.`,
      }[locale];

export const formatPracticeDuelRecord = (
  entry: {
    losses: number;
    ties: number;
    wins: number;
  },
  locale: KangurMobileLocale,
): string =>
  ({
    de: `Siege ${entry.wins} • Niederlagen ${entry.losses} • Unentschieden ${entry.ties}`,
    en: `Wins ${entry.wins} • Losses ${entry.losses} • Ties ${entry.ties}`,
    pl: `Wygrane ${entry.wins} • Porażki ${entry.losses} • Remisy ${entry.ties}`,
  })[locale];

export const formatPracticeQuestionCountLabel = (
  questionCount: number,
  locale: KangurMobileLocale,
): string => {
  if (locale === 'de') {
    return questionCount === 1 ? '1 Frage' : `${questionCount} Fragen`;
  }

  if (locale === 'en') {
    return questionCount === 1 ? '1 question' : `${questionCount} questions`;
  }

  if (questionCount === 1) {
    return '1 pytanie';
  }

  const lastDigit = questionCount % 10;
  const lastTwoDigits = questionCount % 100;
  if (
    lastDigit >= 2 &&
    lastDigit <= 4 &&
    (lastTwoDigits < 12 || lastTwoDigits > 14)
  ) {
    return `${questionCount} pytania`;
  }

  return `${questionCount} pytań`;
};

export const getPracticeKindChipLabel = (
  kind: 'arithmetic' | 'logic' | 'time',
  locale: KangurMobileLocale,
): string =>
  ({
    arithmetic: {
      de: 'Arithmetik',
      en: 'Arithmetic',
      pl: 'Arytmetyka',
    },
    logic: {
      de: 'Logik',
      en: 'Logic',
      pl: 'Logika',
    },
    time: {
      de: 'Zeit und Kalender',
      en: 'Time and calendar',
      pl: 'Czas i kalendarz',
    },
  })[kind][locale];

export const getPracticeSyncPreview = ({
  isLoadingAuth,
  locale,
  sessionStatus,
}: {
  isLoadingAuth: boolean;
  locale: KangurMobileLocale;
  sessionStatus: string;
}): {
  body: string;
  label: string;
  tone: Tone;
} => {
  if (isLoadingAuth) {
    return {
      body: {
        de: 'Es wird gerade geprüft, ob das Ergebnis nach der Runde auch mit der Kangur-API synchronisiert werden kann.',
        en: 'Checking whether the result can also sync with the Kangur API after the run.',
        pl: 'Sprawdzamy, czy wynik po serii będzie można także zsynchronizować z API Kangura.',
      }[locale],
      label: {
        de: 'Synchronisierung wird geprüft',
        en: 'Checking sync',
        pl: 'Sprawdzanie zapisu',
      }[locale],
      tone: PRACTICE_LOADING_TONE,
    };
  }

  if (sessionStatus === 'authenticated') {
    return {
      body: {
        de: 'Nach der Runde wird das Ergebnis lokal gespeichert und mit der Kangur-API synchronisiert, damit Ranglisten und Verlauf schneller aktualisiert werden.',
        en: 'After the run, the result will be saved locally and synced with the Kangur API so leaderboards and history update faster.',
        pl: 'Po zakończeniu serii wynik zapisze się lokalnie i zsynchronizuje z API Kangura, aby szybciej odświeżyć rankingi oraz historię.',
      }[locale],
      label: {
        de: 'Lokal + API',
        en: 'Local + API',
        pl: 'Lokalnie + API',
      }[locale],
      tone: PRACTICE_SYNCED_TONE,
    };
  }

  return {
    body: {
      de: 'Nach der Runde wird das Ergebnis lokal gespeichert. Melde dich an, damit es auch mit der Kangur-API synchronisiert wird.',
      en: 'After the run, the result will be saved locally. Sign in so it also syncs with the Kangur API.',
      pl: 'Po zakończeniu serii wynik zapisze się lokalnie. Zaloguj się, aby zsynchronizować go także z API Kangura.',
    }[locale],
    label: {
      de: 'Nur lokal',
      en: 'Local only',
      pl: 'Tylko lokalnie',
    }[locale],
    tone: PRACTICE_LOCAL_ONLY_TONE,
  };
};

export const getPracticeKindDescription = (
  kind: 'arithmetic' | 'logic' | 'time',
  locale: KangurMobileLocale,
): string => {
  if (kind === 'logic') {
    return {
      de: 'Das Logiktraining nutzt textbasierte Multiple-Choice-Fragen und dieselbe Ergebnis-, Verlaufs- und Folgelektionsstrecke wie die übrigen Trainingsmodi.',
      en: 'Logic practice uses text-based multiple-choice questions and the same score, history, and follow-up lesson flow as the other practice modes.',
      pl: 'Trening logiki korzysta z tekstowych pytań wielokrotnego wyboru i z tej samej ścieżki wyników, historii oraz dalszych lekcji co pozostałe tryby treningu.',
    }[locale];
  }

  if (kind === 'time') {
    return {
      de: 'Das Zeit- und Kalendertraining bündelt kurze Fragen, lokale Fortschritte und direkte Wege zurück zu Lektionen, Verlauf und Tagesplan.',
      en: 'Time and calendar practice combines short questions, local progress, and direct routes back to lessons, history, and the daily plan.',
      pl: 'Trening czasu i kalendarza łączy krótkie pytania, lokalny postęp oraz bezpośrednie przejścia do lekcji, historii i planu dnia.',
    }[locale];
  }

  return {
    de: 'Das Arithmetiktraining deckt die Grundoperationen mit kurzen Serien ab und verbindet Ergebnisse direkt mit Verlauf, Lektionen und den nächsten Aufgaben.',
    en: 'Arithmetic practice covers the core operations in short runs and connects results directly with history, lessons, and the next tasks.',
    pl: 'Trening arytmetyki obejmuje podstawowe działania w krótkich seriach i od razu łączy wynik z historią, lekcjami oraz kolejnymi zadaniami.',
  }[locale];
};

export const getLessonMasteryTone = (masteryPercent: number): Tone => {
  if (masteryPercent >= 90) {
    return {
      backgroundColor: '#ecfdf5',
      borderColor: '#a7f3d0',
      textColor: '#047857',
    };
  }

  if (masteryPercent >= 70) {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
    };
  }

  return {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    textColor: '#b91c1c',
  };
};
