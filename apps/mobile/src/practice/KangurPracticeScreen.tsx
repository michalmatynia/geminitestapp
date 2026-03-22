import {
  completeKangurPracticeSession,
  generateKangurLogicPracticeQuestions,
  generateTrainingQuestions,
  getLocalizedKangurMetadataBadgeName,
  getKangurPracticeOperationConfig,
  isKangurLogicPracticeOperation,
  resolveKangurPracticeOperation,
  type KangurOperation,
  type KangurPracticeCompletionResult,
  type KangurPracticeOperation,
  type KangurPracticeQuestion,
  type KangurQuestionChoice,
} from '@kangur/core';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { createKangurDuelsHref } from '../duels/duelsHref';
import {
  getKangurMobileLocaleTag,
  useKangurMobileI18n,
  type KangurMobileLocale,
} from '../i18n/kangurMobileI18n';
import { createKangurLessonHrefForPracticeOperation } from '../lessons/lessonHref';
import {
  useKangurMobileLessonCheckpoints,
  type KangurMobileLessonCheckpointItem,
} from '../lessons/useKangurMobileLessonCheckpoints';
import { createKangurPlanHref } from '../plan/planHref';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { createKangurResultsHref } from '../scores/resultsHref';
import {
  formatKangurMobileScoreDateTime,
  formatKangurMobileScoreOperation,
  getKangurMobileScoreAccuracyPercent,
} from '../scores/mobileScoreSummary';
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import {
  buildAwaitingAuthRetryState,
  buildLocalOnlySyncState,
  buildSyncedState,
  buildSyncingState,
  buildUnexpectedSyncFailureState,
  resolvePracticeScoreSyncAppearance,
  type PracticeScoreSyncState,
} from './practiceScoreSyncState';
import { resolveKangurPracticeDebugAutoComplete } from './practiceDebugAutoComplete';
import {
  createKangurPracticeDebugRedirectHref,
  resolveKangurPracticeDebugRedirectTarget,
} from './practiceDebugRedirect';
import {
  useKangurMobilePracticeAssignments,
  type KangurMobilePracticeAssignmentItem,
} from './useKangurMobilePracticeAssignments';
import { useKangurMobilePracticeDuels } from './useKangurMobilePracticeDuels';
import {
  useKangurMobilePracticeLessonMastery,
  type KangurMobilePracticeLessonMasteryItem,
} from './useKangurMobilePracticeLessonMastery';
import {
  useKangurMobilePracticeBadges,
  type KangurMobilePracticeBadgeItem,
} from './useKangurMobilePracticeBadges';
import {
  useKangurMobilePracticeRecentResults,
  type KangurMobilePracticeRecentResultItem,
} from './useKangurMobilePracticeRecentResults';
import { useKangurPracticeSyncProof } from './useKangurPracticeSyncProof';

const PRACTICE_QUESTION_COUNT = 8;
const PROFILE_ROUTE = '/profile' as const;

const resolvePracticePlayerName = (
  session: ReturnType<typeof useKangurMobileAuth>['session'],
  locale: KangurMobileLocale,
): string => {
  const activeLearnerName = session.user?.activeLearner?.displayName?.trim();
  if (activeLearnerName) {
    return activeLearnerName;
  }

  const fullName = session.user?.full_name?.trim();
  if (fullName) {
    return fullName;
  }

  return {
    de: 'Mobiler Lernender',
    en: 'Mobile learner',
    pl: 'Uczeń mobilny',
  }[locale];
};

const formatPracticeProgressLabel = (
  current: number,
  total: number,
  locale: KangurMobileLocale,
): string =>
  ({
    de: `Frage ${current} von ${total}`,
    en: `Question ${current} of ${total}`,
    pl: `Pytanie ${current} z ${total}`,
  })[locale];

const formatPracticeResultLabel = (
  correctAnswers: number,
  totalQuestions: number,
  locale: KangurMobileLocale,
): string =>
  ({
    de: `Ergebnis: ${correctAnswers}/${totalQuestions}`,
    en: `Score: ${correctAnswers}/${totalQuestions}`,
    pl: `Wynik: ${correctAnswers}/${totalQuestions}`,
  })[locale];

