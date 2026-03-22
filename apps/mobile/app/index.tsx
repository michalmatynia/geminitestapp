import { Link, type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import type { KangurDuelSeries } from '@kangur/contracts';

import { useKangurMobileAuth } from '../src/auth/KangurMobileAuthContext';
import { createKangurDuelsHref } from '../src/duels/duelsHref';
import {
  MOBILE_DUEL_DEFAULT_DIFFICULTY,
  MOBILE_DUEL_DEFAULT_OPERATION,
  MOBILE_DUEL_DEFAULT_QUESTION_COUNT,
  MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC,
} from '../src/duels/mobileDuelDefaults';
import { shareKangurDuelInvite } from '../src/duels/duelInviteShare';
import {
  buildKangurHomeDebugProofViewModel,
  resolveKangurHomeDebugProofOperation,
} from '../src/home/homeDebugProof';
import { getKangurHomeAuthBoundaryViewModel } from '../src/home/homeAuthBoundary';
import { HomeLoadingShell } from '../src/home/HomeLoadingShell';
import { useKangurMobileHomeDuelsPresence } from '../src/home/useKangurMobileHomeDuelsPresence';
import { useKangurMobileHomeDuelsRematches } from '../src/home/useKangurMobileHomeDuelsRematches';
import { useKangurMobileHomeDuelsLeaderboard } from '../src/home/useKangurMobileHomeDuelsLeaderboard';
import {
  useKangurMobileHomeAssignments,
  type KangurMobileHomeAssignmentItem,
} from '../src/home/useKangurMobileHomeAssignments';
import {
  useKangurMobileHomeLessonMastery,
  type KangurMobileHomeLessonMasteryItem,
} from '../src/home/useKangurMobileHomeLessonMastery';
import {
  useKangurMobileHomeLessonCheckpoints,
  type KangurMobileHomeLessonCheckpointItem,
} from '../src/home/useKangurMobileHomeLessonCheckpoints';
import {
  useKangurMobileHomeBadges,
  type KangurMobileHomeBadgeItem,
} from '../src/home/useKangurMobileHomeBadges';
import { useKangurMobileHomeDuelsSpotlight } from '../src/home/useKangurMobileHomeDuelsSpotlight';
import { useKangurMobileRecentResults } from '../src/home/useKangurMobileRecentResults';
import { useKangurMobileHomeDuelsInvites } from '../src/home/useKangurMobileHomeDuelsInvites';
import { useKangurMobileTrainingFocus } from '../src/home/useKangurMobileTrainingFocus';
import { useHomeScreenBootState } from '../src/home/useHomeScreenBootState';
import { useKangurMobileI18n } from '../src/i18n/kangurMobileI18n';
import { createKangurLessonHref } from '../src/lessons/lessonHref';
import { createKangurPlanHref } from '../src/plan/planHref';
import { createKangurPracticeHref } from '../src/practice/practiceHref';
import { useKangurMobileRuntime } from '../src/providers/KangurRuntimeContext';
import { translateKangurMobileActionLabel } from '../src/shared/translateKangurMobileActionLabel';
import {
  createKangurResultsHref,
} from '../src/scores/resultsHref';
import {
  formatKangurMobileScoreOperation,
} from '../src/scores/mobileScoreSummary';

const RESULTS_ROUTE = '/results' as Href;
const PROFILE_ROUTE = '/profile' as Href;
const LEADERBOARD_ROUTE = '/leaderboard' as Href;
const LESSONS_ROUTE = '/lessons' as Href;
const PRACTICE_ROUTE = createKangurPracticeHref('mixed');
const PLAN_ROUTE = createKangurPlanHref();
const DUELS_ROUTE = createKangurDuelsHref();

const getHomeDuelModeLabel = (
  value: 'challenge' | 'quick_match',
  locale: 'pl' | 'en' | 'de',
): string => {
  if (value === 'quick_match') {
    return {
      de: 'Schnelles Spiel',
      en: 'Quick match',
      pl: 'Szybki mecz',
    }[locale];
  }

  return {
    de: 'Herausforderung',
    en: 'Challenge',
    pl: 'Wyzwanie',
  }[locale];
};

const getHomeDuelDifficultyLabel = (
  value: 'easy' | 'medium' | 'hard',
  locale: 'pl' | 'en' | 'de',
): string => {
  if (value === 'hard') {
    return {
      de: 'schwer',
      en: 'hard',
      pl: 'trudny',
    }[locale];
  }

  if (value === 'medium') {
    return {
      de: 'mittel',
      en: 'medium',
      pl: 'średni',
    }[locale];
  }

  return {
    de: 'leicht',
    en: 'easy',
    pl: 'łatwy',
  }[locale];
};

const getHomeDuelStatusLabel = (
  value: 'created' | 'waiting' | 'ready' | 'in_progress' | 'completed' | 'aborted',
  locale: 'pl' | 'en' | 'de',
): string => {
  if (value === 'in_progress') {
    return {
      de: 'Lauft',
      en: 'Live',
      pl: 'W trakcie',
    }[locale];
  }

  if (value === 'ready') {
    return {
      de: 'Bereit',
      en: 'Ready',
      pl: 'Gotowy',
    }[locale];
  }

  if (value === 'waiting') {
    return {
      de: 'Wartet',
      en: 'Waiting',
      pl: 'Oczekuje',
    }[locale];
  }

  if (value === 'completed') {
    return {
      de: 'Beendet',
      en: 'Completed',
      pl: 'Zakończony',
    }[locale];
  }

  if (value === 'aborted') {
    return {
      de: 'Abgebrochen',
      en: 'Aborted',
      pl: 'Przerwany',
    }[locale];
  }

  return {
    de: 'Erstellt',
    en: 'Created',
    pl: 'Utworzony',
  }[locale];
};

const getHomeDuelSeriesLabel = (
  series: KangurDuelSeries,
  locale: 'pl' | 'en' | 'de',
): string => {
  const gameIndex = Math.min(series.bestOf, Math.max(1, series.gameIndex));

  if (series.isComplete) {
    return {
      de: `Serie BO${series.bestOf} • beendet nach ${series.completedGames} Spielen`,
      en: `BO${series.bestOf} series • completed after ${series.completedGames} games`,
      pl: `Seria BO${series.bestOf} • zakończona po ${series.completedGames} grach`,
    }[locale];
  }

  return {
    de: `Serie BO${series.bestOf} • Spiel ${gameIndex} von ${series.bestOf} • beendet: ${series.completedGames}`,
    en: `BO${series.bestOf} series • game ${gameIndex} of ${series.bestOf} • completed: ${series.completedGames}`,
    pl: `Seria BO${series.bestOf} • gra ${gameIndex} z ${series.bestOf} • ukończone: ${series.completedGames}`,
  }[locale];
};

function SectionCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}): React.JSX.Element {
  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 24,
        elevation: 3,
        gap: 12,
        padding: 20,
        shadowColor: '#0f172a',
        shadowOffset: { height: 10, width: 0 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
      }}
    >
      <Text
        accessibilityRole='header'
        style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function OutlineLink({
  href,
  hint,
  label,
  fullWidth = true,
}: {
  href: Href;
  hint?: string;
  label: string;
  fullWidth?: boolean;
}): React.JSX.Element {
  return (
    <Link href={href} asChild>
        <Pressable
          accessibilityHint={hint}
          accessibilityLabel={label}
          accessibilityRole='button'
        style={{
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          width: fullWidth ? '100%' : undefined,
          backgroundColor: '#ffffff',
          borderColor: '#cbd5e1',
          borderRadius: 999,
          borderWidth: 1,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Text
          style={{
            color: '#0f172a',
            fontWeight: '700',
            textAlign: fullWidth ? 'center' : 'left',
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

function PrimaryButton({
  disabled = false,
  hint,
  label,
  onPress,
}: {
  disabled?: boolean;
  hint?: string;
  label: string;
  onPress: () => void | Promise<void>;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={label}
      accessibilityRole='button'
      disabled={disabled}
      onPress={() => {
        if (!disabled) {
          void onPress();
        }
      }}
      style={{
        alignSelf: 'flex-start',
        backgroundColor: '#2563eb',
        borderRadius: 999,
        opacity: disabled ? 0.55 : 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <Text style={{ color: '#ffffff', fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

function LabeledTextField({
  autoCapitalize = 'sentences',
  hint,
  label,
  onChangeText,
  placeholder,
  secureTextEntry,
  textContentType,
  value,
}: {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  hint?: string;
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  textContentType?: 'username' | 'password';
  value: string;
}): React.JSX.Element {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: '700' }}>
        {label}
      </Text>
      <TextInput
        accessibilityHint={hint}
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        style={{
          backgroundColor: '#ffffff',
          borderColor: '#cbd5e1',
          borderRadius: 16,
          borderWidth: 1,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
        textContentType={textContentType}
        value={value}
      />
    </View>
  );
}

function FocusCard({
  actionHref,
  actionLabel,
  averageAccuracyPercent,
  lessonHref,
  operation,
  sessions,
  title,
}: {
  actionHref: Href;
  actionLabel: string;
  averageAccuracyPercent: number;
  lessonHref: Href | null;
  operation: string;
  sessions: number;
  title: string;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const operationLabel = formatKangurMobileScoreOperation(operation, locale);

  return (
    <View
      style={{
        backgroundColor: '#f8fafc',
        borderColor: '#e2e8f0',
        borderRadius: 20,
        borderWidth: 1,
        gap: 10,
        padding: 14,
      }}
    >
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {title}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
        {operationLabel}
      </Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: `Trefferquote ${averageAccuracyPercent}% in ${sessions} Versuchen.`,
          en: `Accuracy ${averageAccuracyPercent}% across ${sessions} attempts.`,
          pl: `Skuteczność ${averageAccuracyPercent}% w ${sessions} podejściach.`,
        })}
      </Text>
      <View style={{ flexDirection: 'column', gap: 8 }}>
        <OutlineLink
          href={actionHref}
          hint={copy({
            de: `Öffnet das Training für den Modus ${operationLabel}.`,
            en: `Opens practice for the ${operationLabel} mode.`,
            pl: `Otwiera trening dla trybu ${operationLabel}.`,
          })}
          label={`${actionLabel}: ${operationLabel}`}
        />
        {lessonHref ? (
          <OutlineLink
            href={lessonHref}
            hint={copy({
              de: `Öffnet die Lektion für den Modus ${operationLabel}.`,
              en: `Opens the lesson for the ${operationLabel} mode.`,
              pl: `Otwiera lekcję dla trybu ${operationLabel}.`,
            })}
            label={`${copy({
              de: 'Lektion öffnen',
              en: 'Open lesson',
              pl: 'Otwórz lekcję',
            })}: ${operationLabel}`}
          />
        ) : null}
        <OutlineLink
          href={createKangurResultsHref({ operation })}
          hint={copy({
            de: `Öffnet den Ergebnisverlauf für den Modus ${operationLabel}.`,
            en: `Opens result history for the ${operationLabel} mode.`,
            pl: `Otwiera historię wyników dla trybu ${operationLabel}.`,
          })}
          label={`${copy({
            de: 'Modusverlauf',
            en: 'Mode history',
            pl: 'Historia trybu',
          })}: ${operationLabel}`}
        />
      </View>
    </View>
  );
}

function SummaryChip({
  accent,
  label,
}: {
  accent: 'amber' | 'blue' | 'emerald' | 'rose';
  label: string;
}): React.JSX.Element {
  const tone =
    accent === 'emerald'
      ? {
          backgroundColor: '#ecfdf5',
          borderColor: '#a7f3d0',
          textColor: '#047857',
        }
      : accent === 'amber'
        ? {
            backgroundColor: '#fff7ed',
            borderColor: '#fdba74',
            textColor: '#c2410c',
          }
        : accent === 'rose'
          ? {
              backgroundColor: '#fef2f2',
              borderColor: '#fecaca',
              textColor: '#b91c1c',
            }
        : {
            backgroundColor: '#eef2ff',
            borderColor: '#c7d2fe',
            textColor: '#4338ca',
          };

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: tone.backgroundColor,
        borderColor: tone.borderColor,
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      <Text style={{ color: tone.textColor, fontSize: 12, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

function BadgeChip({
  item,
}: {
  item: KangurMobileHomeBadgeItem;
}): React.JSX.Element {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: '#eef2ff',
        borderColor: '#c7d2fe',
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      <Text style={{ color: '#4338ca', fontSize: 12, fontWeight: '700' }}>
        {item.emoji} {item.name}
      </Text>
    </View>
  );
}

function AssignmentCard({
  item,
}: {
  item: KangurMobileHomeAssignmentItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const priorityAccent =
    item.assignment.priority === 'high'
      ? 'rose'
      : item.assignment.priority === 'medium'
        ? 'amber'
        : 'blue';

  return (
    <View
      style={{
        backgroundColor: '#f8fafc',
        borderColor: '#e2e8f0',
        borderRadius: 20,
        borderWidth: 1,
        gap: 10,
        padding: 14,
      }}
    >
      <SummaryChip
        accent={priorityAccent}
        label={copy({
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
      />
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
        {item.assignment.title}
      </Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {item.assignment.description}
      </Text>
      <Text style={{ color: '#64748b', lineHeight: 20 }}>
        {copy({
          de: `Ziel: ${item.assignment.target}`,
          en: `Goal: ${item.assignment.target}`,
          pl: `Cel: ${item.assignment.target}`,
        })}
      </Text>
      {item.href ? (
        <OutlineLink
          href={item.href}
          hint={item.assignment.description}
          label={translateKangurMobileActionLabel(item.assignment.action.label, locale)}
        />
      ) : (
        <View
          style={{
            alignSelf: 'flex-start',
            borderRadius: 999,
            backgroundColor: '#e2e8f0',
            paddingHorizontal: 14,
            paddingVertical: 10,
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

function LessonMasteryCard({
  insight,
  title,
}: {
  insight: KangurMobileHomeLessonMasteryItem;
  title: string;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const lastLessonLabel = insight.lastCompletedAt
    ? formatHomeRelativeAge(insight.lastCompletedAt, locale)
    : copy({
        de: 'noch nicht gespeichert',
        en: 'not saved yet',
        pl: 'jeszcze nie zapisano',
      });

  return (
    <View
      style={{
        backgroundColor: '#f8fafc',
        borderColor: '#e2e8f0',
        borderRadius: 20,
        borderWidth: 1,
        gap: 10,
        padding: 14,
      }}
    >
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{title}</Text>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
        {insight.emoji} {insight.title}
      </Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: `Beherrschung ${insight.masteryPercent}% • Versuche ${insight.attempts} • letztes Ergebnis ${insight.lastScorePercent}%`,
          en: `Mastery ${insight.masteryPercent}% • Attempts ${insight.attempts} • last score ${insight.lastScorePercent}%`,
          pl: `Opanowanie ${insight.masteryPercent}% • Próby ${insight.attempts} • ostatni wynik ${insight.lastScorePercent}%`,
        })}
      </Text>
      <Text style={{ color: '#64748b', lineHeight: 20 }}>
        {copy({
          de: `Bestes Ergebnis ${insight.bestScorePercent}% • letzte Lektion ${lastLessonLabel}`,
          en: `Best score ${insight.bestScorePercent}% • last lesson ${lastLessonLabel}`,
          pl: `Najlepszy wynik ${insight.bestScorePercent}% • ostatnia lekcja ${lastLessonLabel}`,
        })}
      </Text>
      <View style={{ flexDirection: 'column', gap: 8 }}>
        <OutlineLink
          href={insight.lessonHref}
          hint={copy({
            de: `Öffnet die Lektion ${insight.title}.`,
            en: `Opens the ${insight.title} lesson.`,
            pl: `Otwiera lekcję ${insight.title}.`,
          })}
          label={`${copy({
            de: 'Lektion öffnen',
            en: 'Open lesson',
            pl: 'Otwórz lekcję',
          })}: ${insight.title}`}
        />
        {insight.practiceHref ? (
          <OutlineLink
            href={insight.practiceHref}
            hint={copy({
              de: `Öffnet das Training für ${insight.title}.`,
              en: `Opens practice for ${insight.title}.`,
              pl: `Otwiera trening dla ${insight.title}.`,
            })}
            label={`${copy({
              de: 'Trainieren',
              en: 'Practice',
              pl: 'Trenuj',
            })}: ${insight.title}`}
          />
        ) : null}
      </View>
    </View>
  );
}

function LessonCheckpointCard({
  item,
}: {
  item: KangurMobileHomeLessonCheckpointItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();

  return (
    <View
      style={{
        backgroundColor: '#f8fafc',
        borderColor: '#e2e8f0',
        borderRadius: 20,
        borderWidth: 1,
        gap: 10,
        padding: 14,
      }}
    >
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: `Letzter Checkpoint ${formatHomeRelativeAge(item.lastCompletedAt, locale)}`,
          en: `Last checkpoint ${formatHomeRelativeAge(item.lastCompletedAt, locale)}`,
          pl: `Ostatni checkpoint ${formatHomeRelativeAge(item.lastCompletedAt, locale)}`,
        })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
        {item.emoji} {item.title}
      </Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: `Letztes Ergebnis ${item.lastScorePercent}% • Beherrschung ${item.masteryPercent}%`,
          en: `Last score ${item.lastScorePercent}% • mastery ${item.masteryPercent}%`,
          pl: `Ostatni wynik ${item.lastScorePercent}% • opanowanie ${item.masteryPercent}%`,
        })}
      </Text>
      <Text style={{ color: '#64748b', lineHeight: 20 }}>
        {copy({
          de: `Bestes Ergebnis ${item.bestScorePercent}% • Versuche ${item.attempts}`,
          en: `Best score ${item.bestScorePercent}% • attempts ${item.attempts}`,
          pl: `Najlepszy wynik ${item.bestScorePercent}% • próby ${item.attempts}`,
        })}
      </Text>
      <View style={{ flexDirection: 'column', gap: 8 }}>
        <OutlineLink
          href={item.lessonHref}
          hint={copy({
            de: `Öffnet die zuletzt gespeicherte Lektion ${item.title}.`,
            en: `Opens the most recently saved ${item.title} lesson.`,
            pl: `Otwiera ostatnio zapisaną lekcję ${item.title}.`,
          })}
          label={`${copy({
            de: 'Zur Lektion zurück',
            en: 'Return to lesson',
            pl: 'Wróć do lekcji',
          })}: ${item.title}`}
        />
        {item.practiceHref ? (
          <OutlineLink
            href={item.practiceHref}
            hint={copy({
              de: `Öffnet ein passendes Training nach ${item.title}.`,
              en: `Opens matching practice after ${item.title}.`,
              pl: `Otwiera pasujący trening po ${item.title}.`,
            })}
            label={`${copy({
              de: 'Danach trainieren',
              en: 'Practice after',
              pl: 'Potem trenuj',
            })}: ${item.title}`}
          />
        ) : null}
      </View>
    </View>
  );
}

function formatHomeRelativeAge(
  isoString: string,
  locale: 'pl' | 'en' | 'de',
): string {
  const parsed = Date.parse(isoString);
  if (!Number.isFinite(parsed)) {
    return {
      de: 'gerade eben',
      en: 'just now',
      pl: 'przed chwilą',
    }[locale];
  }

  const seconds = Math.max(0, Math.floor((Date.now() - parsed) / 1000));
  if (seconds < 10) {
    return {
      de: 'gerade eben',
      en: 'just now',
      pl: 'przed chwilą',
    }[locale];
  }
  if (seconds < 60) {
    return {
      de: `vor ${seconds}s`,
      en: `${seconds}s ago`,
      pl: `${seconds}s temu`,
    }[locale];
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return {
      de: `vor ${minutes} Min.`,
      en: `${minutes} min ago`,
      pl: `${minutes} min temu`,
    }[locale];
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return {
      de: `vor ${hours} Std.`,
      en: `${hours} hr ago`,
      pl: `${hours} godz. temu`,
    }[locale];
  }

  const days = Math.floor(hours / 24);
  return {
    de: `vor ${days} Tg.`,
    en: `${days} days ago`,
    pl: `${days} dni temu`,
  }[locale];
}

export default function HomeScreen(): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const params = useLocalSearchParams<{
    debugProofOperation?: string | string[];
  }>();
  const router = useRouter();
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [duelInviteShareError, setDuelInviteShareError] = useState<string | null>(null);
  const [sharingDuelSessionId, setSharingDuelSessionId] = useState<string | null>(null);
  const { apiBaseUrl, apiBaseUrlSource } = useKangurMobileRuntime();
  const {
    authError,
    authMode,
    developerAutoSignInEnabled,
    hasAttemptedDeveloperAutoSignIn,
    isLoadingAuth,
    session,
    signIn,
    signInWithLearnerCredentials,
    signOut,
    supportsLearnerCredentials,
  } = useKangurMobileAuth();
  const recentResults = useKangurMobileRecentResults();
  const duelInvites = useKangurMobileHomeDuelsInvites();
  const duelLeaderboard = useKangurMobileHomeDuelsLeaderboard();
  const homeAssignments = useKangurMobileHomeAssignments();
  const lessonCheckpoints = useKangurMobileHomeLessonCheckpoints();
  const lessonMastery = useKangurMobileHomeLessonMastery();
  const homeBadges = useKangurMobileHomeBadges();
  const duelPresence = useKangurMobileHomeDuelsPresence();
  const duelRematches = useKangurMobileHomeDuelsRematches();
  const duelSpotlight = useKangurMobileHomeDuelsSpotlight();
  const trainingFocus = useKangurMobileTrainingFocus();
  const isPreparingHomeView = useHomeScreenBootState('home');
  const authBoundary = getKangurHomeAuthBoundaryViewModel({
    authError,
    developerAutoSignInEnabled,
    hasAttemptedDeveloperAutoSignIn,
    isLoadingAuth,
    locale,
    session,
    supportsLearnerCredentials,
  });
  const debugProofOperation = __DEV__
    ? resolveKangurHomeDebugProofOperation(params.debugProofOperation)
    : null;
  const homeDebugProof = buildKangurHomeDebugProofViewModel({
    isEnabled: recentResults.isEnabled && trainingFocus.isEnabled,
    isLoading: recentResults.isLoading || trainingFocus.isLoading,
    locale,
    operation: debugProofOperation,
    recentResults: recentResults.results,
    strongestOperation: trainingFocus.strongestOperation,
    weakestOperation: trainingFocus.weakestOperation,
  });
  const duelSharerDisplayName =
    session.user?.activeLearner?.displayName?.trim() ||
    session.user?.full_name?.trim() ||
    copy({
      de: 'dem Kangur-Lernkonto',
      en: 'the Kangur learner account',
      pl: 'konta ucznia Kangura',
    });
  const homeHeroLearnerName =
    session.user?.activeLearner?.displayName?.trim() || session.user?.full_name?.trim() || null;
  const homeHeroRecentResult = recentResults.results[0] ?? null;
  const homeHeroRecentCheckpoint = lessonCheckpoints.recentCheckpoints[0] ?? null;
  const homeHeroFocusHref = trainingFocus.weakestOperation
    ? createKangurPracticeHref(trainingFocus.weakestOperation.operation)
    : PRACTICE_ROUTE;
  const homeHeroFocusLabel = trainingFocus.weakestOperation
    ? formatKangurMobileScoreOperation(trainingFocus.weakestOperation.operation, locale)
    : copy({
        de: 'Gemischtes Training',
        en: 'Mixed practice',
        pl: 'Trening mieszany',
      });
  const activeDuelLearnerId = session.user?.activeLearner?.id ?? session.user?.id ?? null;
  const currentLearnerDuelRank = activeDuelLearnerId
    ? duelLeaderboard.entries.findIndex((entry) => entry.learnerId === activeDuelLearnerId)
    : -1;
  const currentLearnerDuelEntry =
    currentLearnerDuelRank >= 0 ? duelLeaderboard.entries[currentLearnerDuelRank] : null;
  const openDuelSession = (sessionId: string): void => {
    router.replace(createKangurDuelsHref({ sessionId }));
  };
  const handleShareOutgoingChallenge = async (sessionId: string): Promise<void> => {
    setDuelInviteShareError(null);
    setSharingDuelSessionId(sessionId);

    try {
      await shareKangurDuelInvite({
        sessionId,
        sharerDisplayName: duelSharerDisplayName,
      });
    } catch (error) {
      setDuelInviteShareError(
        error instanceof Error && error.message.trim()
          ? error.message
          : copy({
              de: 'Der Einladungslink konnte nicht geteilt werden.',
              en: 'Could not share the invite link.',
              pl: 'Nie udało się udostępnić linku do zaproszenia.',
            }),
      );
    } finally {
      setSharingDuelSessionId(null);
    }
  };

  if (isPreparingHomeView) {
    return <HomeLoadingShell />;
  }

  return (
    <SafeAreaView style={{ backgroundColor: '#fffaf2', flex: 1 }}>
      <ScrollView
        keyboardShouldPersistTaps='handled'
        contentContainerStyle={{
          gap: 16,
          paddingHorizontal: 24,
          paddingVertical: 28,
        }}
      >
        <View style={{ gap: 10 }}>
          <Text
            accessibilityRole='header'
            style={{ color: '#0f172a', fontSize: 32, fontWeight: '800' }}
          >
            {copy({
              de: 'Kangur mobil',
              en: 'Kangur mobile',
              pl: 'Kangur mobilnie',
            })}
          </Text>
          <Text style={{ color: '#475569', fontSize: 16, lineHeight: 24 }}>
            {isLoadingAuth && session.status !== 'authenticated'
              ? copy({
                  de: 'Wir stellen gerade die Anmeldung, letzte Ergebnisse und Trainingshinweise wieder her.',
                  en: 'We are restoring sign-in, recent results, and training cues.',
                  pl: 'Przywracamy teraz logowanie, ostatnie wyniki i wskazówki treningowe.',
                })
              : session.status === 'authenticated' && homeHeroLearnerName
                ? copy({
                    de: `Willkommen, ${homeHeroLearnerName}. Starte mit dem Trainingsfokus, kehre zur letzten Lektion zurück oder öffne direkt den Tagesplan.`,
                    en: `Welcome back, ${homeHeroLearnerName}. Start with the training focus, return to the latest lesson, or jump straight into the daily plan.`,
                    pl: `Witaj ponownie, ${homeHeroLearnerName}. Zacznij od fokusu treningowego, wróć do ostatniej lekcji albo od razu otwórz plan dnia.`,
                  })
                : copy({
                    de: 'Von hier aus kannst du Lektionen, Training, Ergebnisse und Duelle durchsuchen. Nach der Anmeldung siehst du hier auch Ergebnisse und den Tagesplan.',
                    en: 'From here you can browse lessons, practice, results, and duels. After sign-in, you will also see results and the daily plan here.',
                    pl: 'Stąd możesz przeglądać lekcje, trening, wyniki i pojedynki. Po zalogowaniu zobaczysz tu też wyniki oraz plan dnia.',
                  })}
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <View
              style={{
                alignSelf: 'flex-start',
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
                  de: `Ergebnisse ${recentResults.results.length}`,
                  en: `Results ${recentResults.results.length}`,
                  pl: `Wyniki ${recentResults.results.length}`,
                })}
              </Text>
            </View>
            {homeHeroRecentResult ? (
              <View
                style={{
                  alignSelf: 'flex-start',
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
                    de: `Letztes Ergebnis ${homeHeroRecentResult.correct_answers}/${homeHeroRecentResult.total_questions}`,
                    en: `Latest score ${homeHeroRecentResult.correct_answers}/${homeHeroRecentResult.total_questions}`,
                    pl: `Ostatni wynik ${homeHeroRecentResult.correct_answers}/${homeHeroRecentResult.total_questions}`,
                  })}
                </Text>
              </View>
            ) : null}
            <View
              style={{
                alignSelf: 'flex-start',
                borderRadius: 999,
                borderWidth: 1,
                borderColor: '#fde68a',
                backgroundColor: '#fffbeb',
                paddingHorizontal: 12,
                paddingVertical: 7,
              }}
            >
              <Text style={{ color: '#b45309', fontSize: 12, fontWeight: '700' }}>
                {homeHeroRecentCheckpoint
                  ? copy({
                      de: `Letzte Lektion ${homeHeroRecentCheckpoint.title}`,
                      en: `Latest lesson ${homeHeroRecentCheckpoint.title}`,
                      pl: `Ostatnia lekcja ${homeHeroRecentCheckpoint.title}`,
                    })
                  : copy({
                      de: `Checkpoints ${lessonCheckpoints.recentCheckpoints.length}`,
                      en: `Checkpoints ${lessonCheckpoints.recentCheckpoints.length}`,
                      pl: `Checkpointy ${lessonCheckpoints.recentCheckpoints.length}`,
                    })}
              </Text>
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <OutlineLink
              href={homeHeroFocusHref}
              label={copy({
                de: `Trainingsfokus: ${homeHeroFocusLabel}`,
                en: `Training focus: ${homeHeroFocusLabel}`,
                pl: `Fokus treningowy: ${homeHeroFocusLabel}`,
              })}
            />
            {homeHeroRecentCheckpoint ? (
              <OutlineLink
                href={homeHeroRecentCheckpoint.lessonHref}
                label={copy({
                  de: `Letzte Lektion: ${homeHeroRecentCheckpoint.title}`,
                  en: `Latest lesson: ${homeHeroRecentCheckpoint.title}`,
                  pl: `Ostatnia lekcja: ${homeHeroRecentCheckpoint.title}`,
                })}
              />
            ) : null}
            <OutlineLink
              href={PLAN_ROUTE}
              label={copy({
                de: 'Tagesplan jetzt',
                en: 'Daily plan now',
                pl: 'Plan dnia teraz',
              })}
            />
          </View>
        </View>

        {__DEV__ && homeDebugProof ? (
          <SectionCard
            title={copy({
              de: 'Entwickler-Prüfung für Startdaten',
              en: 'Developer home checks',
              pl: 'Deweloperskie sprawdzenie danych startu',
            })}
          >
            <Text style={{ color: '#0f172a', fontWeight: '700' }}>
              {copy({
                de: 'Modus',
                en: 'Mode',
                pl: 'Tryb',
              })}
              : {homeDebugProof.operationLabel}
            </Text>
            <View style={{ gap: 10 }}>
              {homeDebugProof.checks.map((check) => (
                <View
                  key={check.label}
                  style={{
                    backgroundColor:
                      check.status === 'ready'
                        ? '#ecfdf5'
                        : check.status === 'info'
                          ? '#eff6ff'
                          : '#fff7ed',
                    borderColor:
                      check.status === 'ready'
                        ? '#a7f3d0'
                        : check.status === 'info'
                          ? '#bfdbfe'
                          : '#fed7aa',
                    borderRadius: 18,
                    borderWidth: 1,
                    gap: 4,
                    padding: 12,
                  }}
                >
                  <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                    {check.label}:{' '}
                    {check.status === 'ready'
                      ? copy({
                          de: 'bereit',
                          en: 'ready',
                          pl: 'gotowe',
                        })
                      : check.status === 'info'
                        ? copy({
                            de: 'läuft',
                            en: 'in progress',
                            pl: 'w toku',
                          })
                        : copy({
                            de: 'fehlt',
                            en: 'missing',
                            pl: 'brak',
                          })}
                  </Text>
                  <Text style={{ color: '#475569', lineHeight: 20 }}>
                    {check.detail}
                  </Text>
                </View>
              ))}
            </View>
          </SectionCard>
        ) : null}

        <SectionCard
          title={copy({
            de: 'Konto und Verbindung',
            en: 'Account and connection',
            pl: 'Konto i połączenie',
          })}
        >
          <Text accessibilityLiveRegion='polite' style={{ color: '#0f172a' }}>
            {copy({
              de: 'Status',
              en: 'Status',
              pl: 'Status',
            })}
            : {authBoundary.statusLabel}
          </Text>
          <Text style={{ color: '#475569' }}>
            {copy({
              de: 'Nutzer',
              en: 'User',
              pl: 'Użytkownik',
            })}
            : {authBoundary.userLabel}
          </Text>
          <Text style={{ color: '#475569' }}>
            {copy({
              de: 'Anmeldemodus',
              en: 'Sign-in mode',
              pl: 'Tryb logowania',
            })}
            : {authMode}
          </Text>
          <Text style={{ color: '#475569' }}>
            API: {apiBaseUrl} ({apiBaseUrlSource})
          </Text>
          {authError ? (
            <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{authError}</Text>
          ) : null}

          {authBoundary.showLearnerCredentialsForm ? (
            <View style={{ gap: 10 }}>
              <LabeledTextField
                autoCapitalize='none'
                hint={copy({
                  de: 'Gib den Schüler-Login ein.',
                  en: 'Enter the learner login.',
                  pl: 'Wpisz login ucznia.',
                })}
                label={copy({
                  de: 'Schuler-Login',
                  en: 'Learner login',
                  pl: 'Login ucznia',
                })}
                onChangeText={setLoginName}
                placeholder={copy({
                  de: 'Schuler-Login',
                  en: 'Learner login',
                  pl: 'Login ucznia',
                })}
                textContentType='username'
                value={loginName}
              />
              <LabeledTextField
                autoCapitalize='none'
                hint={copy({
                  de: 'Gib das Schülerpasswort ein.',
                  en: 'Enter the learner password.',
                  pl: 'Wpisz hasło ucznia.',
                })}
                label={copy({
                  de: 'Passwort',
                  en: 'Password',
                  pl: 'Hasło',
                })}
                onChangeText={setPassword}
                placeholder={copy({
                  de: 'Passwort',
                  en: 'Password',
                  pl: 'Hasło',
                })}
                secureTextEntry
                textContentType='password'
                value={password}
              />
              <PrimaryButton
                hint={copy({
                  de: 'Meldet mit den eingegebenen Daten an.',
                  en: 'Signs in with the entered credentials.',
                  pl: 'Loguje przy użyciu wpisanych danych.',
                })}
                label={copy({
                  de: 'Anmelden',
                  en: 'Sign in',
                  pl: 'Zaloguj',
                })}
                onPress={async () => {
                  await signInWithLearnerCredentials(loginName, password);
                }}
              />
            </View>
          ) : session.status === 'authenticated' ? (
            <PrimaryButton
              hint={copy({
                de: 'Meldet das aktuelle Konto ab.',
                en: 'Signs out the current account.',
                pl: 'Wylogowuje bieżące konto.',
              })}
              label={copy({
                de: 'Abmelden',
                en: 'Sign out',
                pl: 'Wyloguj',
              })}
              onPress={signOut}
            />
          ) : (
            <PrimaryButton
              hint={copy({
                de: 'Startet die Demo.',
                en: 'Starts the demo.',
                pl: 'Uruchamia demo.',
              })}
              label={copy({
                de: 'Demo starten',
                en: 'Start demo',
                pl: 'Uruchom demo',
              })}
              onPress={signIn}
            />
          )}
        </SectionCard>

        <SectionCard
          title={copy({
            de: 'Navigation',
            en: 'Navigation',
            pl: 'Nawigacja',
          })}
        >
          <View style={{ flexDirection: 'column', gap: 8 }}>
            <OutlineLink
              href={LESSONS_ROUTE}
              hint={copy({
                de: 'Öffnet die Lektionen.',
                en: 'Opens lessons.',
                pl: 'Otwiera lekcje.',
              })}
              label={copy({
                de: 'Lektionen',
                en: 'Lessons',
                pl: 'Lekcje',
              })}
            />
            <OutlineLink
              href={PRACTICE_ROUTE}
              hint={copy({
                de: 'Öffnet das Training.',
                en: 'Opens practice.',
                pl: 'Otwiera trening.',
              })}
              label={copy({
                de: 'Training',
                en: 'Practice',
                pl: 'Trening',
              })}
            />
            <OutlineLink
              href={PLAN_ROUTE}
              hint={copy({
                de: 'Öffnet den Tagesplan des Schulers.',
                en: 'Opens the learner daily plan.',
                pl: 'Otwiera plan dnia ucznia.',
              })}
              label={copy({
                de: 'Tagesplan',
                en: 'Daily plan',
                pl: 'Plan dnia',
              })}
            />
            <OutlineLink
              href={RESULTS_ROUTE}
              hint={copy({
                de: 'Öffnet Ergebnisse und den vollständigen Verlauf.',
                en: 'Opens results and full history.',
                pl: 'Otwiera wyniki i pełną historię.',
              })}
              label={copy({
                de: 'Ergebnisse',
                en: 'Results',
                pl: 'Wyniki',
              })}
            />
            <OutlineLink
              href={PROFILE_ROUTE}
              hint={copy({
                de: 'Öffnet das Profil des Schulers.',
                en: 'Opens the learner profile.',
                pl: 'Otwiera profil ucznia.',
              })}
              label={copy({
                de: 'Profil',
                en: 'Profile',
                pl: 'Profil',
              })}
            />
            <OutlineLink
              href={LEADERBOARD_ROUTE}
              hint={copy({
                de: 'Öffnet die Rangliste der Schuler.',
                en: 'Opens the learner leaderboard.',
                pl: 'Otwiera ranking uczniów.',
              })}
              label={copy({
                de: 'Rangliste',
                en: 'Leaderboard',
                pl: 'Ranking',
              })}
            />
            <OutlineLink
              href={DUELS_ROUTE}
              hint={copy({
                de: 'Öffnet die Duell-Lobby.',
                en: 'Opens the duels lobby.',
                pl: 'Otwiera lobby pojedynków.',
              })}
              label={copy({
                de: 'Duelle',
                en: 'Duels',
                pl: 'Pojedynki',
              })}
            />
          </View>
        </SectionCard>

        <SectionCard
          title={copy({
            de: 'Duelleinladungen',
            en: 'Duel invites',
            pl: 'Zaproszenia do pojedynków',
          })}
        >
          {!duelInvites.isAuthenticated ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#475569', lineHeight: 20 }}>
                {copy({
                  de: 'Nach der Anmeldung siehst du hier private Duelleinladungen von anderen Schulern.',
                  en: 'After signing in, you will see private duel invites from other learners here.',
                  pl: 'Po zalogowaniu zobaczysz tutaj prywatne zaproszenia do pojedynków od innych uczniów.',
                })}
              </Text>
              <OutlineLink
                href={DUELS_ROUTE}
                hint={copy({
                  de: 'Öffnet die Duell-Lobby.',
                  en: 'Opens the duels lobby.',
                  pl: 'Otwiera lobby pojedynków.',
                })}
                label={copy({
                  de: 'Duell-Lobby öffnen',
                  en: 'Open duels lobby',
                  pl: 'Otwórz lobby pojedynków',
                })}
              />
            </View>
          ) : duelInvites.isRestoringAuth || duelInvites.isLoading ? (
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              {copy({
                de: 'Private Duelleinladungen werden geladen.',
                en: 'Loading private duel invites.',
                pl: 'Pobieramy prywatne zaproszenia do pojedynków.',
              })}
            </Text>
          ) : duelInvites.error ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
                {duelInvites.error}
              </Text>
              <PrimaryButton
                hint={copy({
                  de: 'Aktualisiert die privaten Duelleinladungen.',
                  en: 'Refreshes the private duel invites.',
                  pl: 'Odświeża prywatne zaproszenia do pojedynków.',
                })}
                label={copy({
                  de: 'Einladungen aktualisieren',
                  en: 'Refresh invites',
                  pl: 'Odśwież zaproszenia',
                })}
                onPress={duelInvites.refresh}
              />
            </View>
          ) : duelInvites.invites.length === 0 ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#475569', lineHeight: 20 }}>
                {copy({
                  de: 'Keine offenen Einladungen. Du kannst die Lobby öffnen und eine neue Herausforderung senden.',
                  en: 'There are no pending invites yet. You can open the lobby and send a new challenge.',
                  pl: 'Brak oczekujących zaproszeń. Możesz otworzyć lobby i wysłać nowe wyzwanie.',
                })}
              </Text>
              <OutlineLink
                href={DUELS_ROUTE}
                hint={copy({
                  de: 'Öffnet die Duell-Lobby.',
                  en: 'Opens the duels lobby.',
                  pl: 'Otwiera lobby pojedynków.',
                })}
                label={copy({
                  de: 'Duell-Lobby öffnen',
                  en: 'Open duels lobby',
                  pl: 'Otwórz lobby pojedynków',
                })}
              />
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {duelInvites.invites.map((invite) => (
                <View
                  key={invite.sessionId}
                  style={{
                    backgroundColor: '#f8fafc',
                    borderColor: '#e2e8f0',
                    borderRadius: 20,
                    borderWidth: 1,
                    gap: 8,
                    padding: 14,
                  }}
                >
                  <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
                    {invite.host.displayName}
                  </Text>
                  <Text style={{ color: '#475569', lineHeight: 20 }}>
                    {getHomeDuelModeLabel(invite.mode, locale)} •{' '}
                    {formatKangurMobileScoreOperation(invite.operation, locale)} •{' '}
                    {copy({
                      de: 'Stufe',
                      en: 'level',
                      pl: 'poziom',
                    })}{' '}
                    {getHomeDuelDifficultyLabel(invite.difficulty, locale)}
                  </Text>
                  <Text style={{ color: '#64748b' }}>
                    {copy({
                      de: `${invite.questionCount} Fragen • ${invite.timePerQuestionSec}s pro Frage • aktualisiert ${formatHomeRelativeAge(invite.updatedAt, locale)}`,
                      en: `${invite.questionCount} questions • ${invite.timePerQuestionSec}s per question • updated ${formatHomeRelativeAge(invite.updatedAt, locale)}`,
                      pl: `${invite.questionCount} pytań • ${invite.timePerQuestionSec}s na pytanie • aktualizacja ${formatHomeRelativeAge(invite.updatedAt, locale)}`,
                    })}
                  </Text>
                  {invite.series ? (
                    <Text style={{ color: '#4338ca', lineHeight: 20 }}>
                      {getHomeDuelSeriesLabel(invite.series, locale)}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: 'column', gap: 8 }}>
                    <OutlineLink
                      href={createKangurDuelsHref({ joinSessionId: invite.sessionId })}
                      hint={copy({
                        de: `Nimmt die Einladung von ${invite.host.displayName} an.`,
                        en: `Accepts the invite from ${invite.host.displayName}.`,
                        pl: `Przyjmuje zaproszenie od ${invite.host.displayName}.`,
                      })}
                      label={`${copy({
                        de: 'Beitreten',
                        en: 'Join',
                        pl: 'Dołącz',
                      })}: ${invite.host.displayName}`}
                    />
                    <OutlineLink
                      href={DUELS_ROUTE}
                      hint={copy({
                        de: 'Öffnet die Duell-Lobby.',
                        en: 'Opens the duels lobby.',
                        pl: 'Otwiera lobby pojedynków.',
                      })}
                      label={copy({
                        de: 'Lobby öffnen',
                        en: 'Open lobby',
                        pl: 'Otwórz lobby',
                      })}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </SectionCard>

        <SectionCard
          title={copy({
            de: 'Gesendete Herausforderungen',
            en: 'Sent challenges',
            pl: 'Wysłane wyzwania',
          })}
        >
          {!duelInvites.isAuthenticated ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#475569', lineHeight: 20 }}>
                {copy({
                  de: 'Nach der Anmeldung erscheinen hier deine privaten Herausforderungen zusammen mit einem direkten Link zum erneuten Teilen.',
                  en: 'After signing in, your private challenges will appear here together with a direct invite-share action.',
                  pl: 'Po zalogowaniu pojawią się tutaj Twoje prywatne wyzwania razem z akcją ponownego udostępnienia zaproszenia.',
                })}
              </Text>
              <OutlineLink
                href={DUELS_ROUTE}
                hint={copy({
                  de: 'Öffnet die Duell-Lobby.',
                  en: 'Opens the duels lobby.',
                  pl: 'Otwiera lobby pojedynków.',
                })}
                label={copy({
                  de: 'Duell-Lobby öffnen',
                  en: 'Open duels lobby',
                  pl: 'Otwórz lobby pojedynków',
                })}
              />
            </View>
          ) : duelInvites.isRestoringAuth || duelInvites.isLoading ? (
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              {copy({
                de: 'Gesendete private Herausforderungen werden geladen.',
                en: 'Loading sent private challenges.',
                pl: 'Pobieramy wysłane prywatne wyzwania.',
              })}
            </Text>
          ) : duelInvites.error ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
                {duelInvites.error}
              </Text>
              <PrimaryButton
                hint={copy({
                  de: 'Aktualisiert die privaten Herausforderungen.',
                  en: 'Refreshes the private challenges.',
                  pl: 'Odświeża prywatne wyzwania.',
                })}
                label={copy({
                  de: 'Herausforderungen aktualisieren',
                  en: 'Refresh challenges',
                  pl: 'Odśwież wyzwania',
                })}
                onPress={duelInvites.refresh}
              />
            </View>
          ) : duelInvites.outgoingChallenges.length === 0 ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#475569', lineHeight: 20 }}>
                {copy({
                  de: 'Du hast noch keine privaten Herausforderungen gesendet. Öffne die Lobby, um direkt einen Rivalen einzuladen.',
                  en: 'You have not sent any private challenges yet. Open the lobby to invite a rival directly.',
                  pl: 'Nie wysłano jeszcze prywatnych wyzwań. Otwórz lobby, aby od razu zaprosić rywala.',
                })}
              </Text>
              <OutlineLink
                href={DUELS_ROUTE}
                hint={copy({
                  de: 'Öffnet die Duell-Lobby.',
                  en: 'Opens the duels lobby.',
                  pl: 'Otwiera lobby pojedynków.',
                })}
                label={copy({
                  de: 'Duell-Lobby öffnen',
                  en: 'Open duels lobby',
                  pl: 'Otwórz lobby pojedynków',
                })}
              />
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {duelInviteShareError ? (
                <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
                  {duelInviteShareError}
                </Text>
              ) : null}
              {duelInvites.outgoingChallenges.map((entry) => (
                <View
                  key={entry.sessionId}
                  style={{
                    backgroundColor: '#f8fafc',
                    borderColor: '#e2e8f0',
                    borderRadius: 20,
                    borderWidth: 1,
                    gap: 8,
                    padding: 14,
                  }}
                >
                  <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
                    {copy({
                      de: 'Private Herausforderung',
                      en: 'Private challenge',
                      pl: 'Prywatne wyzwanie',
                    })}
                  </Text>
                  <Text style={{ color: '#475569', lineHeight: 20 }}>
                    {getHomeDuelModeLabel(entry.mode, locale)} •{' '}
                    {formatKangurMobileScoreOperation(entry.operation, locale)} •{' '}
                    {copy({
                      de: 'Stufe',
                      en: 'level',
                      pl: 'poziom',
                    })}{' '}
                    {getHomeDuelDifficultyLabel(entry.difficulty, locale)}
                  </Text>
                  <Text style={{ color: '#64748b' }}>
                    {copy({
                      de: `${entry.questionCount} Fragen • ${entry.timePerQuestionSec}s pro Frage • aktualisiert ${formatHomeRelativeAge(entry.updatedAt, locale)}`,
                      en: `${entry.questionCount} questions • ${entry.timePerQuestionSec}s per question • updated ${formatHomeRelativeAge(entry.updatedAt, locale)}`,
                      pl: `${entry.questionCount} pytań • ${entry.timePerQuestionSec}s na pytanie • aktualizacja ${formatHomeRelativeAge(entry.updatedAt, locale)}`,
                    })}
                  </Text>
                  {entry.series ? (
                    <Text style={{ color: '#4338ca', lineHeight: 20 }}>
                      {getHomeDuelSeriesLabel(entry.series, locale)}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: 'column', gap: 8 }}>
                    <PrimaryButton
                      disabled={sharingDuelSessionId === entry.sessionId}
                      hint={copy({
                        de: 'Teilt den direkten Einladungslink erneut.',
                        en: 'Reshares the direct invite link.',
                        pl: 'Udostępnia ponownie bezpośredni link do zaproszenia.',
                      })}
                      label={
                        sharingDuelSessionId === entry.sessionId
                          ? copy({
                              de: 'Link wird geteilt...',
                              en: 'Sharing link...',
                              pl: 'Udostępnianie linku...',
                            })
                          : copy({
                              de: 'Link teilen',
                              en: 'Share link',
                              pl: 'Udostępnij link',
                            })
                      }
                      onPress={async () => {
                        await handleShareOutgoingChallenge(entry.sessionId);
                      }}
                    />
                    <OutlineLink
                      href={createKangurDuelsHref({ sessionId: entry.sessionId })}
                      hint={copy({
                        de: 'Öffnet die private Duellsitzung.',
                        en: 'Opens the private duel session.',
                        pl: 'Otwiera prywatną sesję pojedynku.',
                      })}
                      label={copy({
                        de: 'Duell öffnen',
                        en: 'Open duel',
                        pl: 'Otwórz pojedynek',
                      })}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </SectionCard>

        <SectionCard
          title={copy({
            de: 'Aktive Rivalen in der Lobby',
            en: 'Active rivals in the lobby',
            pl: 'Aktywni rywale w lobby',
          })}
        >
          {!duelPresence.isAuthenticated ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#475569', lineHeight: 20 }}>
                {copy({
                  de: 'Nach der Anmeldung erscheinen hier aktive Rivalen aus der Duell-Lobby zusammen mit einer direkten privaten Herausforderungsaktion.',
                  en: 'After signing in, this section shows active rivals from the duels lobby together with a direct private challenge action.',
                  pl: 'Po zalogowaniu zobaczysz tutaj aktywnych rywali z lobby pojedynków razem z bezpośrednią akcją prywatnego wyzwania.',
                })}
              </Text>
              <OutlineLink
                href={DUELS_ROUTE}
                hint={copy({
                  de: 'Öffnet die Duell-Lobby.',
                  en: 'Opens the duels lobby.',
                  pl: 'Otwiera lobby pojedynków.',
                })}
                label={copy({
                  de: 'Duell-Lobby öffnen',
                  en: 'Open duels lobby',
                  pl: 'Otwórz lobby pojedynków',
                })}
              />
            </View>
          ) : duelPresence.isRestoringAuth || duelPresence.isLoading ? (
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              {copy({
                de: 'Aktive Rivalen in der Lobby werden geladen.',
                en: 'Loading active rivals in the lobby.',
                pl: 'Pobieramy aktywnych rywali w lobby.',
              })}
            </Text>
          ) : duelPresence.error ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
                {duelPresence.error}
              </Text>
              <PrimaryButton
                hint={copy({
                  de: 'Aktualisiert die aktiven Rivalen in der Lobby.',
                  en: 'Refreshes the active rivals in the lobby.',
                  pl: 'Odświeża aktywnych rywali w lobby.',
                })}
                label={copy({
                  de: 'Rivalen aktualisieren',
                  en: 'Refresh rivals',
                  pl: 'Odśwież rywali',
                })}
                onPress={duelPresence.refresh}
              />
            </View>
          ) : duelPresence.entries.length === 0 ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#475569', lineHeight: 20 }}>
                {copy({
                  de: 'Gerade ist niemand in der Duell-Lobby aktiv. Öffne die Lobby, um auf den nächsten Rivalen zu warten.',
                  en: 'Nobody is active in the duels lobby right now. Open the lobby to wait for the next rival.',
                  pl: 'Teraz nikt nie jest aktywny w lobby pojedynków. Otwórz lobby, aby poczekać na kolejnego rywala.',
                })}
              </Text>
              <OutlineLink
                href={DUELS_ROUTE}
                hint={copy({
                  de: 'Öffnet die Duell-Lobby.',
                  en: 'Opens the duels lobby.',
                  pl: 'Otwiera lobby pojedynków.',
                })}
                label={copy({
                  de: 'Duell-Lobby öffnen',
                  en: 'Open duels lobby',
                  pl: 'Otwórz lobby pojedynków',
                })}
              />
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <Text style={{ color: '#475569', lineHeight: 20 }}>
                {duelPresence.entries.some((entry) => entry.learnerId === activeDuelLearnerId)
                  ? copy({
                      de: 'Dein Konto ist derzeit in der Lobby sichtbar. Du kannst jetzt direkt einen aktiven Rivalen privat herausfordern.',
                      en: 'Your account is currently visible in the lobby. You can directly challenge an active rival right now.',
                      pl: 'Twoje konto jest teraz widoczne w lobby. Możesz od razu wysłać prywatne wyzwanie aktywnemu rywalowi.',
                    })
                  : copy({
                      de: 'Das sind aktive Rivalen aus der Duell-Lobby. Öffne die Duell-Lobby, damit andere auch dich in dieser Liste sehen.',
                      en: 'These are active rivals from the duels lobby. Open the duels lobby so others can also see you in this list.',
                      pl: 'To aktywni rywale z lobby pojedynków. Otwórz lobby pojedynków, aby inni zobaczyli tu również Ciebie.',
                    })}
              </Text>
              {duelPresence.actionError ? (
                <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
                  {duelPresence.actionError}
                </Text>
              ) : null}
              {duelPresence.entries.map((entry) => {
                const isCurrentLearner = entry.learnerId === activeDuelLearnerId;

                return (
                  <View
                    key={entry.learnerId}
                    style={{
                      backgroundColor: isCurrentLearner ? '#eff6ff' : '#f8fafc',
                      borderColor: isCurrentLearner ? '#bfdbfe' : '#e2e8f0',
                      borderRadius: 20,
                      borderWidth: 1,
                      gap: 8,
                      padding: 14,
                    }}
                  >
                    <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
                      {entry.displayName}
                      {isCurrentLearner
                        ? copy({
                            de: ' · Du',
                            en: ' · You',
                            pl: ' · Ty',
                          })
                        : ''}
                    </Text>
                    <Text style={{ color: '#64748b' }}>
                      {copy({
                        de: `Zuletzt aktiv ${formatHomeRelativeAge(entry.lastSeenAt, locale)}`,
                        en: `Last active ${formatHomeRelativeAge(entry.lastSeenAt, locale)}`,
                        pl: `Ostatnia aktywność ${formatHomeRelativeAge(entry.lastSeenAt, locale)}`,
                      })}
                    </Text>
                    {!isCurrentLearner ? (
                      <PrimaryButton
                        disabled={duelPresence.isActionPending}
                        hint={copy({
                          de: `Sendet sofort eine private Herausforderung an ${entry.displayName}.`,
                          en: `Sends an immediate private challenge to ${entry.displayName}.`,
                          pl: `Od razu wysyła prywatne wyzwanie do ${entry.displayName}.`,
                        })}
                        label={
                          duelPresence.pendingLearnerId === entry.learnerId
                            ? copy({
                                de: 'Herausforderung wird gesendet...',
                                en: 'Sending challenge...',
                                pl: 'Wysyłanie wyzwania...',
                              })
                            : `${copy({
                                de: 'Herausfordern',
                                en: 'Challenge',
                                pl: 'Wyzwij',
                              })}: ${entry.displayName}`
                        }
                        onPress={async () => {
                          const nextSessionId = await duelPresence.createPrivateChallenge(
                            entry.learnerId,
                          );
                          if (nextSessionId) {
                            openDuelSession(nextSessionId);
                          }
                        }}
                      />
                    ) : null}
                  </View>
                );
              })}
              <OutlineLink
                href={DUELS_ROUTE}
                hint={copy({
                  de: 'Öffnet die vollständige Duell-Lobby.',
                  en: 'Opens the full duels lobby.',
                  pl: 'Otwiera pełne lobby pojedynków.',
                })}
                label={copy({
                  de: 'Lobby öffnen',
                  en: 'Open lobby',
                  pl: 'Otwórz lobby',
                })}
              />
            </View>
          )}
        </SectionCard>

        <SectionCard
          title={copy({
            de: 'Live-Duelle',
            en: 'Live duels',
            pl: 'Na żywo w pojedynkach',
          })}
        >
          {duelSpotlight.isLoading ? (
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              {copy({
                de: 'Offene öffentliche Duelle werden geladen.',
                en: 'Loading public duels from the lobby.',
                pl: 'Pobieramy publiczne pojedynki z lobby.',
              })}
            </Text>
          ) : duelSpotlight.error ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
                {duelSpotlight.error}
              </Text>
              <PrimaryButton
                hint={copy({
                  de: 'Aktualisiert die öffentlichen Duelle aus der Lobby.',
                  en: 'Refreshes the public duels from the lobby.',
                  pl: 'Odświeża publiczne pojedynki z lobby.',
                })}
                label={copy({
                  de: 'Live-Duelle aktualisieren',
                  en: 'Refresh live duels',
                  pl: 'Odśwież pojedynki',
                })}
                onPress={duelSpotlight.refresh}
              />
            </View>
          ) : duelSpotlight.entries.length === 0 ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#475569', lineHeight: 20 }}>
                {copy({
                  de: 'Gerade sind keine öffentlichen Duelle aktiv. Öffne die Lobby, um ein neues Match zu starten oder auf den nächsten Gegner zu warten.',
                  en: 'There are no active public duels right now. Open the lobby to start a new match or wait for the next opponent.',
                  pl: 'Teraz nie ma aktywnych publicznych pojedynków. Otwórz lobby, aby wystartować z nowym meczem albo poczekać na kolejnego rywala.',
                })}
              </Text>
              <OutlineLink
                href={DUELS_ROUTE}
                hint={copy({
                  de: 'Öffnet die Duell-Lobby.',
                  en: 'Opens the duels lobby.',
                  pl: 'Otwiera lobby pojedynków.',
                })}
                label={copy({
                  de: 'Duell-Lobby öffnen',
                  en: 'Open duels lobby',
                  pl: 'Otwórz lobby pojedynków',
                })}
              />
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {duelSpotlight.entries.map((entry) => {
                const isLiveEntry = entry.status === 'in_progress';
                const primaryHref = isLiveEntry
                  ? createKangurDuelsHref({
                      sessionId: entry.sessionId,
                      spectate: true,
                    })
                  : session.status === 'authenticated'
                    ? createKangurDuelsHref({
                        joinSessionId: entry.sessionId,
                      })
                    : DUELS_ROUTE;
                const primaryHint = isLiveEntry
                  ? copy({
                      de: `Öffnet das Live-Duell von ${entry.host.displayName}.`,
                      en: `Opens the live duel hosted by ${entry.host.displayName}.`,
                      pl: `Otwiera pojedynek na żywo gospodarza ${entry.host.displayName}.`,
                    })
                  : session.status === 'authenticated'
                    ? copy({
                        de: `Tritt dem öffentlichen Duell von ${entry.host.displayName} bei.`,
                        en: `Joins the public duel hosted by ${entry.host.displayName}.`,
                        pl: `Dołącza do publicznego pojedynku gospodarza ${entry.host.displayName}.`,
                      })
                    : copy({
                        de: 'Öffnet die Duell-Lobby.',
                        en: 'Opens the duels lobby.',
                        pl: 'Otwiera lobby pojedynków.',
                      });
                const primaryLabel = isLiveEntry
                  ? copy({
                      de: 'Live ansehen',
                      en: 'Watch live',
                      pl: 'Obserwuj na żywo',
                    })
                  : session.status === 'authenticated'
                    ? copy({
                        de: 'Match beitreten',
                        en: 'Join match',
                        pl: 'Dołącz do meczu',
                      })
                    : copy({
                        de: 'Lobby öffnen',
                        en: 'Open lobby',
                        pl: 'Otwórz lobby',
                      });

                return (
                  <View
                    key={entry.sessionId}
                    style={{
                      backgroundColor: '#f8fafc',
                      borderColor: '#e2e8f0',
                      borderRadius: 20,
                      borderWidth: 1,
                      gap: 8,
                      padding: 14,
                    }}
                  >
                    <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
                      {entry.host.displayName}
                    </Text>
                    <Text style={{ color: '#475569', lineHeight: 20 }}>
                      {getHomeDuelModeLabel(entry.mode, locale)} •{' '}
                      {formatKangurMobileScoreOperation(entry.operation, locale)} •{' '}
                      {copy({
                        de: 'Stufe',
                        en: 'level',
                        pl: 'poziom',
                      })}{' '}
                      {getHomeDuelDifficultyLabel(entry.difficulty, locale)}
                    </Text>
                    <Text style={{ color: '#64748b' }}>
                      {copy({
                        de: `${getHomeDuelStatusLabel(entry.status, locale)} • ${entry.questionCount} Fragen • ${entry.timePerQuestionSec}s pro Frage • aktualisiert ${formatHomeRelativeAge(entry.updatedAt, locale)}`,
                        en: `${getHomeDuelStatusLabel(entry.status, locale)} • ${entry.questionCount} questions • ${entry.timePerQuestionSec}s per question • updated ${formatHomeRelativeAge(entry.updatedAt, locale)}`,
                        pl: `${getHomeDuelStatusLabel(entry.status, locale)} • ${entry.questionCount} pytań • ${entry.timePerQuestionSec}s na pytanie • aktualizacja ${formatHomeRelativeAge(entry.updatedAt, locale)}`,
                      })}
                    </Text>
                    {entry.series ? (
                      <Text style={{ color: '#4338ca', lineHeight: 20 }}>
                        {getHomeDuelSeriesLabel(entry.series, locale)}
                      </Text>
                    ) : null}
                    <View style={{ flexDirection: 'column', gap: 8 }}>
                      <OutlineLink
                        href={primaryHref}
                        hint={primaryHint}
                        label={primaryLabel}
                      />
                      <OutlineLink
                        href={DUELS_ROUTE}
                        hint={copy({
                          de: 'Öffnet die Duell-Lobby.',
                          en: 'Opens the duels lobby.',
                          pl: 'Otwiera lobby pojedynków.',
                        })}
                        label={copy({
                          de: 'Alle Duelle',
                          en: 'All duels',
                          pl: 'Wszystkie pojedynki',
                        })}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </SectionCard>

        <SectionCard
          title={copy({
            de: 'Letzte Rivalen',
            en: 'Recent opponents',
            pl: 'Ostatni rywale',
          })}
        >
          <Text style={{ color: '#475569', lineHeight: 20 }}>
            {copy({
              de: `Der schnelle Rückkampf startet mit den Standardwerten: ${formatKangurMobileScoreOperation(
                MOBILE_DUEL_DEFAULT_OPERATION,
                locale,
              )}, ${getHomeDuelDifficultyLabel(
                MOBILE_DUEL_DEFAULT_DIFFICULTY,
                locale,
              )}, ${MOBILE_DUEL_DEFAULT_QUESTION_COUNT} Fragen mit ${MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC}s pro Frage.`,
              en: `Quick rematch starts with the default setup: ${formatKangurMobileScoreOperation(
                MOBILE_DUEL_DEFAULT_OPERATION,
                locale,
              )}, ${getHomeDuelDifficultyLabel(
                MOBILE_DUEL_DEFAULT_DIFFICULTY,
                locale,
              )}, ${MOBILE_DUEL_DEFAULT_QUESTION_COUNT} questions with ${MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC}s per question.`,
              pl: `Szybki rewanż startuje z domyślnym ustawieniem: ${formatKangurMobileScoreOperation(
                MOBILE_DUEL_DEFAULT_OPERATION,
                locale,
              )}, poziom ${getHomeDuelDifficultyLabel(
                MOBILE_DUEL_DEFAULT_DIFFICULTY,
                locale,
              )}, ${MOBILE_DUEL_DEFAULT_QUESTION_COUNT} pytań po ${MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC}s.`,
            })}
          </Text>
          {!duelRematches.isAuthenticated ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#475569', lineHeight: 20 }}>
                {copy({
                  de: 'Nach der Anmeldung erscheinen hier die letzten Rivalen zusammen mit einer schnellen privaten Rückkampf-Aktion.',
                  en: 'After signing in, your recent opponents will appear here together with a quick private rematch action.',
                  pl: 'Po zalogowaniu pojawią się tutaj ostatni rywale razem z akcją szybkiego prywatnego rewanżu.',
                })}
              </Text>
              <OutlineLink
                href={DUELS_ROUTE}
                hint={copy({
                  de: 'Öffnet die Duell-Lobby.',
                  en: 'Opens the duels lobby.',
                  pl: 'Otwiera lobby pojedynków.',
                })}
                label={copy({
                  de: 'Duell-Lobby öffnen',
                  en: 'Open duels lobby',
                  pl: 'Otwórz lobby pojedynków',
                })}
              />
            </View>
          ) : duelRematches.isRestoringAuth || duelRematches.isLoading ? (
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              {copy({
                de: 'Die letzten Rivalen werden geladen.',
                en: 'Loading recent opponents.',
                pl: 'Pobieramy ostatnich rywali.',
              })}
            </Text>
          ) : duelRematches.error ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
                {duelRematches.error}
              </Text>
              <PrimaryButton
                hint={copy({
                  de: 'Aktualisiert die Liste der letzten Rivalen.',
                  en: 'Refreshes the list of recent opponents.',
                  pl: 'Odświeża listę ostatnich rywali.',
                })}
                label={copy({
                  de: 'Rivalen aktualisieren',
                  en: 'Refresh opponents',
                  pl: 'Odśwież rywali',
                })}
                onPress={duelRematches.refresh}
              />
            </View>
          ) : duelRematches.opponents.length === 0 ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#475569', lineHeight: 20 }}>
                {copy({
                  de: 'Noch keine letzten Rivalen. Beende dein erstes Duell, damit hier schnelle Rückkämpfe erscheinen.',
                  en: 'There are no recent opponents yet. Finish your first duel to unlock quick rematches here.',
                  pl: 'Nie ma jeszcze ostatnich rywali. Zakończ pierwszy pojedynek, aby odblokować tutaj szybkie rewanże.',
                })}
              </Text>
              <OutlineLink
                href={DUELS_ROUTE}
                hint={copy({
                  de: 'Öffnet die Duell-Lobby.',
                  en: 'Opens the duels lobby.',
                  pl: 'Otwiera lobby pojedynków.',
                })}
                label={copy({
                  de: 'Duell-Lobby öffnen',
                  en: 'Open duels lobby',
                  pl: 'Otwórz lobby pojedynków',
                })}
              />
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {duelRematches.actionError ? (
                <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
                  {duelRematches.actionError}
                </Text>
              ) : null}
              {duelRematches.opponents.map((entry) => (
                <View
                  key={entry.learnerId}
                  style={{
                    backgroundColor: '#f8fafc',
                    borderColor: '#e2e8f0',
                    borderRadius: 20,
                    borderWidth: 1,
                    gap: 8,
                    padding: 14,
                  }}
                >
                  <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
                    {entry.displayName}
                  </Text>
                  <Text style={{ color: '#64748b' }}>
                    {copy({
                      de: `Letztes Duell ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`,
                      en: `Last duel ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`,
                      pl: `Ostatni pojedynek ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`,
                    })}
                  </Text>
                  <View style={{ flexDirection: 'column', gap: 8 }}>
                    <PrimaryButton
                      disabled={duelRematches.isActionPending}
                      hint={copy({
                        de: `Sendet einen schnellen privaten Rückkampf an ${entry.displayName}.`,
                        en: `Sends a quick private rematch to ${entry.displayName}.`,
                        pl: `Wysyła szybki prywatny rewanż do ${entry.displayName}.`,
                      })}
                      label={
                        duelRematches.isActionPending
                          ? copy({
                              de: 'Rückkampf wird gesendet...',
                              en: 'Sending rematch...',
                              pl: 'Wysyłanie rewanżu...',
                            })
                          : copy({
                              de: 'Schneller Rückkampf',
                              en: 'Quick rematch',
                              pl: 'Szybki rewanż',
                            })
                      }
                      onPress={async () => {
                        const nextSessionId = await duelRematches.createRematch(
                          entry.learnerId,
                        );
                        if (nextSessionId) {
                          openDuelSession(nextSessionId);
                        }
                      }}
                    />
                    <OutlineLink
                      href={DUELS_ROUTE}
                      hint={copy({
                        de: 'Öffnet die Duell-Lobby.',
                        en: 'Opens the duels lobby.',
                        pl: 'Otwiera lobby pojedynków.',
                      })}
                      label={copy({
                        de: 'Lobby öffnen',
                        en: 'Open lobby',
                        pl: 'Otwórz lobby',
                      })}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </SectionCard>

        <SectionCard
          title={copy({
            de: 'Duell-Rangliste',
            en: 'Duel leaderboard',
            pl: 'Ranking pojedynków',
          })}
        >
          {duelLeaderboard.isLoading ? (
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              {copy({
                de: 'Die Duell-Rangliste wird geladen.',
                en: 'Loading the duel leaderboard.',
                pl: 'Pobieramy ranking pojedynków.',
              })}
            </Text>
          ) : duelLeaderboard.error ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
                {duelLeaderboard.error}
              </Text>
              <PrimaryButton
                hint={copy({
                  de: 'Aktualisiert die Duell-Rangliste.',
                  en: 'Refreshes the duel leaderboard.',
                  pl: 'Odświeża ranking pojedynków.',
                })}
                label={copy({
                  de: 'Ranking aktualisieren',
                  en: 'Refresh leaderboard',
                  pl: 'Odśwież ranking',
                })}
                onPress={duelLeaderboard.refresh}
              />
            </View>
          ) : duelLeaderboard.entries.length === 0 ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#475569', lineHeight: 20 }}>
                {copy({
                  de: 'Noch keine abgeschlossenen Duelle in diesem Fenster. Die ersten beendeten Serien füllen hier sofort diesen Duellstand.',
                  en: 'There are no completed duels in this window yet. The first finished series will fill this duel standing right away.',
                  pl: 'W tym oknie nie ma jeszcze zakończonych pojedynków. Pierwsze skończone serie od razu wypełnią tutaj ten stan pojedynków.',
                })}
              </Text>
              <OutlineLink
                href={DUELS_ROUTE}
                hint={copy({
                  de: 'Öffnet die Duell-Lobby.',
                  en: 'Opens the duels lobby.',
                  pl: 'Otwiera lobby pojedynków.',
                })}
                label={copy({
                  de: 'Duell-Lobby öffnen',
                  en: 'Open duels lobby',
                  pl: 'Otwórz lobby pojedynków',
                })}
              />
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {session.status === 'authenticated' && currentLearnerDuelEntry ? (
                <View
                  style={{
                    backgroundColor: '#eff6ff',
                    borderColor: '#bfdbfe',
                    borderRadius: 20,
                    borderWidth: 1,
                    gap: 8,
                    padding: 14,
                  }}
                >
                  <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '800' }}>
                    {copy({
                      de: 'DEIN DUELLSTAND',
                      en: 'YOUR DUEL SNAPSHOT',
                      pl: 'TWÓJ WYNIK W POJEDYNKACH',
                    })}
                  </Text>
                  <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                    #{currentLearnerDuelRank + 1} {currentLearnerDuelEntry.displayName}
                  </Text>
                  <Text style={{ color: '#475569', lineHeight: 20 }}>
                    {copy({
                      de: `Siege ${currentLearnerDuelEntry.wins} • Niederlagen ${currentLearnerDuelEntry.losses} • Unentschieden ${currentLearnerDuelEntry.ties}`,
                      en: `Wins ${currentLearnerDuelEntry.wins} • Losses ${currentLearnerDuelEntry.losses} • Ties ${currentLearnerDuelEntry.ties}`,
                      pl: `Wygrane ${currentLearnerDuelEntry.wins} • Porażki ${currentLearnerDuelEntry.losses} • Remisy ${currentLearnerDuelEntry.ties}`,
                    })}
                  </Text>
                  <Text style={{ color: '#64748b' }}>
                    {copy({
                      de: `Matches ${currentLearnerDuelEntry.matches} • Quote ${Math.round(
                        currentLearnerDuelEntry.winRate * 100,
                      )}% • letztes Duell ${formatHomeRelativeAge(
                        currentLearnerDuelEntry.lastPlayedAt,
                        locale,
                      )}`,
                      en: `Matches ${currentLearnerDuelEntry.matches} • Win rate ${Math.round(
                        currentLearnerDuelEntry.winRate * 100,
                      )}% • last duel ${formatHomeRelativeAge(
                        currentLearnerDuelEntry.lastPlayedAt,
                        locale,
                      )}`,
                      pl: `Mecze ${currentLearnerDuelEntry.matches} • Win rate ${Math.round(
                        currentLearnerDuelEntry.winRate * 100,
                      )}% • ostatni pojedynek ${formatHomeRelativeAge(
                        currentLearnerDuelEntry.lastPlayedAt,
                        locale,
                      )}`,
                    })}
                  </Text>
                </View>
              ) : session.status === 'authenticated' ? (
                <Text style={{ color: '#64748b', lineHeight: 20 }}>
                  {copy({
                    de: 'Dein Konto ist in diesem Duellstand noch nicht sichtbar. Schließe ein weiteres Duell ab oder öffne die Lobby, damit deine Position hier erscheint.',
                    en: 'Your account is not visible in this duel standing yet. Finish another duel or open the lobby so your rank appears here.',
                    pl: 'Twojego konta nie widać jeszcze w tym stanie pojedynków. Rozegraj kolejny pojedynek albo otwórz lobby, aby pojawiła się tutaj Twoja pozycja.',
                  })}
                </Text>
              ) : null}
              {duelLeaderboard.entries.map((entry, index) => (
                <View
                  key={entry.learnerId}
                  style={{
                    backgroundColor:
                      entry.learnerId === activeDuelLearnerId ? '#eff6ff' : '#f8fafc',
                    borderColor:
                      entry.learnerId === activeDuelLearnerId ? '#bfdbfe' : '#e2e8f0',
                    borderRadius: 20,
                    borderWidth: 1,
                    gap: 8,
                    padding: 14,
                  }}
                >
                  <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
                    #{index + 1} {entry.displayName}
                    {entry.learnerId === activeDuelLearnerId
                      ? copy({
                          de: ' · Du',
                          en: ' · You',
                          pl: ' · Ty',
                        })
                      : ''}
                  </Text>
                  <Text style={{ color: '#475569', lineHeight: 20 }}>
                    {copy({
                      de: `Siege ${entry.wins} • Niederlagen ${entry.losses} • Unentschieden ${entry.ties}`,
                      en: `Wins ${entry.wins} • Losses ${entry.losses} • Ties ${entry.ties}`,
                      pl: `Wygrane ${entry.wins} • Porażki ${entry.losses} • Remisy ${entry.ties}`,
                    })}
                  </Text>
                  <Text style={{ color: '#64748b' }}>
                    {copy({
                      de: `Matches ${entry.matches} • Quote ${Math.round(entry.winRate * 100)}% • letztes Duell ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`,
                      en: `Matches ${entry.matches} • Win rate ${Math.round(entry.winRate * 100)}% • last duel ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`,
                      pl: `Mecze ${entry.matches} • Win rate ${Math.round(entry.winRate * 100)}% • ostatni pojedynek ${formatHomeRelativeAge(entry.lastPlayedAt, locale)}`,
                    })}
                  </Text>
                </View>
              ))}
              <OutlineLink
                href={DUELS_ROUTE}
                hint={copy({
                  de: 'Öffnet die vollständige Duell-Lobby mit der erweiterten Rangliste.',
                  en: 'Opens the full duels lobby with the extended leaderboard.',
                  pl: 'Otwiera pełne lobby pojedynków z rozszerzonym rankingiem.',
                })}
                label={copy({
                  de: 'Volle Duell-Rangliste',
                  en: 'Full duel leaderboard',
                  pl: 'Pełny ranking pojedynków',
                })}
              />
            </View>
          )}
        </SectionCard>

        <SectionCard
          title={copy({
            de: 'Trainingsfokus',
            en: 'Training focus',
            pl: 'Fokus treningowy',
          })}
        >
          {trainingFocus.isRestoringAuth || trainingFocus.isLoading ? (
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              {copy({
                de: 'Die Anmeldung und der ergebnisbasierte Trainingsfokus werden wiederhergestellt.',
                en: 'Restoring sign-in and score-based training focus.',
                pl: 'Przywracamy logowanie i fokus treningowy oparty na wynikach.',
              })}
            </Text>
          ) : trainingFocus.error ? (
            <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
              {trainingFocus.error}
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              {trainingFocus.weakestOperation ? (
                <FocusCard
                  actionHref={createKangurPracticeHref(
                    trainingFocus.weakestOperation.operation,
                  )}
                  actionLabel={copy({
                    de: 'Schwächsten Modus trainieren',
                    en: 'Practice weakest mode',
                    pl: 'Trenuj najsłabszy tryb',
                  })}
                  averageAccuracyPercent={
                    trainingFocus.weakestOperation.averageAccuracyPercent
                  }
                  lessonHref={createKangurLessonHref(
                    trainingFocus.weakestLessonFocus,
                  )}
                  operation={trainingFocus.weakestOperation.operation}
                  sessions={trainingFocus.weakestOperation.sessions}
                  title={copy({
                    de: 'Zum Wiederholen',
                    en: 'Needs review',
                    pl: 'Do powtórki',
                  })}
                />
              ) : null}

              {trainingFocus.strongestOperation ? (
                <FocusCard
                  actionHref={createKangurPracticeHref(
                    trainingFocus.strongestOperation.operation,
                  )}
                  actionLabel={copy({
                    de: 'Tempo halten',
                    en: 'Keep the momentum',
                    pl: 'Utrzymaj tempo',
                  })}
                  averageAccuracyPercent={
                    trainingFocus.strongestOperation.averageAccuracyPercent
                  }
                  lessonHref={createKangurLessonHref(
                    trainingFocus.strongestLessonFocus,
                  )}
                  operation={trainingFocus.strongestOperation.operation}
                  sessions={trainingFocus.strongestOperation.sessions}
                  title={copy({
                    de: 'Stärkster Modus',
                    en: 'Strongest mode',
                    pl: 'Najmocniejszy tryb',
                  })}
                />
              ) : null}

              {!trainingFocus.weakestOperation &&
              !trainingFocus.strongestOperation ? (
                <Text style={{ color: '#475569', lineHeight: 20 }}>
                  {copy({
                    de: 'Es gibt noch keine Ergebnisse für diesen Fokus. Starte mit einem Training oder öffne direkt eine Lektion.',
                    en: 'There are no results for this focus yet. Start with practice or open a lesson directly.',
                    pl: 'Nie ma jeszcze wyników dla tego fokusu. Zacznij od treningu albo otwórz lekcję bezpośrednio.',
                  })}
                </Text>
              ) : null}
            </View>
          )}
        </SectionCard>

        <SectionCard
          title={copy({
            de: 'Lektionsplan zum Start',
            en: 'Lesson plan from home',
            pl: 'Plan lekcji ze startu',
          })}
        >
          <Text style={{ color: '#475569', lineHeight: 20 }}>
            {copy({
              de: 'Sieh sofort, was wiederholt werden sollte und welche Lektion nur kurz aufgefrischt werden muss.',
              en: 'See right away what needs review and which lesson only needs a quick refresh.',
              pl: 'Od razu zobacz, co wymaga powtórki, a którą lekcję trzeba tylko krótko odświeżyć.',
            })}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <SummaryChip
              accent='blue'
              label={copy({
                de: `Verfolgt ${lessonMastery.trackedLessons}`,
                en: `Tracked ${lessonMastery.trackedLessons}`,
                pl: `Śledzone ${lessonMastery.trackedLessons}`,
              })}
            />
            <SummaryChip
              accent='emerald'
              label={copy({
                de: `Beherrscht ${lessonMastery.masteredLessons}`,
                en: `Mastered ${lessonMastery.masteredLessons}`,
                pl: `Opanowane ${lessonMastery.masteredLessons}`,
              })}
            />
            <SummaryChip
              accent='amber'
              label={copy({
                de: `Zum Wiederholen ${lessonMastery.lessonsNeedingPractice}`,
                en: `Needs review ${lessonMastery.lessonsNeedingPractice}`,
                pl: `Do powtórki ${lessonMastery.lessonsNeedingPractice}`,
              })}
            />
          </View>

          {lessonMastery.trackedLessons === 0 ? (
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              {copy({
                de: 'Es gibt noch keine Lektions-Checkpoints. Öffne eine Lektion und speichere den ersten Checkpoint, damit hier Stärken und Wiederholungen erscheinen.',
                en: 'There are no lesson checkpoints yet. Open a lesson and save the first checkpoint to unlock strengths and review suggestions here.',
                pl: 'Nie ma jeszcze checkpointów lekcji. Otwórz lekcję i zapisz pierwszy checkpoint, aby odblokować tutaj mocne strony i powtórki.',
              })}
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              {lessonMastery.weakest[0] ? (
                <LessonMasteryCard
                  insight={lessonMastery.weakest[0]}
                  title={copy({
                    de: 'Zum Wiederholen',
                    en: 'Needs review',
                    pl: 'Do powtórki',
                  })}
                />
              ) : (
                <Text style={{ color: '#475569', lineHeight: 20 }}>
                  {copy({
                    de: 'Alle verfolgten Lektionen sind aktuell auf einem sicheren Niveau.',
                    en: 'All tracked lessons are currently at a safe level.',
                    pl: 'Wszystkie śledzone lekcje są obecnie na bezpiecznym poziomie.',
                  })}
                </Text>
              )}

              {lessonMastery.strongest[0] ? (
                <LessonMasteryCard
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
        </SectionCard>

        <SectionCard
          title={copy({
            de: 'Abzeichen-Zentrale',
            en: 'Badge hub',
            pl: 'Centrum odznak',
          })}
        >
          <Text style={{ color: '#475569', lineHeight: 20 }}>
            {copy({
              de: 'Die letzten Freischaltungen und der direkte Weg zum vollständigen Abzeichenüberblick bleiben hier griffbereit.',
              en: 'The latest unlocks and the direct path to the full badge overview stay close here.',
              pl: 'Ostatnie odblokowania i bezpośrednie przejście do pełnego przeglądu odznak są tutaj zawsze pod ręką.',
            })}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <SummaryChip
              accent='blue'
              label={copy({
                de: `Freigeschaltet ${homeBadges.unlockedBadges}/${homeBadges.totalBadges}`,
                en: `Unlocked ${homeBadges.unlockedBadges}/${homeBadges.totalBadges}`,
                pl: `Odblokowane ${homeBadges.unlockedBadges}/${homeBadges.totalBadges}`,
              })}
            />
            <SummaryChip
              accent='amber'
              label={copy({
                de: `Offen ${homeBadges.remainingBadges}`,
                en: `Remaining ${homeBadges.remainingBadges}`,
                pl: `Do zdobycia ${homeBadges.remainingBadges}`,
              })}
            />
          </View>
          {homeBadges.recentBadges.length === 0 ? (
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              {copy({
                de: 'Es gibt noch keine lokal freigeschalteten Abzeichen. Schließe Lektionen, Trainings oder Spiele ab, damit sie hier erscheinen.',
                en: 'There are no locally unlocked badges yet. Finish lessons, practice runs, or games so they appear here.',
                pl: 'Nie ma jeszcze lokalnie odblokowanych odznak. Ukończ lekcje, treningi albo gry, aby pojawiły się tutaj.',
              })}
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                {copy({
                  de: 'Zuletzt freigeschaltet',
                  en: 'Recently unlocked',
                  pl: 'Ostatnio odblokowane',
                })}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {homeBadges.recentBadges.map((item) => (
                  <BadgeChip key={item.id} item={item} />
                ))}
              </View>
            </View>
          )}
          <OutlineLink
            href={PROFILE_ROUTE}
            hint={copy({
              de: 'Öffnet das Profil mit der vollständigen Abzeichenübersicht.',
              en: 'Opens the profile with the full badge overview.',
              pl: 'Otwiera profil z pełnym przeglądem odznak.',
            })}
            label={copy({
              de: 'Profil und Abzeichen öffnen',
              en: 'Open profile and badges',
              pl: 'Otwórz profil i odznaki',
            })}
          />
        </SectionCard>

        <SectionCard
          title={copy({
            de: 'Zurück zu den letzten Lektionen',
            en: 'Return to recent lessons',
            pl: 'Powrót do ostatnich lekcji',
          })}
        >
          <Text style={{ color: '#475569', lineHeight: 20 }}>
            {copy({
              de: 'Jeder lokal gespeicherte Checkpoint oder Lektionsabschluss erscheint hier sofort, damit du vom Start aus direkt an der zuletzt gespeicherten Stelle weitermachen kannst.',
              en: 'Every locally saved checkpoint or lesson completion appears here right away so you can resume from home at the most recently saved lesson.',
              pl: 'Każdy lokalnie zapisany checkpoint albo ukończenie lekcji pojawia się tutaj od razu, aby można było ze startu wrócić do ostatnio zapisanej lekcji.',
            })}
          </Text>
          {lessonCheckpoints.recentCheckpoints.length === 0 ? (
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              {copy({
                de: 'Es gibt noch keine gespeicherten Checkpoints. Öffne eine Lektion und speichere den ersten Stand, damit die letzten Lektionen hier erscheinen.',
                en: 'There are no saved checkpoints yet. Open a lesson and save the first checkpoint so recent lessons appear here.',
                pl: 'Nie ma jeszcze zapisanych checkpointów. Otwórz lekcję i zapisz pierwszy stan, aby ostatnie lekcje pojawiły się tutaj.',
              })}
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              {lessonCheckpoints.recentCheckpoints.map((item) => (
                <LessonCheckpointCard
                  key={item.componentId}
                  item={item}
                />
              ))}
              <OutlineLink
                href={LESSONS_ROUTE}
                hint={copy({
                  de: 'Öffnet den vollständigen Lektionskatalog.',
                  en: 'Opens the full lessons catalog.',
                  pl: 'Otwiera pełny katalog lekcji.',
                })}
                label={copy({
                  de: 'Alle Lektionen öffnen',
                  en: 'Open all lessons',
                  pl: 'Otwórz wszystkie lekcje',
                })}
              />
            </View>
          )}
        </SectionCard>

        <SectionCard
          title={copy({
            de: 'Plan zum Start',
            en: 'Plan from home',
            pl: 'Plan z ekranu głównego',
          })}
        >
          <Text style={{ color: '#475569', lineHeight: 20 }}>
            {copy({
              de: 'Verwandle Fortschritt und gespeicherte Lektionen direkt in die nächsten Schritte.',
              en: 'Turn progress and saved lessons directly into the next steps.',
              pl: 'Zamień postęp i zapisane lekcje bezpośrednio w kolejne kroki.',
            })}
          </Text>
          {homeAssignments.assignmentItems.length === 0 ? (
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              {copy({
                de: 'Es gibt noch keine Aufgaben. Öffne eine Lektion oder schließe ein Training ab, um sie zu erzeugen.',
                en: 'There are no tasks yet. Open a lesson or finish practice to generate them.',
                pl: 'Nie ma jeszcze zadań. Otwórz lekcję albo ukończ trening, aby je wygenerować.',
              })}
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              {homeAssignments.assignmentItems.map((item) => (
                <AssignmentCard
                  key={item.assignment.id}
                  item={item}
                />
              ))}
              <OutlineLink
                href={PLAN_ROUTE}
                hint={copy({
                  de: 'Öffnet den vollständigen Tagesplan mit der erweiterten Aufgabenliste.',
                  en: 'Opens the full daily plan with the extended task list.',
                  pl: 'Otwiera pełny plan dnia z rozszerzoną listą zadań.',
                })}
                label={copy({
                  de: 'Vollen Tagesplan öffnen',
                  en: 'Open full daily plan',
                  pl: 'Otwórz pełny plan dnia',
                })}
              />
            </View>
          )}
        </SectionCard>

        <SectionCard
          title={copy({
            de: 'Ergebniszentrale',
            en: 'Results hub',
            pl: 'Centrum wyników',
          })}
        >
          <Text style={{ color: '#475569', lineHeight: 20 }}>
            {copy({
              de: 'Die letzten Ergebnisse bleiben hier griffbereit, damit du direkt wieder ins Training oder in den vollständigen Verlauf springen kannst.',
              en: 'The latest results stay close here so you can jump straight back into practice or the full history.',
              pl: 'Ostatnie wyniki są tutaj pod ręką, aby od razu wrócić do treningu albo pełnej historii.',
            })}
          </Text>
          {recentResults.isRestoringAuth || recentResults.isLoading ? (
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              {copy({
                de: 'Die Ergebnisse des Schulers werden geladen.',
                en: 'Loading learner results.',
                pl: 'Pobieramy wyniki ucznia.',
              })}
            </Text>
          ) : recentResults.error ? (
            <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
              {recentResults.error}
            </Text>
          ) : recentResults.results.length === 0 ? (
            <Text style={{ color: '#475569', lineHeight: 20 }}>
              {copy({
                de: 'Es gibt hier noch keine Ergebnisse.',
                en: 'There are no results here yet.',
                pl: 'Nie ma tu jeszcze wyników.',
              })}
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              {recentResults.results.map((result) => (
                <View
                  key={result.id}
                  style={{
                    backgroundColor: '#f8fafc',
                    borderColor: '#e2e8f0',
                    borderRadius: 20,
                    borderWidth: 1,
                    gap: 8,
                    padding: 14,
                  }}
                >
                  <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
                    {formatKangurMobileScoreOperation(result.operation, locale)}
                  </Text>
                  <Text style={{ color: '#475569' }}>
                    {copy({
                      de: `${result.correct_answers}/${result.total_questions} richtig`,
                      en: `${result.correct_answers}/${result.total_questions} correct`,
                      pl: `${result.correct_answers}/${result.total_questions} poprawnych`,
                    })}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    <OutlineLink
                      href={createKangurPracticeHref(result.operation)}
                      hint={copy({
                        de: `Startet erneut das Training für den Modus ${formatKangurMobileScoreOperation(result.operation, locale)}.`,
                        en: `Starts practice again for the ${formatKangurMobileScoreOperation(result.operation, locale)} mode.`,
                        pl: `Uruchamia ponowny trening dla trybu ${formatKangurMobileScoreOperation(result.operation, locale)}.`,
                      })}
                      label={`${copy({
                        de: 'Erneut trainieren',
                        en: 'Train again',
                        pl: 'Trenuj ponownie',
                      })}: ${formatKangurMobileScoreOperation(result.operation, locale)}`}
                    />
                    <OutlineLink
                      href={createKangurResultsHref({ operation: result.operation })}
                      hint={copy({
                        de: `Öffnet den Ergebnisverlauf für den Modus ${formatKangurMobileScoreOperation(result.operation, locale)}.`,
                        en: `Opens result history for the ${formatKangurMobileScoreOperation(result.operation, locale)} mode.`,
                        pl: `Otwiera historię wyników dla trybu ${formatKangurMobileScoreOperation(result.operation, locale)}.`,
                      })}
                      label={`${copy({
                        de: 'Modusverlauf',
                        en: 'Mode history',
                        pl: 'Historia trybu',
                      })}: ${formatKangurMobileScoreOperation(result.operation, locale)}`}
                    />
                  </View>
                </View>
              ))}
              <OutlineLink
                href={RESULTS_ROUTE}
                hint={copy({
                  de: 'Öffnet den vollständigen Ergebnisverlauf.',
                  en: 'Opens the full results history.',
                  pl: 'Otwiera pełną historię wyników.',
                })}
                label={copy({
                  de: 'Vollständigen Verlauf öffnen',
                  en: 'Open full history',
                  pl: 'Otwórz pełną historię',
                })}
              />
            </View>
          )}
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}