const formatPracticeSummaryMeta = (
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

const formatPracticeDuration = (value: number | null | undefined): string => {
  const safeValue = Math.max(0, Math.floor(value ?? 0));
  if (safeValue < 60) {
    return `${safeValue}s`;
  }

  const minutes = Math.floor(safeValue / 60);
  const seconds = safeValue % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};

const getPracticeAccuracyTone = (accuracyPercent: number): Tone => {
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

type Tone = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

const PRACTICE_COUNT_TONE: Tone = {
  backgroundColor: '#f1f5f9',
  borderColor: '#cbd5e1',
  textColor: '#475569',
};

const PRACTICE_KIND_TONE: Tone = {
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

const formatPracticeAnswerFeedback = (
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

const formatPracticeDuelRecord = (
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

const formatPracticeQuestionCountLabel = (
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

const getPracticeKindChipLabel = (
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

type PracticeSyncPreview = {
  body: string;
  label: string;
  tone: Tone;
};

const getPracticeSyncPreview = ({
  isLoadingAuth,
  locale,
  sessionStatus,
}: {
  isLoadingAuth: boolean;
  locale: KangurMobileLocale;
  sessionStatus: string;
}): PracticeSyncPreview => {
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
      de: 'Nach der Runde wird das Ergebnis lokal gespeichert. Melde die Lernenden-Sitzung an, damit es auch mit der Kangur-API synchronisiert wird.',
      en: 'After the run, the result will be saved locally. Sign in the learner session so it also syncs with the Kangur API.',
      pl: 'Po zakończeniu serii wynik zapisze się lokalnie. Zaloguj sesję ucznia, aby zsynchronizować go także z API Kangura.',
    }[locale],
    label: {
      de: 'Nur lokal',
      en: 'Local only',
      pl: 'Tylko lokalnie',
    }[locale],
    tone: PRACTICE_LOCAL_ONLY_TONE,
  };
};

const getPracticeKindDescription = (
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

function Card({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View
      style={{
        borderRadius: 24,
        backgroundColor: '#ffffff',
        padding: 18,
        gap: 12,
        shadowColor: '#0f172a',
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 3,
      }}
    >
      {children}
    </View>
  );
}

function Pill({
  label,
  tone,
}: {
  label: string;
  tone: Tone;
}): React.JSX.Element {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: tone.borderColor,
        backgroundColor: tone.backgroundColor,
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      <Text style={{ color: tone.textColor, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

function ChoiceButton({
  label,
  onPress,
  state,
}: {
  label: string;
  onPress: () => void;
  state: 'idle' | 'correct' | 'incorrect' | 'neutral';
}): React.JSX.Element {
  const backgroundColor =
    state === 'correct'
      ? '#ecfdf5'
      : state === 'incorrect'
        ? '#fef2f2'
        : state === 'neutral'
          ? '#f8fafc'
          : '#ffffff';
  const borderColor =
    state === 'correct'
      ? '#86efac'
      : state === 'incorrect'
        ? '#fca5a5'
        : '#cbd5e1';
  const textColor =
    state === 'correct'
      ? '#166534'
      : state === 'incorrect'
        ? '#b91c1c'
        : '#0f172a';

  return (
    <Pressable
      accessibilityRole='button'
      onPress={onPress}
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor,
        backgroundColor,
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <Text style={{ color: textColor, fontSize: 16, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

function LessonCheckpointRow({
  item,
}: {
  item: KangurMobileLessonCheckpointItem;
}): React.JSX.Element {
  const { copy, localeTag } = useKangurMobileI18n();

  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
        padding: 12,
        gap: 8,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
            {item.emoji} {item.title}
          </Text>
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
            {copy({
              de: `Letztes Ergebnis ${item.lastScorePercent}% • Beherrschung ${item.masteryPercent}%`,
              en: `Last score ${item.lastScorePercent}% • mastery ${item.masteryPercent}%`,
              pl: `Ostatni wynik ${item.lastScorePercent}% • opanowanie ${item.masteryPercent}%`,
            })}
          </Text>
        </View>
        <View
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: '#c7d2fe',
            backgroundColor: '#eef2ff',
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text style={{ color: '#4338ca', fontSize: 12, fontWeight: '700' }}>
            {item.bestScorePercent}%
          </Text>
        </View>
      </View>

      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: 'Zuletzt gespeichert',
          en: 'Last saved',
          pl: 'Ostatni zapis',
        })}{' '}
        {new Intl.DateTimeFormat(localeTag, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(item.lastCompletedAt))}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Link href={item.lessonHref} asChild>
          <Pressable
            accessibilityRole='button'
            style={{
              alignSelf: 'flex-start',
              borderRadius: 999,
              backgroundColor: '#0f172a',
              paddingHorizontal: 12,
              paddingVertical: 9,
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>
              {copy({
                de: 'Zur Lektion zurück',
                en: 'Return to lesson',
                pl: 'Wróć do lekcji',
              })}
              {`: ${item.title}`}
            </Text>
          </Pressable>
        </Link>
        {item.practiceHref ? (
          <Link href={item.practiceHref} asChild>
            <Pressable
              accessibilityRole='button'
              style={{
                alignSelf: 'flex-start',
                borderRadius: 999,
                borderWidth: 1,
                borderColor: '#cbd5e1',
                backgroundColor: '#ffffff',
                paddingHorizontal: 12,
                paddingVertical: 9,
              }}
            >
              <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                {copy({
                  de: 'Danach trainieren',
                  en: 'Practice after',
                  pl: 'Potem trenuj',
                })}
                {`: ${item.title}`}
              </Text>
            </Pressable>
          </Link>
        ) : null}
      </View>
    </View>
  );
}

function PracticeBadgeChip({
  item,
}: {
  item: KangurMobilePracticeBadgeItem;
}): React.JSX.Element {
  return (
    <View
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#fde68a',
        backgroundColor: '#fff7ed',
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <Text style={{ color: '#9a3412', fontSize: 13, fontWeight: '700' }}>
        {item.emoji} {item.name}
      </Text>
    </View>
  );
}

function PracticeRecentResultRow({
  item,
}: {
  item: KangurMobilePracticeRecentResultItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const accuracyPercent = getKangurMobileScoreAccuracyPercent(item.result);
  const accuracyTone = getPracticeAccuracyTone(accuracyPercent);

  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        padding: 14,
        gap: 8,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
            {formatKangurMobileScoreOperation(item.result.operation, locale)}
          </Text>
          <Text style={{ color: '#64748b', fontSize: 12 }}>
            {formatKangurMobileScoreDateTime(item.result.created_date, locale)}
          </Text>
        </View>
        <Pill
          label={`${item.result.correct_answers}/${item.result.total_questions}`}
          tone={accuracyTone}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill
          label={copy({
            de: `Trefferquote ${accuracyPercent}%`,
            en: `Accuracy ${accuracyPercent}%`,
            pl: `Skuteczność ${accuracyPercent}%`,
          })}
          tone={accuracyTone}
        />
        <Pill
          label={copy({
            de: `Zeit ${formatPracticeDuration(item.result.time_taken)}`,
            en: `Time ${formatPracticeDuration(item.result.time_taken)}`,
            pl: `Czas ${formatPracticeDuration(item.result.time_taken)}`,
          })}
          tone={{
            backgroundColor: '#f1f5f9',
            borderColor: '#cbd5e1',
            textColor: '#475569',
          }}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Link href={item.practiceHref} asChild>
          <Pressable
            accessibilityRole='button'
            style={{
              alignSelf: 'flex-start',
              borderRadius: 999,
              backgroundColor: '#0f172a',
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>
              {copy({
                de: 'Erneut trainieren',
                en: 'Train again',
                pl: 'Trenuj ponownie',
              })}
            </Text>
          </Pressable>
        </Link>

        {item.lessonHref ? (
          <Link href={item.lessonHref} asChild>
            <Pressable
              accessibilityRole='button'
              style={{
                alignSelf: 'flex-start',
                borderRadius: 999,
                borderWidth: 1,
                borderColor: '#cbd5e1',
                backgroundColor: '#ffffff',
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                {copy({
                  de: 'Lektion öffnen',
                  en: 'Open lesson',
                  pl: 'Otwórz lekcję',
                })}
              </Text>
            </Pressable>
          </Link>
        ) : null}

        <Link href={item.historyHref} asChild>
          <Pressable
            accessibilityRole='button'
            style={{
              alignSelf: 'flex-start',
              borderRadius: 999,
              borderWidth: 1,
              borderColor: '#cbd5e1',
              backgroundColor: '#ffffff',
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: '#0f172a', fontWeight: '700' }}>
              {copy({
                de: 'Modusverlauf',
                en: 'Mode history',
                pl: 'Historia trybu',
              })}
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

function PracticeAssignmentRow({
  item,
}: {
  item: KangurMobilePracticeAssignmentItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const priorityTone =
    item.assignment.priority === 'high'
      ? {
          backgroundColor: '#fef2f2',
          borderColor: '#fecaca',
          textColor: '#b91c1c',
        }
      : item.assignment.priority === 'medium'
        ? {
            backgroundColor: '#fffbeb',
            borderColor: '#fde68a',
            textColor: '#b45309',
          }
        : {
            backgroundColor: '#eff6ff',
            borderColor: '#bfdbfe',
            textColor: '#1d4ed8',
          };

  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
        padding: 12,
        gap: 8,
      }}
    >
      <View
        style={{
          alignSelf: 'flex-start',
          borderRadius: 999,
          borderWidth: 1,
          borderColor: priorityTone.borderColor,
          backgroundColor: priorityTone.backgroundColor,
          paddingHorizontal: 12,
          paddingVertical: 7,
        }}
      >
        <Text style={{ color: priorityTone.textColor, fontSize: 12, fontWeight: '700' }}>
          {copy({
            de:
              item.assignment.priority === 'high'
                ? 'Hohe Priorität'
                : item.assignment.priority === 'medium'
                  ? 'Mittlere Priorität'
                  : 'Niedrige Priorität',
            en:
              item.assignment.priority === 'high'
                ? 'High priority'
                : item.assignment.priority === 'medium'
                  ? 'Medium priority'
                  : 'Low priority',
            pl:
              item.assignment.priority === 'high'
                ? 'Priorytet wysoki'
                : item.assignment.priority === 'medium'
                  ? 'Priorytet średni'
                  : 'Priorytet niski',
          })}
        </Text>
      </View>
      <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
        {item.assignment.title}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {item.assignment.description}
      </Text>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Ziel: ${item.assignment.target}`,
          en: `Goal: ${item.assignment.target}`,
          pl: `Cel: ${item.assignment.target}`,
        })}
      </Text>
      {item.href ? (
        <Link href={item.href} asChild>
          <Pressable
            accessibilityRole='button'
            style={{
              alignSelf: 'flex-start',
              borderRadius: 999,
              backgroundColor: '#0f172a',
              paddingHorizontal: 12,
              paddingVertical: 9,
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>
              {translateKangurMobileActionLabel(item.assignment.action.label, locale)}
            </Text>
          </Pressable>
        </Link>
      ) : (
        <View
          style={{
            alignSelf: 'flex-start',
            borderRadius: 999,
            backgroundColor: '#e2e8f0',
            paddingHorizontal: 12,
            paddingVertical: 9,
          }}
        >
          <Text style={{ color: '#475569', fontWeight: '700' }}>
            {translateKangurMobileActionLabel(item.assignment.action.label, locale)} ·{' '}
            {copy({
              de: 'bald',
              en: 'soon',
              pl: 'wkrotce',
            })}
          </Text>
        </View>
      )}
    </View>
  );
}

const getLessonMasteryTone = (
  masteryPercent: number,
): {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
} => {
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

function LessonMasteryRow({
  insight,
  title,
}: {
  insight: KangurMobilePracticeLessonMasteryItem;
  title: string;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const masteryTone = getLessonMasteryTone(insight.masteryPercent);
  const lastAttemptLabel = insight.lastCompletedAt
    ? formatKangurMobileScoreDateTime(insight.lastCompletedAt, locale)
    : copy({
        de: 'kein Datum',
        en: 'no date',
        pl: 'brak daty',
      });

  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        padding: 14,
        gap: 10,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{title}</Text>
          <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
            {insight.emoji} {insight.title}
          </Text>
          <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
            {copy({
              de: `Versuche ${insight.attempts} • letztes Ergebnis ${insight.lastScorePercent}%`,
              en: `Attempts ${insight.attempts} • last score ${insight.lastScorePercent}%`,
              pl: `Próby ${insight.attempts} • ostatni wynik ${insight.lastScorePercent}%`,
            })}
          </Text>
        </View>
        <View
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: masteryTone.borderColor,
            backgroundColor: masteryTone.backgroundColor,
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text style={{ color: masteryTone.textColor, fontSize: 12, fontWeight: '700' }}>
            {insight.masteryPercent}%
          </Text>
        </View>
      </View>

      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Bestes Ergebnis ${insight.bestScorePercent}% • letzter Versuch ${lastAttemptLabel}`,
          en: `Best score ${insight.bestScorePercent}% • last attempt ${lastAttemptLabel}`,
          pl: `Najlepszy wynik ${insight.bestScorePercent}% • ostatnia próba ${lastAttemptLabel}`,
        })}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Link href={insight.lessonHref} asChild>
          <Pressable
            accessibilityRole='button'
            style={{
              alignSelf: 'flex-start',
              borderRadius: 999,
              backgroundColor: '#0f172a',
              paddingHorizontal: 12,
              paddingVertical: 9,
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>
              {copy({
                de: 'Lektion öffnen',
                en: 'Open lesson',
                pl: 'Otwórz lekcję',
              })}
            </Text>
          </Pressable>
        </Link>
        {insight.practiceHref ? (
          <Link href={insight.practiceHref} asChild>
            <Pressable
              accessibilityRole='button'
              style={{
                alignSelf: 'flex-start',
                borderRadius: 999,
                borderWidth: 1,
                borderColor: '#cbd5e1',
                backgroundColor: '#ffffff',
                paddingHorizontal: 12,
                paddingVertical: 9,
              }}
            >
              <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                {copy({
                  de: 'Danach trainieren',
                  en: 'Practice after',
                  pl: 'Potem trenuj',
                })}
              </Text>
            </Pressable>
          </Link>
        ) : null}
      </View>
    </View>
  );
}

type PendingPracticeScoreSyncInput = {
  completedRunId: number;
  correctAnswers: number;
  operation: KangurPracticeOperation;
  totalQuestions: number;
};

export function KangurPracticeScreen(): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const localeTag = getKangurMobileLocaleTag(locale);
  const lessonCheckpoints = useKangurMobileLessonCheckpoints({ limit: 2 });
  const lessonMastery = useKangurMobilePracticeLessonMastery();
  const practiceBadges = useKangurMobilePracticeBadges();
  const practiceAssignments = useKangurMobilePracticeAssignments();
  const practiceRecentResults = useKangurMobilePracticeRecentResults();
  const params = useLocalSearchParams<{
    debugAutoComplete?: string | string[];
    debugRedirectTo?: string | string[];
    operation?: string | string[];
  }>();
  const router = useRouter();
  const rawOperation = Array.isArray(params.operation)
    ? params.operation[0]
    : params.operation;
  const debugAutoCompleteMode = __DEV__
    ? resolveKangurPracticeDebugAutoComplete(params.debugAutoComplete)
    : null;
  const debugRedirectTarget = __DEV__
    ? resolveKangurPracticeDebugRedirectTarget(params.debugRedirectTo)
    : null;
  const operation = resolveKangurPracticeOperation(
    typeof rawOperation === 'string' ? rawOperation : null,
  );
  const weakestLesson = lessonMastery.weakest[0] ?? null;
  const strongestLesson = lessonMastery.strongest[0] ?? null;
  const lessonFocusSummary = weakestLesson
    ? copy({
        de: `Fokus nach dem Training: ${weakestLesson.title} braucht noch eine kurze Wiederholung, bevor du weiterziehst.`,
        en: `Post-practice focus: ${weakestLesson.title} still needs a short review before you move on.`,
        pl: `Fokus po treningu: ${weakestLesson.title} potrzebuje jeszcze krótkiej powtórki, zanim przejdziesz dalej.`,
      })
    : strongestLesson
      ? copy({
          de: `Stabile Stärke: ${strongestLesson.title} hält das Niveau und eignet sich für eine kurze Auffrischung nach dem Training.`,
          en: `Stable strength: ${strongestLesson.title} is holding its level and works well for a short post-practice refresh.`,
          pl: `Stabilna mocna strona: ${strongestLesson.title} trzyma poziom i nadaje się na krótkie podtrzymanie po treningu.`,
        })
      : null;
  const operationConfig = getKangurPracticeOperationConfig(operation, locale);
  const queryClient = useQueryClient();
  const { isLoadingAuth, session } = useKangurMobileAuth();
  const { apiClient, progressStore } = useKangurMobileRuntime();
  const [runId, setRunId] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [runStartedAt, setRunStartedAt] = useState(() => Date.now());
  const [selectedChoice, setSelectedChoice] = useState<KangurQuestionChoice | null>(null);
  const [completion, setCompletion] = useState<KangurPracticeCompletionResult | null>(null);
  const [scoreSyncState, setScoreSyncState] = useState<PracticeScoreSyncState | null>(
    null,
  );
  const latestRunIdRef = useRef(runId);
  const hasAppliedDebugAutoCompleteRef = useRef(false);
  const hasAppliedDebugRedirectRef = useRef(false);
  const pendingScoreSyncRef = useRef<PendingPracticeScoreSyncInput | null>(null);
  latestRunIdRef.current = runId;

  const questions = useMemo<KangurPracticeQuestion[]>(
    () => {
      if (isKangurLogicPracticeOperation(operation)) {
        return generateKangurLogicPracticeQuestions(
          operation,
          PRACTICE_QUESTION_COUNT,
          locale,
        );
      }

      return generateTrainingQuestions(
        operationConfig.categories as KangurOperation[],
        'easy',
        PRACTICE_QUESTION_COUNT,
      );
    },
    [locale, operation, operationConfig.categories, runId],
  );

  const currentQuestion = questions[currentIndex] ?? null;
  const isLastQuestion = currentIndex >= questions.length - 1;
  const isChoiceCorrect =
    selectedChoice !== null && currentQuestion
      ? String(selectedChoice) === String(currentQuestion.answer)
      : false;

  const restart = (): void => {
    const nextRunId = latestRunIdRef.current + 1;
    latestRunIdRef.current = nextRunId;
    hasAppliedDebugAutoCompleteRef.current = false;
    hasAppliedDebugRedirectRef.current = false;
    pendingScoreSyncRef.current = null;
    setRunId(nextRunId);
    setCurrentIndex(0);
    setCorrectAnswers(0);
    setRunStartedAt(Date.now());
    setSelectedChoice(null);
    setCompletion(null);
    setScoreSyncState(null);
  };

  const handleChoicePress = (choice: KangurQuestionChoice): void => {
    if (!currentQuestion || selectedChoice !== null) {
      return;
    }

    setSelectedChoice(choice);
  };

  const syncScoreRecord = async (input: {
    correctAnswers: number;
    completedRunId: number;
    operation: KangurPracticeOperation;
    totalQuestions: number;
  }): Promise<void> => {
    if (session.status !== 'authenticated') {
      if (isLoadingAuth) {
        pendingScoreSyncRef.current = input;
        setScoreSyncState(buildAwaitingAuthRetryState(locale));
        return;
      }

      setScoreSyncState(buildLocalOnlySyncState('auth', locale));
      return;
    }

    pendingScoreSyncRef.current = null;
    setScoreSyncState(buildSyncingState(locale));

    const timeTakenSeconds = Math.max(
      0,
      Math.round((Date.now() - runStartedAt) / 1000),
    );

    try {
      await apiClient.createScore({
        player_name: resolvePracticePlayerName(session, locale),
        score: input.correctAnswers,
        operation: input.operation,
        subject: 'maths',
        total_questions: input.totalQuestions,
        correct_answers: input.correctAnswers,
        time_taken: timeTakenSeconds,
      });

      if (latestRunIdRef.current !== input.completedRunId) {
        return;
      }

      setScoreSyncState(buildSyncedState(locale));
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['kangur-mobile', 'leaderboard'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['kangur-mobile', 'scores'],
        }),
      ]);
    } catch (error) {
      if (latestRunIdRef.current !== input.completedRunId) {
        return;
      }

      const status =
        typeof error === 'object' &&
        error &&
        'status' in error &&
        typeof error.status === 'number'
          ? error.status
          : null;

      if (status === 401 || status === 403) {
        setScoreSyncState(buildLocalOnlySyncState('expected-error', locale));
        return;
      }

      if (error instanceof TypeError) {
        setScoreSyncState(buildLocalOnlySyncState('expected-error', locale));
        return;
      }

      setScoreSyncState(buildUnexpectedSyncFailureState(locale));
    }
  };

  const handleNext = (): void => {
    if (!currentQuestion || selectedChoice === null) {
      return;
    }

    const nextCorrectAnswers = isChoiceCorrect ? correctAnswers + 1 : correctAnswers;

    if (isLastQuestion) {
      const completedRunId = runId;
      const progress = progressStore.loadProgress();
      const result = completeKangurPracticeSession({
        progress,
        operation,
        correctAnswers: nextCorrectAnswers,
        totalQuestions: questions.length,
      });
      progressStore.saveProgress(result.updated);
      setCorrectAnswers(nextCorrectAnswers);
      setCompletion(result);
      setSelectedChoice(null);
      void syncScoreRecord({
        correctAnswers: nextCorrectAnswers,
        completedRunId,
        operation,
        totalQuestions: questions.length,
      });
      return;
    }

    setCorrectAnswers(nextCorrectAnswers);
    setCurrentIndex((current) => current + 1);
    setSelectedChoice(null);
  };

  const scoreSyncAppearance = scoreSyncState
    ? resolvePracticeScoreSyncAppearance(scoreSyncState.status)
    : null;
  const lessonHref = createKangurLessonHrefForPracticeOperation(operation);
  const practiceModeHistoryHref = createKangurResultsHref({
    operation,
  });
  const practiceDuels = useKangurMobilePracticeDuels();
  const practiceSyncProof = useKangurPracticeSyncProof({
    enabled: __DEV__ && scoreSyncState?.status === 'synced',
    expectedCorrectAnswers: correctAnswers,
    expectedTotalQuestions: questions.length,
    operation,
    runStartedAt,
  });

  useEffect(() => {
    if (!pendingScoreSyncRef.current || isLoadingAuth) {
      return;
    }

    if (session.status !== 'authenticated') {
      pendingScoreSyncRef.current = null;
      setScoreSyncState(buildLocalOnlySyncState('auth', locale));
      return;
    }

    const pendingInput = pendingScoreSyncRef.current;
    pendingScoreSyncRef.current = null;
    void syncScoreRecord(pendingInput);
  }, [isLoadingAuth, locale, session.status, syncScoreRecord]);

  useEffect(() => {
    if (!debugAutoCompleteMode || completion || hasAppliedDebugAutoCompleteRef.current) {
      return;
    }

    hasAppliedDebugAutoCompleteRef.current = true;

    const completedRunId = runId;
    const autoCorrectAnswers =
      debugAutoCompleteMode === 'perfect' ? questions.length : 0;
    const progress = progressStore.loadProgress();
    const result = completeKangurPracticeSession({
      progress,
      operation,
      correctAnswers: autoCorrectAnswers,
      totalQuestions: questions.length,
    });

    progressStore.saveProgress(result.updated);
    setCurrentIndex(questions.length - 1);
    setCorrectAnswers(autoCorrectAnswers);
    setCompletion(result);
    setSelectedChoice(null);
    void syncScoreRecord({
      correctAnswers: autoCorrectAnswers,
      completedRunId,
      operation,
      totalQuestions: questions.length,
    });
  }, [
    completion,
    debugAutoCompleteMode,
    operation,
    progressStore,
    questions.length,
    runId,
    syncScoreRecord,
  ]);

  useEffect(() => {
    if (
      !debugRedirectTarget ||
      !completion ||
      scoreSyncState?.status !== 'synced' ||
      hasAppliedDebugRedirectRef.current
    ) {
      return;
    }

    hasAppliedDebugRedirectRef.current = true;
    router.replace(
      createKangurPracticeDebugRedirectHref({
        operation,
        target: debugRedirectTarget,
      }),
    );
  }, [completion, debugRedirectTarget, operation, router, scoreSyncState?.status]);

  const openDuelSession = (sessionId: string): void => {
    router.replace(createKangurDuelsHref({ sessionId }));
  };
  const practiceSyncPreview = getPracticeSyncPreview({
    isLoadingAuth,
    locale,
    sessionStatus: session.status,
  });
  const shouldShowPreparationCard = completion === null && currentIndex === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fffaf2' }}>
      <ScrollView
        contentContainerStyle={{
          gap: 18,
          paddingHorizontal: 20,
          paddingVertical: 24,
        }}
      >
        <View style={{ gap: 14 }}>
          <Link href='/' asChild>
            <Pressable
              accessibilityRole='button'
              style={{
                alignSelf: 'flex-start',
                borderRadius: 999,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                {translateKangurMobileActionLabel('Back', locale)}
              </Text>
            </Pressable>
          </Link>

          <Card>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
              {copy({
                de: 'Mobiles Training',
                en: 'Mobile practice',
                pl: 'Trening mobilny',
              })}
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>
              {operationConfig.label}
            </Text>
            <Text style={{ color: '#475569', fontSize: 15, lineHeight: 22 }}>
              {getPracticeKindDescription(operationConfig.kind, locale)}
            </Text>
          </Card>

          {shouldShowPreparationCard ? (
            <Card>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Vor dem Start',
                  en: 'Before you start',
                  pl: 'Przed startem',
                })}
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 22, fontWeight: '800' }}>
                {copy({
                  de: 'Trainingsplan',
                  en: 'Session plan',
                  pl: 'Plan sesji',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Zum Start siehst du hier den Umfang der Serie, den Speicherweg und die schnellsten Wege zurück zu Lektionen, Verlauf und Tagesplan.',
                  en: 'At the start, this shows the run size, the save path, and the quickest routes back to lessons, history, and the daily plan.',
                  pl: 'Na starcie widzisz tutaj rozmiar serii, sposób zapisu oraz najszybsze przejścia do lekcji, historii i planu dnia.',
                })}
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Pill
                  label={formatPracticeQuestionCountLabel(questions.length, locale)}
                  tone={PRACTICE_COUNT_TONE}
                />
                <Pill
                  label={getPracticeKindChipLabel(operationConfig.kind, locale)}
                  tone={PRACTICE_KIND_TONE}
                />
                <Pill label={practiceSyncPreview.label} tone={practiceSyncPreview.tone} />
              </View>

              <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
                {practiceSyncPreview.body}
              </Text>

              <View style={{ gap: 10 }}>
                {lessonHref ? (
                  <Link href={lessonHref} asChild>
                    <Pressable
                      accessibilityRole='button'
                      style={{
                        alignSelf: 'stretch',
                        width: '100%',
                        borderRadius: 16,
                        backgroundColor: '#0f172a',
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                      }}
                    >
                      <Text
                        style={{
                          color: '#ffffff',
                          fontWeight: '700',
                          textAlign: 'center',
                        }}
                      >
                        {translateKangurMobileActionLabel('Open matching lesson', locale)}
                      </Text>
                    </Pressable>
                  </Link>
                ) : null}
                <Link href={practiceModeHistoryHref} asChild>
                  <Pressable
                    accessibilityRole='button'
                    style={{
                      alignSelf: 'stretch',
                      width: '100%',
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: '#cbd5e1',
                      backgroundColor: '#ffffff',
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: '#0f172a',
                        fontWeight: '700',
                        textAlign: 'center',
                      }}
                    >
                      {translateKangurMobileActionLabel('View mode history', locale)}
                    </Text>
                  </Pressable>
                </Link>
                <Link href={createKangurPlanHref()} asChild>
                  <Pressable
                    accessibilityRole='button'
                    style={{
                      alignSelf: 'stretch',
                      width: '100%',
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: '#cbd5e1',
                      backgroundColor: '#ffffff',
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: '#0f172a',
                        fontWeight: '700',
                        textAlign: 'center',
                      }}
                    >
                      {translateKangurMobileActionLabel('Open daily plan', locale)}
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </Card>
          ) : null}

          {completion ? (
            <Card>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Zusammenfassung',
                  en: 'Summary',
                  pl: 'Podsumowanie',
                })}
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 24, fontWeight: '800' }}>
                {formatPracticeResultLabel(correctAnswers, questions.length, locale)}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {formatPracticeSummaryMeta(completion, locale)}
              </Text>
              {scoreSyncState ? (
                <View
                  style={{
                    ...scoreSyncAppearance,
                    borderRadius: 18,
                    borderWidth: 1,
                    padding: 12,
                  }}
                >
                  <Text
                    style={{
                      color: scoreSyncAppearance?.textColor ?? '#0f172a',
                      fontSize: 13,
                      lineHeight: 18,
                      fontWeight: '600',
                    }}
                  >
                    {scoreSyncState.message}
                  </Text>
                </View>
              ) : null}
              {__DEV__ && scoreSyncState?.status === 'synced' ? (
                <View
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: '#dbeafe',
                    backgroundColor: '#eff6ff',
                    padding: 12,
                    gap: 10,
                  }}
                >
                  <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '800' }}>
                    {copy({
                      de: 'Entwickler-Synchronisierungsvorschau',
                      en: 'Developer sync proof',
                      pl: 'Deweloperski podgląd synchronizacji',
                    })}
                  </Text>
                  <Text style={{ color: '#1e3a8a', fontSize: 13, lineHeight: 18 }}>
                    {copy({
                      de: 'Das prueft dieselben mobilen Datenquellen, die Ergebnisse, Profil, Tagesplan und Rangliste speisen.',
                      en: 'This checks the same mobile data sources that feed scores, profile, daily plan, and leaderboard.',
                      pl: 'To sprawdza te same mobilne źródła danych, które zasilają wyniki, profil, plan dnia i ranking.',
                    })}
                  </Text>
                  {practiceSyncProof.isLoading ? (
                    <Text style={{ color: '#1e3a8a', fontSize: 13, lineHeight: 18 }}>
                      {copy({
                        de: 'Synchronisierungsvorschau wird aktualisiert...',
                        en: 'Refreshing the sync proof...',
                        pl: 'Odświeżamy podgląd synchronizacji...',
                      })}
                    </Text>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {practiceSyncProof.snapshot.surfaces.map((surface) => (
                        <View
                          key={surface.label}
                          style={{
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor:
                              surface.status === 'ready' ? '#86efac' : '#fca5a5',
                            backgroundColor:
                              surface.status === 'ready' ? '#f0fdf4' : '#fef2f2',
                            padding: 10,
                            gap: 4,
                          }}
                        >
                          <Text
                            style={{
                              color:
                                surface.status === 'ready' ? '#166534' : '#b91c1c',
                              fontSize: 13,
                              fontWeight: '800',
                            }}
                          >
                            {surface.label}:{' '}
                            {surface.status === 'ready'
                              ? copy({
                                  de: 'bereit',
                                  en: 'ready',
                                  pl: 'gotowe',
                                })
                              : copy({
                                  de: 'fehlt',
                                  en: 'missing',
                                  pl: 'brak',
                                })}
                          </Text>
                          <Text
                            style={{
                              color:
                                surface.status === 'ready' ? '#166534' : '#991b1b',
                              fontSize: 13,
                              lineHeight: 18,
                            }}
                          >
                            {surface.detail}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {practiceSyncProof.error ? (
                    <Text style={{ color: '#991b1b', fontSize: 13, lineHeight: 18 }}>
                      {practiceSyncProof.error}
                    </Text>
                  ) : null}
                  <Pressable
                    accessibilityRole='button'
                    onPress={() => {
                      void practiceSyncProof.refresh();
                    }}
                    style={{
                      alignSelf: 'flex-start',
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: '#93c5fd',
                      backgroundColor: '#ffffff',
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                    }}
                  >
                    <Text style={{ color: '#1d4ed8', fontWeight: '700' }}>
                      {translateKangurMobileActionLabel('Refresh proof', locale)}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {completion.newBadges.map((badgeId) => (
                  <View
                    key={badgeId}
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: '#c7d2fe',
                      backgroundColor: '#eef2ff',
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Text style={{ color: '#4338ca', fontSize: 12, fontWeight: '700' }}>
                      {copy({
                        de: 'Neues Abzeichen',
                        en: 'New badge',
                        pl: 'Nowa odznaka',
                      })}
                      : {getLocalizedKangurMetadataBadgeName(badgeId, locale, badgeId)}
                    </Text>
                  </View>
                ))}
              </View>
              <View
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  backgroundColor: '#f8fafc',
                  padding: 14,
                  gap: 10,
                }}
              >
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                  {copy({
                    de: 'Nach dem Training',
                    en: 'After practice',
                    pl: 'Po treningu',
                  })}
                </Text>
                <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                  {copy({
                    de: 'Schneller Rückweg zu Rivalen',
                    en: 'Quick return to rivals',
                    pl: 'Szybki powrót do rywali',
                  })}
                </Text>
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: 'Prüfe den aktuellen Duellstand, sieh die letzten Rivalen und starte einen Rückkampf, ohne die Trainingszusammenfassung zu verlassen.',
                    en: 'Check the current duel standing, see recent rivals, and start a rematch without leaving the practice summary.',
                    pl: 'Sprawdź aktualny stan pojedynków, zobacz ostatnich rywali i wejdź w rewanż bez wychodzenia z podsumowania treningu.',
                  })}
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Pill
                    label={copy({
                      de: `Rivalen ${practiceDuels.opponents.length}`,
                      en: `Rivals ${practiceDuels.opponents.length}`,
                      pl: `Rywale ${practiceDuels.opponents.length}`,
                    })}
                    tone={{
                      backgroundColor: '#eef2ff',
                      borderColor: '#c7d2fe',
                      textColor: '#4338ca',
                    }}
                  />
                  <Pill
                    label={
                      practiceDuels.currentRank
                        ? copy({
                            de: `Deine Position #${practiceDuels.currentRank}`,
                            en: `Your rank #${practiceDuels.currentRank}`,
                            pl: `Twoja pozycja #${practiceDuels.currentRank}`,
                          })
                        : copy({
                            de: 'Wartet auf Sichtbarkeit',
                            en: 'Waiting for visibility',
                            pl: 'Czeka na widoczność',
                          })
                    }
                    tone={{
                      backgroundColor: '#ecfdf5',
                      borderColor: '#a7f3d0',
                      textColor: '#047857',
                    }}
                  />
                </View>

                {practiceDuels.isRestoringAuth || practiceDuels.isLoading ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Der Duellstand nach dem Training wird geladen.',
                      en: 'Loading the post-practice duel standing.',
                      pl: 'Pobieramy stan pojedynków po treningu.',
                    })}
                  </Text>
                ) : practiceDuels.error ? (
                  <View style={{ gap: 10 }}>
                    <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
                      {practiceDuels.error}
                    </Text>
                    <Pressable
                      accessibilityRole='button'
                      onPress={() => {
                        void practiceDuels.refresh();
                      }}
                      style={{
                        alignSelf: 'flex-start',
                        borderRadius: 999,
                        backgroundColor: '#0f172a',
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                      }}
                    >
                      <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                        {copy({
                          de: 'Duelle aktualisieren',
                          en: 'Refresh duels',
                          pl: 'Odśwież pojedynki',
                        })}
                      </Text>
                    </Pressable>
                  </View>
                ) : !practiceDuels.isAuthenticated ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Melde eine Lernenden-Sitzung an, um hier dein Duellergebnis, letzte Rivalen und schnelle Rueckspiele zu sehen.',
                      en: 'Sign in the learner session to see your duel result, recent rivals, and quick rematches here.',
                      pl: 'Zaloguj sesję ucznia, aby zobaczyć tutaj wynik w pojedynkach, ostatnich rywali i szybkie rewanże.',
                    })}
                  </Text>
                ) : (
                  <View style={{ gap: 12 }}>
                    {practiceDuels.currentEntry ? (
                      <View
                        style={{
                          borderRadius: 18,
                          borderWidth: 1,
                          borderColor: '#bfdbfe',
                          backgroundColor: '#eff6ff',
                          padding: 12,
                          gap: 6,
                        }}
                      >
                        <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '800' }}>
                          {copy({
                            de: 'DEIN DUELLERGEBNIS',
                            en: 'YOUR DUEL RESULT',
                            pl: 'TWÓJ WYNIK W POJEDYNKACH',
                          })}
                        </Text>
                        <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                          #{practiceDuels.currentRank} {practiceDuels.currentEntry.displayName}
                        </Text>
                        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                          {formatPracticeDuelRecord(practiceDuels.currentEntry, locale)}
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                        {copy({
                          de: 'Dein Konto ist in diesem Duellstand noch nicht sichtbar. Schließe ein weiteres Duell ab oder öffne die Lobby, damit deine Position hier erscheint.',
                          en: 'Your account is not visible in this duel standing yet. Finish another duel or open the lobby so your rank appears here.',
                          pl: 'Twojego konta nie widać jeszcze w tym stanie pojedynków. Rozegraj kolejny pojedynek albo otwórz lobby, aby pojawiła się tutaj Twoja pozycja.',
                        })}
                      </Text>
                    )}

                    {practiceDuels.actionError ? (
                      <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
                        {practiceDuels.actionError}
                      </Text>
                    ) : null}

                    {practiceDuels.opponents.length === 0 ? (
                      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                        {copy({
                          de: 'Es gibt noch keine letzten Rivalen. Das erste beendete Duell füllt hier die Rivalenliste und schaltet schnelle Rueckspiele frei.',
                          en: 'There are no recent rivals yet. The first completed duel will fill the rival list here and unlock quick rematches.',
                          pl: 'Nie ma jeszcze ostatnich rywali. Pierwszy zakończony pojedynek wypełni tutaj listę rywali i odblokuje szybkie rewanże.',
                        })}
                      </Text>
                    ) : (
                      <View style={{ gap: 10 }}>
                        {practiceDuels.opponents.map((opponent) => (
                          <View
                            key={opponent.learnerId}
                            style={{
                              borderRadius: 18,
                              borderWidth: 1,
                              borderColor: '#e2e8f0',
                              backgroundColor: '#ffffff',
                              padding: 12,
                              gap: 6,
                            }}
                          >
                            <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
                              {opponent.displayName}
                            </Text>
                            <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                              {copy({
                                de: 'Letztes Duell',
                                en: 'Last duel',
                                pl: 'Ostatni pojedynek',
                              })}{' '}
                              {new Intl.DateTimeFormat(localeTag, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              }).format(new Date(opponent.lastPlayedAt))}
                            </Text>
                            <Pressable
                              accessibilityRole='button'
                              disabled={practiceDuels.isActionPending}
                              onPress={() => {
                                void practiceDuels.createRematch(opponent.learnerId).then((sessionId) => {
                                  if (sessionId) {
                                    openDuelSession(sessionId);
                                  }
                                });
                              }}
                              style={{
                                alignSelf: 'flex-start',
                                borderRadius: 999,
                                backgroundColor: practiceDuels.isActionPending ? '#94a3b8' : '#1d4ed8',
                                paddingHorizontal: 12,
                                paddingVertical: 9,
                              }}
                            >
                              <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                                {practiceDuels.pendingOpponentLearnerId === opponent.learnerId
                                  ? copy({
                                      de: 'Rueckspiel wird gesendet...',
                                      en: 'Sending rematch...',
                                      pl: 'Wysyłanie rewanżu...',
                                    })
                                  : copy({
                                      de: 'Schnelles Rueckspiel',
                                      en: 'Quick rematch',
                                      pl: 'Szybki rewanż',
                                    })}
                              </Text>
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={{ alignSelf: 'stretch', gap: 10 }}>
                      <Pressable
                        accessibilityRole='button'
                        onPress={() => {
                          void practiceDuels.refresh();
                        }}
                        style={{
                          alignSelf: 'stretch',
                          width: '100%',
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: '#cbd5e1',
                          backgroundColor: '#ffffff',
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                        }}
                      >
                        <Text style={{ color: '#0f172a', fontWeight: '700', textAlign: 'center' }}>
                          {copy({
                            de: 'Duelle aktualisieren',
                            en: 'Refresh duels',
                            pl: 'Odśwież pojedynki',
                          })}
                        </Text>
                      </Pressable>

                      <Link href={createKangurDuelsHref()} asChild>
                        <Pressable
                          accessibilityRole='button'
                          style={{
                            alignSelf: 'stretch',
                            width: '100%',
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: '#cbd5e1',
                            backgroundColor: '#ffffff',
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                          }}
                        >
                          <Text style={{ color: '#0f172a', fontWeight: '700', textAlign: 'center' }}>
                            {copy({
                              de: 'Duelle oeffnen',
                              en: 'Open duels',
                              pl: 'Otwórz pojedynki',
                            })}
                          </Text>
                        </Pressable>
                      </Link>
                    </View>
                  </View>
                )}
              </View>

              <View
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  backgroundColor: '#f8fafc',
                  padding: 14,
                  gap: 10,
                }}
              >
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                  {copy({
                    de: 'Lektionsbeherrschung',
                    en: 'Lesson mastery',
                    pl: 'Opanowanie lekcji',
                  })}
                </Text>
                <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                  {copy({
                    de: 'Lektionsplan nach dem Training',
                    en: 'Post-practice lesson plan',
                    pl: 'Plan lekcji po treningu',
                  })}
                </Text>
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: 'Verbinde das frische Trainingsergebnis direkt mit lokal gespeichertem Lektionsstand und entscheide sofort, was wiederholt und was nur gehalten werden soll.',
                    en: 'Connect the fresh practice result directly with saved lesson mastery and decide right away what needs review and what only needs maintaining.',
                    pl: 'Połącz świeży wynik treningu z zapisanym opanowaniem lekcji i od razu zdecyduj, co powtórzyć, a co tylko podtrzymać.',
                  })}
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <View
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: '#c7d2fe',
                      backgroundColor: '#eef2ff',
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Text style={{ color: '#4338ca', fontSize: 12, fontWeight: '700' }}>
                      {copy({
                        de: `Verfolgt ${lessonMastery.trackedLessons}`,
                        en: `Tracked ${lessonMastery.trackedLessons}`,
                        pl: `Śledzone ${lessonMastery.trackedLessons}`,
                      })}
                    </Text>
                  </View>
                  <View
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: '#a7f3d0',
                      backgroundColor: '#ecfdf5',
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Text style={{ color: '#047857', fontSize: 12, fontWeight: '700' }}>
                      {copy({
                        de: `Beherrscht ${lessonMastery.masteredLessons}`,
                        en: `Mastered ${lessonMastery.masteredLessons}`,
                        pl: `Opanowane ${lessonMastery.masteredLessons}`,
                      })}
                    </Text>
                  </View>
                  <View
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: '#fde68a',
                      backgroundColor: '#fffbeb',
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Text style={{ color: '#b45309', fontSize: 12, fontWeight: '700' }}>
                      {copy({
                        de: `Zum Wiederholen ${lessonMastery.lessonsNeedingPractice}`,
                        en: `Needs review ${lessonMastery.lessonsNeedingPractice}`,
                        pl: `Do powtórki ${lessonMastery.lessonsNeedingPractice}`,
                      })}
                    </Text>
                  </View>
                </View>

                {lessonMastery.trackedLessons === 0 ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Es gibt noch keine gespeicherten Lektionsversuche. Öffne eine Lektion und speichere den ersten Checkpoint, damit hier Stärken und Wiederholungen erscheinen.',
                      en: 'There are no saved lesson attempts yet. Open a lesson and save the first checkpoint to unlock strengths and review suggestions here.',
                      pl: 'Nie ma jeszcze zapisanych prób lekcji. Otwórz lekcję i zapisz pierwszy checkpoint, aby odblokować tutaj mocne strony i powtórki.',
                    })}
                  </Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {lessonFocusSummary ? (
                      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                        {lessonFocusSummary}
                      </Text>
                    ) : null}

                    <View style={{ alignSelf: 'stretch', gap: 10 }}>
                      {weakestLesson ? (
                        <Link href={weakestLesson.lessonHref} asChild>
                          <Pressable
                            accessibilityRole='button'
                            style={{
                              alignSelf: 'stretch',
                              width: '100%',
                              borderRadius: 999,
                              backgroundColor: '#0f172a',
                              paddingHorizontal: 14,
                              paddingVertical: 10,
                            }}
                          >
                            <Text style={{ color: '#ffffff', fontWeight: '700', textAlign: 'center' }}>
                              {copy({
                                de: `Fokus: ${weakestLesson.title}`,
                                en: `Focus: ${weakestLesson.title}`,
                                pl: `Skup się: ${weakestLesson.title}`,
                              })}
                            </Text>
                          </Pressable>
                        </Link>
                      ) : null}

                      {strongestLesson ? (
                        <Link href={strongestLesson.lessonHref} asChild>
                          <Pressable
                            accessibilityRole='button'
                            style={{
                              alignSelf: 'stretch',
                              width: '100%',
                              borderRadius: 999,
                              borderWidth: 1,
                              borderColor: '#cbd5e1',
                              backgroundColor: '#ffffff',
                              paddingHorizontal: 14,
                              paddingVertical: 10,
                            }}
                          >
                            <Text style={{ color: '#0f172a', fontWeight: '700', textAlign: 'center' }}>
                              {copy({
                                de: `Stärke halten: ${strongestLesson.title}`,
                                en: `Maintain strength: ${strongestLesson.title}`,
                                pl: `Podtrzymaj: ${strongestLesson.title}`,
                              })}
                            </Text>
                          </Pressable>
                        </Link>
                      ) : null}
                    </View>

                    {lessonMastery.weakest[0] ? (
                      <LessonMasteryRow
                        insight={lessonMastery.weakest[0]}
                        title={copy({
                          de: 'Zum Wiederholen',
                          en: 'Needs review',
                          pl: 'Do powtórki',
                        })}
                      />
                    ) : null}
                    {lessonMastery.strongest[0] ? (
                      <LessonMasteryRow
                        insight={lessonMastery.strongest[0]}
                        title={copy({
                          de: 'Stärkste Lektion',
                          en: 'Strongest lesson',
                          pl: 'Najmocniejsza lekcja',
                        })}
                      />
                    ) : null}
                  </View>
                )}
              </View>

              <View
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  backgroundColor: '#f8fafc',
                  padding: 14,
                  gap: 10,
                }}
              >
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                  {copy({
                    de: 'Abzeichen',
                    en: 'Badges',
                    pl: 'Odznaki',
                  })}
                </Text>
                <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                  {copy({
                    de: 'Abzeichen-Zentrale',
                    en: 'Badge hub',
                    pl: 'Centrum odznak',
                  })}
                </Text>
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: 'Behalte im Blick, was bereits freigeschaltet ist und welches lokale Ziel am nächsten an der nächsten Abzeichenstufe liegt.',
                    en: 'Keep track of what is already unlocked and which local goal is closest to the next badge threshold.',
                    pl: 'Śledź, co jest już odblokowane i który lokalny cel jest najbliżej kolejnego progu odznaki.',
                  })}
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <View
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: '#c7d2fe',
                      backgroundColor: '#eef2ff',
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Text style={{ color: '#4338ca', fontSize: 12, fontWeight: '700' }}>
                      {copy({
                        de: `Freigeschaltet ${practiceBadges.unlockedBadges}/${practiceBadges.totalBadges}`,
                        en: `Unlocked ${practiceBadges.unlockedBadges}/${practiceBadges.totalBadges}`,
                        pl: `Odblokowane ${practiceBadges.unlockedBadges}/${practiceBadges.totalBadges}`,
                      })}
                    </Text>
                  </View>
                  <View
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: '#fde68a',
                      backgroundColor: '#fffbeb',
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Text style={{ color: '#b45309', fontSize: 12, fontWeight: '700' }}>
                      {copy({
                        de: `Offen ${practiceBadges.remainingBadges}`,
                        en: `Remaining ${practiceBadges.remainingBadges}`,
                        pl: `Do zdobycia ${practiceBadges.remainingBadges}`,
                      })}
                    </Text>
                  </View>
                </View>

                {practiceBadges.recentBadges.length === 0 ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Es gibt noch keine lokal freigeschalteten Abzeichen. Schließe Lektionen, Trainings oder Spiele ab, damit sie hier erscheinen.',
                      en: 'There are no locally unlocked badges yet. Finish lessons, practice runs, or games so they appear here.',
                      pl: 'Nie ma jeszcze lokalnie odblokowanych odznak. Ukończ lekcje, treningi albo gry, aby pojawiły się tutaj.',
                    })}
                  </Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
                      {copy({
                        de: 'Zuletzt freigeschaltet',
                        en: 'Recently unlocked',
                        pl: 'Ostatnio odblokowane',
                      })}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {practiceBadges.recentBadges.map((item) => (
                        <PracticeBadgeChip key={item.id} item={item} />
                      ))}
                    </View>
                  </View>
                )}

                <Link href={PROFILE_ROUTE} asChild>
                  <Pressable
                    accessibilityRole='button'
                    style={{
                      alignSelf: 'flex-start',
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: '#cbd5e1',
                      backgroundColor: '#ffffff',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                      {copy({
                        de: 'Profil und Abzeichen öffnen',
                        en: 'Open profile and badges',
                        pl: 'Otwórz profil i odznaki',
                      })}
                    </Text>
                  </Pressable>
                </Link>
              </View>

              <View
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  backgroundColor: '#f8fafc',
                  padding: 14,
                  gap: 10,
                }}
              >
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                  {copy({
                    de: 'Nach dem Training',
                    en: 'After practice',
                    pl: 'Po treningu',
                  })}
                </Text>
                <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                  {copy({
                    de: 'Ergebniszentrale',
                    en: 'Results hub',
                    pl: 'Centrum wyników',
                  })}
                </Text>
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: 'Nach der Runde bleiben die zuletzt synchronisierten Sitzungen hier griffbereit, damit du direkt wieder ins Training, die passende Lektion oder die Modus-Historie springen kannst.',
                    en: 'The latest synchronized sessions stay close here so you can jump right back into practice, the matching lesson, or the mode history.',
                    pl: 'Ostatnie zsynchronizowane sesje są tutaj pod ręką, aby można było od razu wrócić do treningu, pasującej lekcji albo historii trybu.',
                  })}
                </Text>

                <Link href={createKangurResultsHref()} asChild>
                  <Pressable
                    accessibilityRole='button'
                    style={{
                      alignSelf: 'flex-start',
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: '#cbd5e1',
                      backgroundColor: '#ffffff',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                      {copy({
                        de: 'Vollständigen Verlauf öffnen',
                        en: 'Open full history',
                        pl: 'Otwórz pełną historię',
                      })}
                    </Text>
                  </Pressable>
                </Link>

                {practiceRecentResults.isLoading || practiceRecentResults.isRestoringAuth ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Die letzten Ergebnisse werden geladen.',
                      en: 'Loading recent results.',
                      pl: 'Ładujemy ostatnie wyniki.',
                    })}
                  </Text>
                ) : !practiceRecentResults.isEnabled ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Melde die Schulersitzung an, um hier die synchronisierten Sitzungen zu sehen.',
                      en: 'Sign in the learner session to see synchronized sessions here.',
                      pl: 'Zaloguj sesję ucznia, aby zobaczyć tutaj zsynchronizowane sesje.',
                    })}
                  </Text>
                ) : practiceRecentResults.error ? (
                  <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
                    {practiceRecentResults.error}
                  </Text>
                ) : practiceRecentResults.recentResultItems.length === 0 ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Es gibt noch keine synchronisierten Ergebnisse. Beende einen Lauf, damit er hier erscheint.',
                      en: 'There are no synchronized results yet. Finish a run so it appears here.',
                      pl: 'Nie ma jeszcze zsynchronizowanych wyników. Ukończ serię, aby pojawiła się tutaj.',
                    })}
                  </Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {practiceRecentResults.recentResultItems.map((item) => (
                      <PracticeRecentResultRow key={item.result.id} item={item} />
                    ))}
                  </View>
                )}
              </View>

              <View
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  backgroundColor: '#f8fafc',
                  padding: 14,
                  gap: 10,
                }}
              >
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                  {copy({
                    de: 'Nach dem Training',
                    en: 'After practice',
                    pl: 'Po treningu',
                  })}
                </Text>
                <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                  {copy({
                    de: 'Plan nach dem Training',
                    en: 'Post-practice plan',
                    pl: 'Plan po treningu',
                  })}
                </Text>
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: 'Wandle diese Runde direkt in die nächsten lokalen Schritte um, ohne den Trainingsfluss zu verlieren.',
                    en: 'Turn this run directly into the next local actions without losing the training flow.',
                    pl: 'Zamień tę serię od razu w kolejne lokalne kroki, bez gubienia rytmu treningu.',
                  })}
                </Text>

                {practiceAssignments.assignmentItems.length === 0 ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Es gibt noch keine lokalen Aufgaben. Öffne Lektionen oder absolviere weitere Trainings, um den nächsten Plan aufzubauen.',
                      en: 'There are no local tasks yet. Open lessons or complete more practice to build the next plan.',
                      pl: 'Nie ma jeszcze lokalnych zadań. Otwórz lekcje albo wykonaj kolejne treningi, aby zbudować następny plan.',
                    })}
                  </Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {practiceAssignments.assignmentItems.map((item) => (
                      <PracticeAssignmentRow key={item.assignment.id} item={item} />
                    ))}
                  </View>
                )}
              </View>

              <View
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  backgroundColor: '#f8fafc',
                  padding: 14,
                  gap: 10,
                }}
              >
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                  {copy({
                    de: 'Letzte Lektions-Checkpoints',
                    en: 'Recent lesson checkpoints',
                    pl: 'Ostatnie checkpointy lekcji',
                  })}
                </Text>
                <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                  {copy({
                    de: 'Weiter mit Lektionen',
                    en: 'Continue with lessons',
                    pl: 'Kontynuuj lekcje',
                  })}
                </Text>
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: 'Nach der Runde kannst du direkt zu den zuletzt gespeicherten Lektionen zurückspringen und dann passend weitertrainieren.',
                    en: 'After the run you can jump back to the most recently saved lessons and then continue with matching practice.',
                    pl: 'Po zakończeniu serii możesz wrócić do ostatnio zapisanych lekcji i potem dalej trenować w pasującym trybie.',
                  })}
                </Text>

                {lessonCheckpoints.recentCheckpoints.length === 0 ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Es gibt noch keine gespeicherten Checkpoints. Öffne eine Lektion und speichere den ersten Stand, damit er hier erscheint.',
                      en: 'There are no saved checkpoints yet. Open a lesson and save the first state so it appears here.',
                      pl: 'Nie ma jeszcze zapisanych checkpointów. Otwórz lekcję i zapisz pierwszy stan, aby pojawił się tutaj.',
                    })}
                  </Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {lessonCheckpoints.recentCheckpoints.map((item) => (
                      <LessonCheckpointRow key={item.componentId} item={item} />
                    ))}
                    <Link href='/lessons' asChild>
                      <Pressable
                        accessibilityRole='button'
                        style={{
                          alignSelf: 'flex-start',
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: '#cbd5e1',
                          backgroundColor: '#ffffff',
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                        }}
                      >
                        <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                          {copy({
                            de: 'Lektionen öffnen',
                            en: 'Open lessons',
                            pl: 'Otwórz lekcje',
                          })}
                        </Text>
                      </Pressable>
                    </Link>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <Pressable
                  accessibilityRole='button'
                  onPress={restart}
                  style={{
                    borderRadius: 999,
                    backgroundColor: '#0f172a',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                    {translateKangurMobileActionLabel('Train again', locale)}
                  </Text>
                </Pressable>
                <Link
                  href={practiceModeHistoryHref}
                  asChild
                >
                  <Pressable
                    accessibilityRole='button'
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: '#cbd5e1',
                      backgroundColor: '#ffffff',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                      {translateKangurMobileActionLabel('View mode history', locale)}
                    </Text>
                  </Pressable>
                </Link>
                {lessonHref ? (
                  <Link href={lessonHref} asChild>
                    <Pressable
                      accessibilityRole='button'
                      style={{
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: '#cbd5e1',
                        backgroundColor: '#ffffff',
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                      }}
                    >
                      <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                        {translateKangurMobileActionLabel('Open matching lesson', locale)}
                      </Text>
                    </Pressable>
                  </Link>
                ) : null}
                <Link href={createKangurPlanHref()} asChild>
                  <Pressable
                    accessibilityRole='button'
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: '#cbd5e1',
                      backgroundColor: '#ffffff',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                      {translateKangurMobileActionLabel('Open daily plan', locale)}
                    </Text>
                  </Pressable>
                </Link>
                <Link href='/profile' asChild>
                  <Pressable
                    accessibilityRole='button'
                    style={{
                      borderRadius: 999,
                      backgroundColor: '#1d4ed8',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                      {translateKangurMobileActionLabel('Back to profile', locale)}
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </Card>
          ) : currentQuestion ? (
            <Card>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {formatPracticeProgressLabel(currentIndex + 1, questions.length, locale)}
              </Text>
              <View
                style={{
                  height: 10,
                  borderRadius: 999,
                  overflow: 'hidden',
                  backgroundColor: '#e2e8f0',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${((currentIndex + 1) / questions.length) * 100}%`,
                    backgroundColor: '#1d4ed8',
                  }}
                />
              </View>
              <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>
                {currentQuestion.question}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Waehle eine Antwort. Das Ergebnis wird lokal gespeichert, sobald die ganze Runde beendet ist.',
                  en: 'Choose one answer. The result will be saved locally after the whole run finishes.',
                  pl: 'Wybierz jedną odpowiedź. Wynik zapisze się lokalnie po zakończeniu całej serii.',
                })}
              </Text>

              <View style={{ gap: 10 }}>
                {currentQuestion.choices.map((choice) => {
                  const isSelected =
                    selectedChoice !== null &&
                    String(selectedChoice) === String(choice);
                  const isCorrectChoice =
                    String(choice) === String(currentQuestion.answer);
                  const state =
                    selectedChoice === null
                      ? 'idle'
                      : isCorrectChoice
                        ? 'correct'
                        : isSelected
                          ? 'incorrect'
                          : 'neutral';

                  return (
                    <ChoiceButton
                      key={String(choice)}
                      label={String(choice)}
                      onPress={() => {
                        handleChoicePress(choice);
                      }}
                      state={state}
                    />
                  );
                })}
              </View>

              {selectedChoice !== null ? (
                <View style={{ gap: 10 }}>
                  <Text
                    style={{
                      color: isChoiceCorrect ? '#166534' : '#b91c1c',
                      fontSize: 14,
                      lineHeight: 20,
                    }}
                  >
                    {formatPracticeAnswerFeedback(
                      isChoiceCorrect,
                      String(currentQuestion.answer),
                      locale,
                    )}
                  </Text>
                  <Pressable
                    accessibilityRole='button'
                    onPress={handleNext}
                    style={{
                      alignSelf: 'flex-start',
                      borderRadius: 999,
                      backgroundColor: '#0f172a',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                    >
                      <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                        {isLastQuestion
                          ? copy({
                              de: 'Training beenden',
                              en: 'Finish practice',
                              pl: 'Zakończ trening',
                            })
                          : copy({
                              de: 'Naechste Frage',
                              en: 'Next question',
                              pl: 'Następne pytanie',
                            })}
                      </Text>
                    </Pressable>
                </View>
              ) : null}
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
