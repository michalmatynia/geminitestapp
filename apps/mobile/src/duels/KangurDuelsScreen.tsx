import type {
  KangurDuelChoice,
  KangurDuelDifficulty,
  KangurDuelLobbyChatMessage,
  KangurDuelMode,
  KangurDuelOperation,
  KangurDuelPlayer,
  KangurDuelPlayerStatus,
  KangurDuelReactionType,
  KangurDuelSeries,
  KangurDuelSession,
  KangurDuelStatus,
} from '@kangur/contracts';
import { Link, type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import {
  useKangurMobileI18n,
  type KangurMobileLocale,
  type KangurMobileLocalizedValue,
} from '../i18n/kangurMobileI18n';
import {
  useKangurMobileLessonCheckpoints,
  type KangurMobileLessonCheckpointItem,
} from '../lessons/useKangurMobileLessonCheckpoints';
import { formatKangurMobileScoreDateTime } from '../scores/mobileScoreSummary';
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import { shareKangurDuelInvite } from './duelInviteShare';
import { createKangurDuelsHref } from './duelsHref';
import {
  useKangurMobileDuelsAssignments,
  type KangurMobileDuelsAssignmentItem,
} from './useKangurMobileDuelsAssignments';
import {
  useKangurMobileDuelsLessonMastery,
  type KangurMobileDuelsLessonMasteryItem,
} from './useKangurMobileDuelsLessonMastery';
import { useKangurMobileDuelLobbyChat } from './useKangurMobileDuelLobbyChat';
import { useKangurMobileDuelSession } from './useKangurMobileDuelSession';
import { useKangurMobileDuelsLobby } from './useKangurMobileDuelsLobby';

type Tone = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

const HOME_ROUTE = '/' as Href;
const LESSONS_ROUTE = '/lessons' as Href;

const localizeDuelText = (
  value: KangurMobileLocalizedValue<string>,
  locale: KangurMobileLocale,
): string => value[locale];

const DUEL_MODE_LABELS: Record<KangurDuelMode, KangurMobileLocalizedValue<string>> = {
  challenge: {
    de: 'Herausforderung',
    en: 'Challenge',
    pl: 'Wyzwanie',
  },
  quick_match: {
    de: 'Schnelles Match',
    en: 'Quick match',
    pl: 'Szybki mecz',
  },
};

const DUEL_OPERATION_SYMBOLS: Record<KangurDuelOperation, string> = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
};

const DUEL_OPERATION_LABELS: Record<KangurDuelOperation, KangurMobileLocalizedValue<string>> = {
  addition: {
    de: 'Addition',
    en: 'Addition',
    pl: 'Dodawanie',
  },
  subtraction: {
    de: 'Subtraktion',
    en: 'Subtraction',
    pl: 'Odejmowanie',
  },
  multiplication: {
    de: 'Multiplikation',
    en: 'Multiplication',
    pl: 'Mnożenie',
  },
  division: {
    de: 'Division',
    en: 'Division',
    pl: 'Dzielenie',
  },
};

const DUEL_DIFFICULTY_LABELS: Record<
  KangurDuelDifficulty,
  KangurMobileLocalizedValue<string>
> = {
  easy: {
    de: 'Leicht',
    en: 'Easy',
    pl: 'Łatwy',
  },
  medium: {
    de: 'Mittel',
    en: 'Medium',
    pl: 'Średni',
  },
  hard: {
    de: 'Schwer',
    en: 'Hard',
    pl: 'Trudny',
  },
};

const DUEL_DIFFICULTY_EMOJIS: Record<KangurDuelDifficulty, string> = {
  easy: '🟢',
  medium: '🟡',
  hard: '🔴',
};

const DUEL_STATUS_LABELS: Record<KangurDuelStatus, KangurMobileLocalizedValue<string>> = {
  aborted: {
    de: 'Abgebrochen',
    en: 'Aborted',
    pl: 'Przerwany',
  },
  completed: {
    de: 'Beendet',
    en: 'Completed',
    pl: 'Zakończony',
  },
  created: {
    de: 'Erstellt',
    en: 'Created',
    pl: 'Utworzony',
  },
  in_progress: {
    de: 'Läuft',
    en: 'In progress',
    pl: 'W trakcie',
  },
  ready: {
    de: 'Bereit',
    en: 'Ready',
    pl: 'Gotowy',
  },
  waiting: {
    de: 'Warten',
    en: 'Waiting',
    pl: 'Oczekiwanie',
  },
};

const DUEL_PLAYER_STATUS_LABELS: Record<
  KangurDuelPlayerStatus,
  KangurMobileLocalizedValue<string>
> = {
  completed: {
    de: 'Fertig',
    en: 'Completed',
    pl: 'Ukończono',
  },
  invited: {
    de: 'Eingeladen',
    en: 'Invited',
    pl: 'Zaproszony',
  },
  left: {
    de: 'Verlassen',
    en: 'Left',
    pl: 'Wyszedł',
  },
  playing: {
    de: 'Spielt',
    en: 'Playing',
    pl: 'Gra',
  },
  ready: {
    de: 'Bereit',
    en: 'Ready',
    pl: 'Gotowy',
  },
};

const MODE_FILTER_OPTIONS: Array<{
  value: 'all' | KangurDuelMode;
  label: KangurMobileLocalizedValue<string>;
}> = [
  {
    value: 'all',
    label: {
      de: 'Alle',
      en: 'All',
      pl: 'Wszystkie',
    },
  },
  {
    value: 'quick_match',
    label: {
      de: 'Schnelle Matches',
      en: 'Quick matches',
      pl: 'Szybkie mecze',
    },
  },
  {
    value: 'challenge',
    label: {
      de: 'Herausforderungen',
      en: 'Challenges',
      pl: 'Wyzwania',
    },
  },
];

const OPERATION_OPTIONS: KangurDuelOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
];

const DIFFICULTY_OPTIONS: KangurDuelDifficulty[] = ['easy', 'medium', 'hard'];
const SERIES_BEST_OF_OPTIONS: Array<1 | 3 | 5 | 7 | 9> = [1, 3, 5, 7, 9];
const DUEL_REACTION_OPTIONS: KangurDuelReactionType[] = [
  'cheer',
  'wow',
  'gg',
  'fire',
  'clap',
  'rocket',
  'thumbs_up',
];
const LOBBY_CHAT_PREVIEW_LIMIT = 8;

const DUEL_REACTION_EMOJIS: Record<KangurDuelReactionType, string> = {
  cheer: '👏',
  wow: '😮',
  gg: '🤝',
  fire: '🔥',
  clap: '🙌',
  rocket: '🚀',
  thumbs_up: '👍',
};

const DUEL_REACTION_LABELS: Record<
  KangurDuelReactionType,
  KangurMobileLocalizedValue<string>
> = {
  cheer: {
    de: 'Applaus',
    en: 'Cheer',
    pl: 'Brawa',
  },
  wow: {
    de: 'Wow',
    en: 'Wow',
    pl: 'Wow',
  },
  gg: {
    de: 'Gutes Spiel',
    en: 'Good game',
    pl: 'Dobra gra',
  },
  fire: {
    de: 'Feuer',
    en: 'Fire',
    pl: 'Ogień',
  },
  clap: {
    de: 'Super',
    en: 'Nice',
    pl: 'Super',
  },
  rocket: {
    de: 'Rakete',
    en: 'Rocket',
    pl: 'Rakieta',
  },
  thumbs_up: {
    de: 'Daumen hoch',
    en: 'Thumbs up',
    pl: 'Kciuk w górę',
  },
};

function isWaitingSessionStatus(status: KangurDuelStatus): boolean {
  return status === 'waiting' || status === 'ready' || status === 'created';
}

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

function SectionTitle({
  title,
  subtitle,
}: {
  subtitle: string;
  title: string;
}): React.JSX.Element {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 28, fontWeight: '800', color: '#0f172a' }}>
        {title}
      </Text>
      <Text style={{ color: '#475569', fontSize: 15, lineHeight: 22 }}>
        {subtitle}
      </Text>
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
      <Text style={{ color: tone.textColor, fontSize: 12, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

function ActionButton({
  disabled = false,
  label,
  onPress,
  stretch = false,
  tone = 'primary',
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void | Promise<void>;
  stretch?: boolean;
  tone?: 'primary' | 'secondary' | 'ghost';
}): React.JSX.Element {
  const isPrimary = tone === 'primary';
  const isGhost = tone === 'ghost';

  return (
    <Pressable
      accessibilityRole='button'
      disabled={disabled}
      onPress={() => {
        void onPress();
      }}
      style={{
        alignSelf: stretch ? 'stretch' : 'flex-start',
        opacity: disabled ? 0.55 : 1,
        borderRadius: 999,
        borderWidth: isPrimary ? 0 : 1,
        borderColor: isGhost ? '#e2e8f0' : isPrimary ? 'transparent' : '#cbd5e1',
        backgroundColor: isPrimary ? '#0f172a' : '#ffffff',
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      <Text
        style={{
          color: isPrimary ? '#ffffff' : '#0f172a',
          fontWeight: '700',
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function LinkButton({
  href,
  label,
  stretch = false,
  tone = 'secondary',
}: {
  href: Href;
  label: string;
  stretch?: boolean;
  tone?: 'primary' | 'secondary';
}): React.JSX.Element {
  const isPrimary = tone === 'primary';

  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole='button'
        style={{
          alignSelf: stretch ? 'stretch' : 'flex-start',
          borderRadius: 999,
          borderWidth: isPrimary ? 0 : 1,
          borderColor: isPrimary ? 'transparent' : '#cbd5e1',
          backgroundColor: isPrimary ? '#0f172a' : '#ffffff',
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      >
        <Text
          style={{
            color: isPrimary ? '#ffffff' : '#0f172a',
            fontWeight: '700',
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

function FilterChip({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole='button'
      onPress={onPress}
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? '#1d4ed8' : '#cbd5e1',
        backgroundColor: selected ? '#dbeafe' : '#ffffff',
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <Text
        style={{
          color: selected ? '#1d4ed8' : '#334155',
          fontSize: 13,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function MessageCard({
  description,
  title,
  tone = 'neutral',
}: {
  description: string;
  title: string;
  tone?: 'error' | 'neutral';
}): React.JSX.Element {
  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: tone === 'error' ? '#fecaca' : '#e2e8f0',
        backgroundColor: tone === 'error' ? '#fef2f2' : '#f8fafc',
        gap: 8,
        padding: 14,
      }}
    >
      <Text
        style={{
          color: tone === 'error' ? '#991b1b' : '#0f172a',
          fontSize: 16,
          fontWeight: '800',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: tone === 'error' ? '#7f1d1d' : '#475569',
          fontSize: 14,
          lineHeight: 20,
        }}
      >
        {description}
      </Text>
    </View>
  );
}

function LessonCheckpointRow({
  item,
}: {
  item: KangurMobileLessonCheckpointItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();

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
          <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
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
          de: `Zuletzt gespeichert ${formatKangurMobileScoreDateTime(item.lastCompletedAt, locale)}`,
          en: `Last saved ${formatKangurMobileScoreDateTime(item.lastCompletedAt, locale)}`,
          pl: `Ostatni zapis ${formatKangurMobileScoreDateTime(item.lastCompletedAt, locale)}`,
        })}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <LinkButton
          href={item.lessonHref}
          label={`${copy({
            de: 'Zur Lektion zurück',
            en: 'Return to lesson',
            pl: 'Wróć do lekcji',
          })}: ${item.title}`}
          tone='primary'
        />
        {item.practiceHref ? (
          <LinkButton
            href={item.practiceHref}
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

function LessonCheckpointsCard({
  context,
}: {
  context: 'lobby' | 'session';
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const lessonCheckpoints = useKangurMobileLessonCheckpoints({ limit: 2 });

  return (
    <Card>
      <View style={{ gap: 4 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
          {copy({
            de: 'Letzte Lektions-Checkpoints',
            en: 'Recent lesson checkpoints',
            pl: 'Ostatnie checkpointy lekcji',
          })}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {context === 'session'
            ? copy({
                de: 'Auch während eines Duells kannst du direkt zu den zuletzt gespeicherten Lektionen zurückspringen.',
                en: 'Even during a duel, you can jump straight back to the most recently saved lessons.',
                pl: 'Nawet w trakcie pojedynku możesz od razu wrócić do ostatnio zapisanych lekcji.',
              })
            : copy({
                de: 'Zwischen Lobby, Suche und Rangliste kannst du direkt zu den zuletzt gespeicherten Lektionen zurückspringen.',
                en: 'Between the lobby, search, and leaderboard, you can jump straight back to the most recently saved lessons.',
                pl: 'Między lobby, wyszukiwaniem i rankingiem możesz od razu wrócić do ostatnio zapisanych lekcji.',
              })}
        </Text>
      </View>

      {lessonCheckpoints.recentCheckpoints.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine gespeicherten Checkpoints. Öffne eine Lektion und speichere den ersten Stand, damit er hier erscheint.',
            en: 'There are no saved checkpoints yet. Open a lesson and save the first state so it appears here.',
            pl: 'Nie ma jeszcze zapisanych checkpointów. Otwórz lekcję i zapisz pierwszy stan, aby pojawił się tutaj.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
            {copy({
              de: 'Lektionen fortsetzen',
              en: 'Continue lessons',
              pl: 'Kontynuuj lekcje',
            })}
          </Text>
          {lessonCheckpoints.recentCheckpoints.map((item) => (
            <LessonCheckpointRow key={item.componentId} item={item} />
          ))}
          <LinkButton
            href={LESSONS_ROUTE}
            label={copy({
              de: 'Lektionen öffnen',
              en: 'Open lessons',
              pl: 'Otwórz lekcje',
            })}
          />
        </View>
      )}
    </Card>
  );
}

function getLessonMasteryTone(masteryPercent: number): Tone {
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
}

function LessonMasteryRow({
  insight,
  title,
}: {
  insight: KangurMobileDuelsLessonMasteryItem;
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
        <Pill label={`${insight.masteryPercent}%`} tone={masteryTone} />
      </View>

      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Bestes Ergebnis ${insight.bestScorePercent}% • letzter Versuch ${lastAttemptLabel}`,
          en: `Best score ${insight.bestScorePercent}% • last attempt ${lastAttemptLabel}`,
          pl: `Najlepszy wynik ${insight.bestScorePercent}% • ostatnia próba ${lastAttemptLabel}`,
        })}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <LinkButton
          href={insight.lessonHref}
          label={copy({
            de: 'Lektion öffnen',
            en: 'Open lesson',
            pl: 'Otwórz lekcję',
          })}
          tone='primary'
        />
        {insight.practiceHref ? (
          <LinkButton
            href={insight.practiceHref}
            label={copy({
              de: 'Danach trainieren',
              en: 'Practice after',
              pl: 'Potem trenuj',
            })}
          />
        ) : null}
      </View>
    </View>
  );
}

function LessonMasteryCard({
  context,
}: {
  context: 'lobby' | 'session';
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const lessonMastery = useKangurMobileDuelsLessonMastery();

  return (
    <Card>
      <View style={{ gap: 4 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
          {copy({
            de: 'Lektionsbeherrschung',
            en: 'Lesson mastery',
            pl: 'Opanowanie lekcji',
          })}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {context === 'session'
            ? copy({
                de: 'Auch während einer Duellsitzung kannst du den lokal gespeicherten Lektionsstand nutzen, um die nächste Wiederholung schneller zu wählen.',
                en: 'Even during a duel session, you can use locally saved lesson mastery to choose the next review faster.',
                pl: 'Nawet w trakcie sesji pojedynku możesz wykorzystać lokalnie zapisane opanowanie lekcji, aby szybciej wybrać następną powtórkę.',
              })
            : copy({
                de: 'Zwischen Lobby, Suche und Rangliste kannst du den lokal gespeicherten Lektionsstand nutzen, um schneller zu Wiederholungen zurückzukehren.',
                en: 'Between the lobby, search, and leaderboard, you can use locally saved lesson mastery to jump back into review faster.',
                pl: 'Między lobby, wyszukiwaniem i rankingiem możesz wykorzystać lokalnie zapisane opanowanie lekcji, aby szybciej wrócić do powtórek.',
              })}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill
          label={copy({
            de: `Verfolgt ${lessonMastery.trackedLessons}`,
            en: `Tracked ${lessonMastery.trackedLessons}`,
            pl: `Śledzone ${lessonMastery.trackedLessons}`,
          })}
          tone={{
            backgroundColor: '#eef2ff',
            borderColor: '#c7d2fe',
            textColor: '#4338ca',
          }}
        />
        <Pill
          label={copy({
            de: `Beherrscht ${lessonMastery.masteredLessons}`,
            en: `Mastered ${lessonMastery.masteredLessons}`,
            pl: `Opanowane ${lessonMastery.masteredLessons}`,
          })}
          tone={{
            backgroundColor: '#ecfdf5',
            borderColor: '#a7f3d0',
            textColor: '#047857',
          }}
        />
        <Pill
          label={copy({
            de: `Zum Wiederholen ${lessonMastery.lessonsNeedingPractice}`,
            en: `Needs review ${lessonMastery.lessonsNeedingPractice}`,
            pl: `Do powtórki ${lessonMastery.lessonsNeedingPractice}`,
          })}
          tone={{
            backgroundColor: '#fffbeb',
            borderColor: '#fde68a',
            textColor: '#b45309',
          }}
        />
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
        <View style={{ gap: 12 }}>
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
    </Card>
  );
}

function DuelAssignmentRow({
  item,
}: {
  item: KangurMobileDuelsAssignmentItem;
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
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        padding: 14,
        gap: 8,
      }}
    >
      <Pill
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
        tone={priorityTone}
      />

      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
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
        <LinkButton
          href={item.href}
          label={translateKangurMobileActionLabel(item.assignment.action.label, locale)}
          tone='primary'
        />
      ) : (
        <Pill
          label={`${translateKangurMobileActionLabel(item.assignment.action.label, locale)} · ${copy({
            de: 'bald',
            en: 'soon',
            pl: 'wkrotce',
          })}`}
          tone={{
            backgroundColor: '#e2e8f0',
            borderColor: '#cbd5e1',
            textColor: '#475569',
          }}
        />
      )}
    </View>
  );
}

function NextStepsCard({
  context,
}: {
  context: 'lobby' | 'session';
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  const duelAssignments = useKangurMobileDuelsAssignments();

  return (
    <Card>
      <View style={{ gap: 4 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
          {copy({
            de: 'Nächste Schritte',
            en: 'Next steps',
            pl: 'Następne kroki',
          })}
        </Text>
        <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
          {context === 'session'
            ? copy({
                de: 'Lokale Aufgaben neben dem Duell',
                en: 'Local tasks beside the duel',
                pl: 'Lokalne zadania obok pojedynku',
              })
            : copy({
                de: 'Lokale Aufgaben aus der Lobby',
                en: 'Local tasks from the lobby',
                pl: 'Lokalne zadania z lobby',
              })}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {context === 'session'
            ? copy({
                de: 'Auch während einer Duellsitzung kannst du direkt in die nächsten lokalen Aufgaben aus deinem Fortschritt springen.',
                en: 'Even during a duel session, you can jump straight into the next local tasks from your progress.',
                pl: 'Nawet w trakcie sesji pojedynku możesz od razu wejść w kolejne lokalne zadania wynikające z Twojego postępu.',
              })
            : copy({
                de: 'Zwischen Lobby, Suche und Rangliste kannst du direkt in die nächsten lokalen Aufgaben aus deinem Fortschritt springen.',
                en: 'Between the lobby, search, and leaderboard, you can jump straight into the next local tasks from your progress.',
                pl: 'Między lobby, wyszukiwaniem i rankingiem możesz od razu wejść w kolejne lokalne zadania wynikające z Twojego postępu.',
              })}
        </Text>
      </View>

      {duelAssignments.assignmentItems.length === 0 ? (
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {copy({
            de: 'Es gibt noch keine lokalen Aufgaben. Öffne Lektionen oder absolviere weitere Trainings, um den nächsten Plan aufzubauen.',
            en: 'There are no local tasks yet. Open lessons or complete more practice to build the next plan.',
            pl: 'Nie ma jeszcze lokalnych zadań. Otwórz lekcje albo wykonaj kolejne treningi, aby zbudować następny plan.',
          })}
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {duelAssignments.assignmentItems.map((item) => (
            <DuelAssignmentRow key={item.assignment.id} item={item} />
          ))}
        </View>
      )}
    </Card>
  );
}

function getStatusTone(status: KangurDuelStatus): Tone {
  if (status === 'completed') {
    return {
      backgroundColor: '#ecfdf5',
      borderColor: '#a7f3d0',
      textColor: '#047857',
    };
  }
  if (status === 'aborted') {
    return {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
      textColor: '#b91c1c',
    };
  }
  if (status === 'in_progress' || status === 'ready') {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
    };
  }

  return {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    textColor: '#1d4ed8',
  };
}

function getPlayerStatusTone(status: KangurDuelPlayerStatus): Tone {
  if (status === 'completed') {
    return {
      backgroundColor: '#ecfdf5',
      borderColor: '#a7f3d0',
      textColor: '#047857',
    };
  }
  if (status === 'left') {
    return {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
      textColor: '#b91c1c',
    };
  }
  if (status === 'playing') {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
    };
  }

  return {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    textColor: '#1d4ed8',
  };
}

function formatModeLabel(mode: KangurDuelMode, locale: KangurMobileLocale): string {
  return localizeDuelText(DUEL_MODE_LABELS[mode], locale);
}

function formatOperationLabel(
  operation: KangurDuelOperation,
  locale: KangurMobileLocale,
): string {
  return `${DUEL_OPERATION_SYMBOLS[operation]} ${localizeDuelText(DUEL_OPERATION_LABELS[operation], locale)}`;
}

function formatDifficultyLabel(
  difficulty: KangurDuelDifficulty,
  locale: KangurMobileLocale,
): string {
  return `${DUEL_DIFFICULTY_EMOJIS[difficulty]} ${localizeDuelText(DUEL_DIFFICULTY_LABELS[difficulty], locale)}`;
}

function formatStatusLabel(status: KangurDuelStatus, locale: KangurMobileLocale): string {
  return localizeDuelText(DUEL_STATUS_LABELS[status], locale);
}

function formatSeriesBestOfLabel(
  bestOf: 1 | 3 | 5 | 7 | 9,
  locale: KangurMobileLocale,
): string {
  if (bestOf === 1) {
    return localizeDuelText(
      {
        de: 'Einzelnes Match',
        en: 'Single match',
        pl: 'Pojedynczy mecz',
      },
      locale,
    );
  }

  return localizeDuelText(
    {
      de: `BO${bestOf}-Serie`,
      en: `BO${bestOf} series`,
      pl: `Seria BO${bestOf}`,
    },
    locale,
  );
}

function normalizeSeriesBestOf(
  bestOf: number | null | undefined,
): 1 | 3 | 5 | 7 | 9 {
  if (bestOf === 3 || bestOf === 5 || bestOf === 7 || bestOf === 9) {
    return bestOf;
  }

  return 1;
}

function formatPlayerStatusLabel(
  status: KangurDuelPlayerStatus,
  locale: KangurMobileLocale,
): string {
  return localizeDuelText(DUEL_PLAYER_STATUS_LABELS[status], locale);
}

function formatReactionLabel(
  type: KangurDuelReactionType,
  locale: KangurMobileLocale,
): string {
  return `${DUEL_REACTION_EMOJIS[type]} ${localizeDuelText(DUEL_REACTION_LABELS[type], locale)}`;
}

function formatRelativeAge(isoString: string, locale: KangurMobileLocale): string {
  const parsed = Date.parse(isoString);
  if (!Number.isFinite(parsed)) {
    return localizeDuelText(
      {
        de: 'gerade eben',
        en: 'just now',
        pl: 'przed chwilą',
      },
      locale,
    );
  }

  const seconds = Math.max(0, Math.floor((Date.now() - parsed) / 1000));
  if (seconds < 10) {
    return localizeDuelText(
      {
        de: 'gerade eben',
        en: 'just now',
        pl: 'przed chwilą',
      },
      locale,
    );
  }
  if (seconds < 60) {
    return locale === 'de'
      ? `vor ${seconds}s`
      : locale === 'en'
        ? `${seconds}s ago`
        : `${seconds}s temu`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return locale === 'de'
      ? `vor ${minutes} Min.`
      : locale === 'en'
        ? `${minutes} min ago`
        : `${minutes} min temu`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return locale === 'de'
      ? `vor ${hours} Std.`
      : locale === 'en'
        ? `${hours} hr ago`
        : `${hours} godz. temu`;
  }

  const days = Math.floor(hours / 24);
  return locale === 'de'
    ? `vor ${days} Tagen`
    : locale === 'en'
      ? `${days} days ago`
      : `${days} dni temu`;
}

function formatQuestionProgress(
  session: KangurDuelSession,
  player: KangurDuelPlayer,
  locale: KangurMobileLocale,
): string {
  const completed = Math.min(player.currentQuestionIndex ?? 0, session.questionCount);
  return locale === 'de'
    ? `${completed}/${session.questionCount} Fragen`
    : locale === 'en'
      ? `${completed}/${session.questionCount} questions`
      : `${completed}/${session.questionCount} pytań`;
}

function formatSpectatorQuestionProgress(
  session: KangurDuelSession,
  locale: KangurMobileLocale,
): string {
  const currentQuestion =
    session.status === 'in_progress'
      ? Math.min((session.currentQuestionIndex ?? 0) + 1, session.questionCount)
      : Math.min(session.currentQuestionIndex ?? 0, session.questionCount);
  return locale === 'de'
    ? `Runde ${currentQuestion}/${session.questionCount}`
    : locale === 'en'
      ? `Round ${currentQuestion}/${session.questionCount}`
      : `Runda ${currentQuestion}/${session.questionCount}`;
}

function resolveWinnerSummary(
  players: KangurDuelPlayer[],
  locale: KangurMobileLocale,
): string {
  if (!players.length) {
    return localizeDuelText(
      {
        de: 'Das Duell ist beendet.',
        en: 'The duel is finished.',
        pl: 'Pojedynek zakończony.',
      },
      locale,
    );
  }

  const sorted = [...players].sort((left, right) => {
    const leftScore = left.score + (left.bonusPoints ?? 0);
    const rightScore = right.score + (right.bonusPoints ?? 0);
    return rightScore - leftScore;
  });
  const topPlayer = sorted[0];
  const secondPlayer = sorted[1];

  if (!topPlayer) {
    return localizeDuelText(
      {
        de: 'Das Duell ist beendet.',
        en: 'The duel is finished.',
        pl: 'Pojedynek zakończony.',
      },
      locale,
    );
  }

  const topScore = topPlayer.score + (topPlayer.bonusPoints ?? 0);
  const secondScore = secondPlayer
    ? secondPlayer.score + (secondPlayer.bonusPoints ?? 0)
    : null;

  if (secondScore !== null && secondScore === topScore) {
    return localizeDuelText(
      {
        de: 'Unentschieden nach der letzten Runde.',
        en: 'Draw after the final round.',
        pl: 'Remis po ostatniej rundzie.',
      },
      locale,
    );
  }

  return locale === 'de'
    ? `${topPlayer.displayName} gewinnt mit ${topScore} Punkten.`
    : locale === 'en'
      ? `${topPlayer.displayName} wins with ${topScore} points.`
      : `Wygrywa ${topPlayer.displayName} z wynikiem ${topScore}.`;
}

function formatSeriesTitle(series: KangurDuelSeries, locale: KangurMobileLocale): string {
  return formatSeriesBestOfLabel(normalizeSeriesBestOf(series.bestOf), locale);
}

function formatSeriesProgress(
  series: KangurDuelSeries,
  locale: KangurMobileLocale,
): string {
  const gameIndex = Math.min(
    series.bestOf,
    Math.max(1, series.gameIndex),
  );
  return locale === 'de'
    ? `Spiel ${gameIndex} von ${series.bestOf}`
    : locale === 'en'
      ? `Game ${gameIndex} of ${series.bestOf}`
      : `Gra ${gameIndex} z ${series.bestOf}`;
}

function formatLobbySeriesSummary(
  series: KangurDuelSeries,
  locale: KangurMobileLocale,
): string {
  if (series.isComplete) {
    return locale === 'de'
      ? `Serie beendet · abgeschlossene Spiele: ${series.completedGames}`
      : locale === 'en'
        ? `Series complete · completed games: ${series.completedGames}`
        : `Seria zakończona · ukończone gry: ${series.completedGames}`;
  }

  return locale === 'de'
    ? `${formatSeriesProgress(series, locale)} · abgeschlossene Spiele: ${series.completedGames}`
    : locale === 'en'
      ? `${formatSeriesProgress(series, locale)} · completed games: ${series.completedGames}`
      : `${formatSeriesProgress(series, locale)} · ukończone gry: ${series.completedGames}`;
}

function resolveSeriesWins(
  series: KangurDuelSeries,
  learnerId: string,
): number {
  return series.winsByPlayer[learnerId] ?? 0;
}

function formatSeriesSummary(
  series: KangurDuelSeries,
  players: KangurDuelPlayer[],
  locale: KangurMobileLocale,
): string {
  if (players.length === 0) {
    return locale === 'de'
      ? `${series.completedGames} Spiele der Serie wurden abgeschlossen.`
      : locale === 'en'
        ? `${series.completedGames} games in the series have been completed.`
        : `Ukończono ${series.completedGames} gier w serii.`;
  }

  const rankedPlayers = [...players].sort((left, right) => {
    const leftWins = resolveSeriesWins(series, left.learnerId);
    const rightWins = resolveSeriesWins(series, right.learnerId);
    return rightWins - leftWins;
  });
  const leader =
    players.find((player) => player.learnerId === series.leaderLearnerId) ??
    rankedPlayers[0] ??
    null;
  const challenger = rankedPlayers.find(
    (player) => player.learnerId !== leader?.learnerId,
  );

  if (!leader) {
    return locale === 'de'
      ? `${series.completedGames} Spiele der Serie wurden abgeschlossen.`
      : locale === 'en'
        ? `${series.completedGames} games in the series have been completed.`
        : `Ukończono ${series.completedGames} gier w serii.`;
  }

  const leaderWins = resolveSeriesWins(series, leader.learnerId);
  const challengerWins = challenger
    ? resolveSeriesWins(series, challenger.learnerId)
    : 0;

  if (series.isComplete) {
    if (challenger && challengerWins === leaderWins) {
      return locale === 'de'
        ? `Die Serie endete unentschieden ${leaderWins}:${challengerWins}.`
        : locale === 'en'
          ? `The series ended in a ${leaderWins}:${challengerWins} draw.`
          : `Seria zakończona remisem ${leaderWins}:${challengerWins}.`;
    }

    return locale === 'de'
      ? `${leader.displayName} gewinnt die Serie ${leaderWins}:${challengerWins}.`
      : locale === 'en'
        ? `${leader.displayName} wins the series ${leaderWins}:${challengerWins}.`
        : `Serię wygrywa ${leader.displayName} ${leaderWins}:${challengerWins}.`;
  }

  if (leaderWins === 0 && challengerWins === 0) {
    return localizeDuelText(
      {
        de: 'Das erste Spiel der Serie ist noch nicht entschieden.',
        en: 'The first game of the series is still undecided.',
        pl: 'Pierwsza gra serii jeszcze się nie rozstrzygnęła.',
      },
      locale,
    );
  }

  if (challenger && challengerWins === leaderWins) {
    return locale === 'de'
      ? `Die Serie steht ${leaderWins}:${challengerWins} unentschieden.`
      : locale === 'en'
        ? `The series is tied ${leaderWins}:${challengerWins}.`
        : `Seria jest remisowa ${leaderWins}:${challengerWins}.`;
  }

  return locale === 'de'
    ? `${leader.displayName} führt ${leaderWins}:${challengerWins}.`
    : locale === 'en'
      ? `${leader.displayName} leads ${leaderWins}:${challengerWins}.`
      : `Prowadzi ${leader.displayName} ${leaderWins}:${challengerWins}.`;
}

function resolveSessionIdParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = typeof raw === 'string' ? raw.trim() : '';
  return normalized || null;
}

function resolveSpectateParam(value: string | string[] | undefined): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function formatLobbyChatSenderLabel(
  message: KangurDuelLobbyChatMessage,
  activeLearnerId: string | null,
  locale: KangurMobileLocale,
): string {
  return message.senderId === activeLearnerId
    ? localizeDuelText(
        {
          de: 'Du',
          en: 'You',
          pl: 'Ty',
        },
        locale,
      )
    : message.senderName;
}

function LobbyEntryCard({
  action,
  actionLabel,
  description,
  entry,
  locale,
}: {
  action: React.ReactNode;
  actionLabel: string;
  description: string;
  entry: {
    createdAt: string;
    difficulty: KangurDuelDifficulty;
    host: {
      displayName: string;
      learnerId: string;
    };
    mode: KangurDuelMode;
    operation: KangurDuelOperation;
    questionCount: number;
    series?: KangurDuelSeries | null;
    sessionId: string;
    status: KangurDuelStatus;
    timePerQuestionSec: number;
    updatedAt: string;
  };
  locale: KangurMobileLocale;
}): React.JSX.Element {
  return (
    <View
      style={{
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        padding: 14,
        gap: 10,
      }}
    >
      <View style={{ gap: 8 }}>
        <Text style={{ color: '#0f172a', fontSize: 17, fontWeight: '800' }}>
          {entry.host.displayName}
        </Text>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
          {description}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill label={formatModeLabel(entry.mode, locale)} tone={getStatusTone(entry.status)} />
        <Pill
          label={formatOperationLabel(entry.operation, locale)}
          tone={{
            backgroundColor: '#eff6ff',
            borderColor: '#bfdbfe',
            textColor: '#1d4ed8',
          }}
        />
        <Pill
          label={formatDifficultyLabel(entry.difficulty, locale)}
          tone={{
            backgroundColor: '#fffbeb',
            borderColor: '#fde68a',
            textColor: '#b45309',
          }}
        />
        {entry.series ? (
          <Pill
            label={formatSeriesTitle(entry.series, locale)}
            tone={{
              backgroundColor: '#f5f3ff',
              borderColor: '#ddd6fe',
              textColor: '#6d28d9',
            }}
          />
        ) : null}
      </View>

      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {locale === 'de'
          ? `${entry.questionCount} Fragen · ${entry.timePerQuestionSec}s pro Frage · aktualisiert ${formatRelativeAge(entry.updatedAt, locale)}`
          : locale === 'en'
            ? `${entry.questionCount} questions · ${entry.timePerQuestionSec}s per question · updated ${formatRelativeAge(entry.updatedAt, locale)}`
            : `${entry.questionCount} pytań · ${entry.timePerQuestionSec}s na pytanie · aktualizacja ${formatRelativeAge(entry.updatedAt, locale)}`}
      </Text>
      {entry.series ? (
        <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
          {formatLobbySeriesSummary(entry.series, locale)}
        </Text>
      ) : null}

      <View style={{ gap: 8 }}>
        {action}
        <Text style={{ color: '#64748b', fontSize: 12 }}>{actionLabel}</Text>
      </View>
    </View>
  );
}

export function KangurDuelsScreen(): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const params = useLocalSearchParams<{
    join?: string | string[];
    spectate?: string | string[];
    sessionId?: string | string[];
  }>();
  const router = useRouter();
  const {
    isLoadingAuth,
    session: authSession,
    signIn,
    supportsLearnerCredentials,
  } = useKangurMobileAuth();
  const routeSessionId = resolveSessionIdParam(params.sessionId);
  const joinSessionId = routeSessionId
    ? null
    : resolveSessionIdParam(params.join);
  const sessionId = routeSessionId;
  const isSpectatingRoute = resolveSpectateParam(params.spectate);
  const lobby = useKangurMobileDuelsLobby();
  const chat = useKangurMobileDuelLobbyChat();
  const duel = useKangurMobileDuelSession(sessionId, {
    spectate: isSpectatingRoute,
  });
  const attemptedJoinSessionIdRef = useRef<string | null>(null);
  const activeLearnerId =
    authSession.user?.activeLearner?.id ?? authSession.user?.id ?? null;
  const [chatDraft, setChatDraft] = useState('');
  const [chatActionError, setChatActionError] = useState<string | null>(null);
  const [inviteShareError, setInviteShareError] = useState<string | null>(null);
  const [routeJoinError, setRouteJoinError] = useState<string | null>(null);
  const [isJoiningFromRoute, setIsJoiningFromRoute] = useState(false);
  const lobbyChatPreview = chat.messages.slice(-LOBBY_CHAT_PREVIEW_LIMIT);
  const chatRemainingChars = Math.max(0, chat.maxMessageLength - chatDraft.length);
  const canSendChatMessage =
    chat.isAuthenticated &&
    !chat.isSending &&
    chatDraft.trim().length > 0 &&
    chatDraft.trim().length <= chat.maxMessageLength;
  const hasWaitingSession = duel.session
    ? isWaitingSessionStatus(duel.session.status)
    : false;
  const activePlayersCount =
    duel.session?.players.filter((player) => player.status !== 'left').length ?? 0;
  const hasPendingInvitedPlayer =
    duel.session?.players.some((player) => player.status === 'invited') ?? false;
  const isInvitedLearnerMissing = duel.session?.invitedLearnerId
    ? !duel.session.players.some(
        (player) =>
          player.learnerId === duel.session?.invitedLearnerId &&
          player.status !== 'left',
      )
    : false;
  const needsMorePlayersToStart = duel.session
    ? activePlayersCount < (duel.session.minPlayersToStart ?? 2)
    : false;
  const canShareInvite = Boolean(
    duel.session &&
      duel.player &&
      !duel.isSpectating &&
      duel.session.visibility === 'private' &&
      hasWaitingSession &&
      (hasPendingInvitedPlayer || isInvitedLearnerMissing || needsMorePlayersToStart),
  );
  const inviteeName =
    duel.session?.invitedLearnerName?.trim() ||
    copy({
      de: 'der zweiten Person',
      en: 'the other player',
      pl: 'drugiej osoby',
    });

  const createLoginCallToAction = (label: string): React.JSX.Element =>
    supportsLearnerCredentials ? (
      <LinkButton href={HOME_ROUTE} label={label} stretch tone='primary' />
    ) : (
      <ActionButton label={label} onPress={signIn} stretch />
    );

  const openSession = (nextSessionId: string): void => {
    router.replace(createKangurDuelsHref({ sessionId: nextSessionId }));
  };

  const openLobby = (): void => {
    router.replace(createKangurDuelsHref());
  };

  const handleRematch = async (): Promise<void> => {
    if (!duel.session || duel.isSpectating) {
      return;
    }

    const nextSeriesBestOf = normalizeSeriesBestOf(duel.session.series?.bestOf);
    const overrides = {
      difficulty: duel.session.difficulty,
      operation: duel.session.operation,
      seriesBestOf: nextSeriesBestOf,
    } as const;

    if (duel.session.visibility === 'private') {
      const opponentLearnerId =
        duel.session.players.find((player) => player.learnerId !== activeLearnerId)
          ?.learnerId ?? null;

      if (!opponentLearnerId) {
        return;
      }

      const nextSessionId = await lobby.createPrivateChallenge(
        opponentLearnerId,
        overrides,
      );
      if (nextSessionId) {
        openSession(nextSessionId);
      }
      return;
    }

    const nextSessionId =
      duel.session.mode === 'quick_match'
        ? await lobby.createQuickMatch(overrides)
        : await lobby.createPublicChallenge(overrides);
    if (nextSessionId) {
      openSession(nextSessionId);
    }
  };

  const handleInviteShare = async (): Promise<void> => {
    if (!duel.session || !duel.player || duel.isSpectating) {
      return;
    }

    setInviteShareError(null);

    try {
      await shareKangurDuelInvite({
        locale,
        sessionId: duel.session.id,
        sharerDisplayName: duel.player.displayName,
      });
    } catch (error) {
      setInviteShareError(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : copy({
              de: 'Der Einladungslink konnte nicht geteilt werden.',
              en: 'Could not share the invite link.',
              pl: 'Nie udało się udostępnić linku do zaproszenia.',
            }),
      );
    }
  };

  const joinSessionFromRoute = async (): Promise<void> => {
    if (!joinSessionId) {
      return;
    }

    setRouteJoinError(null);
    setIsJoiningFromRoute(true);

    try {
      const nextSessionId = await lobby.joinDuel(joinSessionId);
      if (nextSessionId) {
        openSession(nextSessionId);
        return;
      }

      setRouteJoinError(
        lobby.actionError ??
          copy({
            de: 'Der Duell-Einladung konnte nicht beigetreten werden.',
            en: 'Could not join the duel invite.',
            pl: 'Nie udało się dołączyć do zaproszenia do pojedynku.',
          }),
      );
    } finally {
      setIsJoiningFromRoute(false);
    }
  };

  useEffect(() => {
    if (!joinSessionId || routeSessionId || isSpectatingRoute) {
      return;
    }

    if (!lobby.isAuthenticated || lobby.isLoadingAuth) {
      return;
    }

    if (attemptedJoinSessionIdRef.current === joinSessionId) {
      return;
    }

    attemptedJoinSessionIdRef.current = joinSessionId;
    void joinSessionFromRoute();
  }, [
    isSpectatingRoute,
    joinSessionId,
    lobby.isAuthenticated,
    lobby.isLoadingAuth,
    routeSessionId,
  ]);

  const handleLobbyChatSend = async (): Promise<void> => {
    setChatActionError(null);

    const didSend = await chat.sendMessage(chatDraft);
    if (didSend) {
      setChatDraft('');
      return;
    }

    setChatActionError(
      copy({
        de: 'Die Nachricht konnte nicht in den Lobby-Chat gesendet werden.',
        en: 'Could not send the message to the lobby chat.',
        pl: 'Nie udało się wysłać wiadomości do czatu lobby.',
      }),
    );
  };

  const renderJoinAction = (targetSessionId: string): React.JSX.Element =>
    lobby.isAuthenticated ? (
      <ActionButton
        label={copy({
          de: 'Duell beitreten',
          en: 'Join duel',
          pl: 'Dołącz do pojedynku',
        })}
        onPress={async () => {
          const nextSessionId = await lobby.joinDuel(targetSessionId);
          if (nextSessionId) {
            openSession(nextSessionId);
          }
        }}
        stretch
      />
    ) : (
      createLoginCallToAction(
        copy({
          de: 'Anmelden, um beizutreten',
          en: 'Sign in to join',
          pl: 'Zaloguj, aby dołączyć',
        }),
      )
    );

  const renderSpectateAction = (targetSessionId: string): React.JSX.Element => (
    <LinkButton
      href={createKangurDuelsHref({ sessionId: targetSessionId, spectate: true })}
      label={copy({
        de: 'Duell beobachten',
        en: 'Watch duel',
        pl: 'Obserwuj pojedynek',
      })}
      stretch
      tone='secondary'
    />
  );

  if (joinSessionId && !routeSessionId && !isSpectatingRoute) {
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
            <ActionButton
              label={copy({
                de: 'Zurück zur Lobby',
                en: 'Back to lobby',
                pl: 'Wróć do lobby',
              })}
              onPress={openLobby}
              tone='ghost'
            />
            <SectionTitle
              title={copy({
                de: 'Einladung beitreten',
                en: 'Joining invite',
                pl: 'Dołączanie do zaproszenia',
              })}
              subtitle={copy({
                de: 'Ein Link mit dem Parameter join akzeptiert eine private Einladung und öffnet danach die aktive Duellsitzung.',
                en: 'A link with the join parameter accepts a private invite and then opens the active duel session.',
                pl: 'Link z parametrem join przyjmuje prywatne zaproszenie i po powodzeniu otwiera aktywną sesję pojedynku.',
              })}
            />
          </View>

          {!lobby.isAuthenticated && !lobby.isLoadingAuth ? (
            <Card>
              <MessageCard
                title={copy({
                  de: 'Lernenden-Sitzung anmelden',
                  en: 'Sign in the learner session',
                  pl: 'Zaloguj sesję ucznia',
                })}
                description={copy({
                  de: 'Eine private Duell-Einladung erfordert eine aktive Lernenden-Sitzung.',
                  en: 'A private duel invite requires an active learner session.',
                  pl: 'Prywatne zaproszenie do pojedynku wymaga aktywnej sesji ucznia.',
                })}
              />
              {createLoginCallToAction(
                copy({
                  de: 'Zum Login',
                  en: 'Go to sign in',
                  pl: 'Przejdź do logowania',
                }),
              )}
            </Card>
          ) : isJoiningFromRoute || lobby.isActionPending ? (
            <Card>
              <MessageCard
                title={copy({
                  de: 'Duellbeitritt läuft',
                  en: 'Joining duel',
                  pl: 'Dołączamy do pojedynku',
                })}
                description={copy({
                  de: 'Die private Einladung wird akzeptiert und der vollständige Sitzungsstatus geladen.',
                  en: 'Accepting the private invite and loading the full session state.',
                  pl: 'Akceptujemy prywatne zaproszenie i pobieramy pełny stan sesji.',
                })}
              />
            </Card>
          ) : routeJoinError || lobby.actionError ? (
            <Card>
              <MessageCard
                title={copy({
                  de: 'Einladung konnte nicht angenommen werden',
                  en: 'Could not accept the invite',
                  pl: 'Nie udało się przyjąć zaproszenia',
                })}
                description={
                  routeJoinError ??
                  lobby.actionError ??
                  copy({
                    de: 'Versuche es erneut oder kehre zur Duell-Lobby zurück.',
                    en: 'Try again or go back to the duels lobby.',
                    pl: 'Spróbuj ponownie albo wróć do lobby pojedynków.',
                  })
                }
                tone='error'
              />
              <View style={{ gap: 8 }}>
                <ActionButton
                  label={copy({
                    de: 'Erneut versuchen',
                    en: 'Try again',
                    pl: 'Spróbuj ponownie',
                  })}
                  onPress={joinSessionFromRoute}
                  stretch
                />
                <ActionButton
                  label={copy({
                    de: 'Zurück zur Lobby',
                    en: 'Back to lobby',
                    pl: 'Wróć do lobby',
                  })}
                  onPress={openLobby}
                  stretch
                  tone='secondary'
                />
              </View>
            </Card>
          ) : (
            <Card>
              <MessageCard
                title={copy({
                  de: 'Sitzung wird vorbereitet',
                  en: 'Preparing session',
                  pl: 'Przygotowujemy sesję',
                })}
                description={copy({
                  de: 'Wenn der Link korrekt ist, öffnet sich gleich der Duellbildschirm.',
                  en: 'If the link is correct, the duel screen will open shortly.',
                  pl: 'Jeśli link jest poprawny, za chwilę otworzy się ekran pojedynku.',
                })}
              />
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (sessionId) {
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
            <ActionButton
              label={copy({
                de: 'Zurück zur Lobby',
                en: 'Back to lobby',
                pl: 'Wróć do lobby',
              })}
              onPress={openLobby}
              tone='ghost'
            />
            <SectionTitle
              title={
                duel.isSpectating
                  ? copy({
                      de: 'Duellansicht',
                      en: 'Duel view',
                      pl: 'Podgląd pojedynku',
                    })
                  : copy({
                      de: 'Duell',
                      en: 'Duel',
                      pl: 'Pojedynek',
                    })
              }
              subtitle={
                duel.isSpectating
                  ? copy({
                      de: 'Der Zuschauermodus zeigt den öffentlichen Duellstatus und Reaktionen, ohne dem Match als Spieler beizutreten.',
                      en: 'Spectator mode shows the public duel state and reactions without joining the match as a player.',
                      pl: 'Tryb obserwatora pokazuje publiczny stan pojedynku i reakcje bez dołączania do meczu jako gracz.',
                    })
                  : copy({
                      de: 'Der mobile Duellbildschirm zeigt Warteraum, Spielerfortschritt und Rundenstatus auf denselben Duels-Verträgen wie das Web.',
                      en: 'The mobile duel screen shows the waiting room, player progress, and round state using the same duels contracts as the web app.',
                      pl: 'Mobilny ekran pojedynku pokazuje poczekalnię, postęp gracza i stan rundy na tych samych kontraktach duels co web.',
                    })
              }
            />
          </View>

          {!duel.isSpectating && !duel.isAuthenticated && !isLoadingAuth ? (
            <Card>
              <MessageCard
                title={copy({
                  de: 'Lernenden-Sitzung anmelden',
                  en: 'Sign in the learner session',
                  pl: 'Zaloguj sesję ucznia',
                })}
                description={copy({
                  de: 'Um dieses konkrete Duell zu öffnen, ist eine aktive Lernenden-Sitzung erforderlich.',
                  en: 'An active learner session is required to open this duel.',
                  pl: 'Do otwarcia konkretnego pojedynku potrzebna jest aktywna sesja ucznia.',
                })}
              />
              {createLoginCallToAction(
                copy({
                  de: 'Zum Login',
                  en: 'Go to sign in',
                  pl: 'Przejdź do logowania',
                }),
              )}
            </Card>
          ) : duel.isLoading ? (
            <Card>
              <MessageCard
                title={
                  duel.isSpectating
                    ? copy({
                        de: 'Duellansicht wird geladen',
                        en: 'Loading duel view',
                        pl: 'Ładujemy podgląd pojedynku',
                      })
                    : copy({
                        de: 'Duell wird geladen',
                        en: 'Loading duel',
                        pl: 'Ładujemy pojedynek',
                      })
                }
                description={
                  duel.isRestoringAuth
                    ? copy({
                        de: 'Die Lernenden-Sitzung und der Status des aktiven Duells werden wiederhergestellt.',
                        en: 'Restoring the learner session and the active duel state.',
                        pl: 'Przywracamy sesję ucznia i stan aktywnego pojedynku.',
                      })
                    : duel.isSpectating
                      ? copy({
                          de: 'Der öffentliche Rundenstatus, die Spielerliste und die Zahl der Zuschauer werden geladen.',
                          en: 'Loading the public round state, player list, and spectator count.',
                          pl: 'Pobieramy publiczny stan rundy, listę graczy i liczbę widzów.',
                        })
                      : copy({
                          de: 'Der aktuelle Rundenstatus und die Spielerliste werden geladen.',
                          en: 'Loading the current round state and player list.',
                          pl: 'Pobieramy aktualny stan rundy i listę graczy.',
                        })
                }
              />
            </Card>
          ) : duel.error || !duel.session || (!duel.isSpectating && !duel.player) ? (
            <Card>
              <MessageCard
                title={
                  duel.isSpectating
                    ? copy({
                        de: 'Duellansicht konnte nicht geöffnet werden',
                        en: 'Could not open the duel view',
                        pl: 'Nie udało się otworzyć podglądu pojedynku',
                      })
                    : copy({
                        de: 'Duell konnte nicht geöffnet werden',
                        en: 'Could not open the duel',
                        pl: 'Nie udało się otworzyć pojedynku',
                      })
                }
                description={
                  duel.error ??
                  (duel.isSpectating
                    ? copy({
                        de: 'Es fehlen Daten für die öffentliche Ansicht. Kehre zur Lobby zurück und versuche es erneut.',
                        en: 'The public view data is missing. Go back to the lobby and try again.',
                        pl: 'Brakuje danych publicznego podglądu. Wróć do lobby i spróbuj jeszcze raz.',
                      })
                    : copy({
                        de: 'Es fehlen Duelldaten. Kehre zur Lobby zurück und versuche es erneut.',
                        en: 'The duel data is missing. Go back to the lobby and try again.',
                        pl: 'Brakuje danych pojedynku. Wróć do lobby i spróbuj jeszcze raz.',
                      }))
                }
                tone='error'
              />
              <ActionButton
                label={copy({
                  de: 'Zurück zur Lobby',
                  en: 'Back to lobby',
                  pl: 'Wróć do lobby',
                })}
                onPress={openLobby}
                stretch
              />
            </Card>
          ) : (
            <>
              <Card>
                <View style={{ gap: 10 }}>
                  <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                    {copy({
                      de: `Sitzung ${duel.session.id}`,
                      en: `Session ${duel.session.id}`,
                      pl: `Sesja ${duel.session.id}`,
                    })}
                  </Text>
                  <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                    {formatModeLabel(duel.session.mode, locale)} ·{' '}
                    {formatOperationLabel(duel.session.operation, locale)}
                  </Text>
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {locale === 'de'
                      ? `${duel.session.questionCount} Fragen · ${duel.session.timePerQuestionSec}s pro Antwort · ${formatDifficultyLabel(duel.session.difficulty, locale)}`
                      : locale === 'en'
                        ? `${duel.session.questionCount} questions · ${duel.session.timePerQuestionSec}s per answer · ${formatDifficultyLabel(duel.session.difficulty, locale)}`
                        : `${duel.session.questionCount} pytań · ${duel.session.timePerQuestionSec}s na odpowiedź · ${formatDifficultyLabel(duel.session.difficulty, locale)}`}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Pill
                    label={formatStatusLabel(duel.session.status, locale)}
                    tone={getStatusTone(duel.session.status)}
                  />
                  <Pill
                    label={
                      duel.session.visibility === 'private'
                        ? copy({
                            de: 'Privat',
                            en: 'Private',
                            pl: 'Prywatny',
                          })
                        : copy({
                            de: 'Öffentlich',
                            en: 'Public',
                            pl: 'Publiczny',
                          })
                    }
                    tone={{
                      backgroundColor: '#f8fafc',
                      borderColor: '#cbd5e1',
                      textColor: '#475569',
                    }}
                  />
                  <Pill
                    label={
                      duel.player
                        ? formatQuestionProgress(duel.session, duel.player, locale)
                        : formatSpectatorQuestionProgress(duel.session, locale)
                    }
                    tone={{
                      backgroundColor: '#eff6ff',
                      borderColor: '#bfdbfe',
                      textColor: '#1d4ed8',
                    }}
                  />
                  {duel.isSpectating || duel.spectatorCount > 0 ? (
                    <Pill
                      label={copy({
                        de: `Zuschauer ${duel.spectatorCount}`,
                        en: `Audience ${duel.spectatorCount}`,
                        pl: `Widownia ${duel.spectatorCount}`,
                      })}
                      tone={{
                        backgroundColor: '#f5f3ff',
                        borderColor: '#ddd6fe',
                        textColor: '#6d28d9',
                      }}
                    />
                  ) : null}
                  {duel.session.series ? (
                    <Pill
                      label={formatSeriesTitle(duel.session.series, locale)}
                      tone={{
                        backgroundColor: '#f5f3ff',
                        borderColor: '#ddd6fe',
                        textColor: '#6d28d9',
                      }}
                    />
                  ) : null}
                </View>

                {duel.isSpectating ? (
                  <MessageCard
                    title={copy({
                      de: 'Zuschauermodus',
                      en: 'Spectator mode',
                      pl: 'Tryb obserwatora',
                    })}
                    description={
                      duel.isAuthenticated
                        ? copy({
                            de: 'Du beobachtest den öffentlichen Duellstatus. Du kannst Reaktionen senden, beantwortest aber keine Fragen.',
                            en: 'You are watching the public duel state. You can send reactions, but you do not answer questions.',
                            pl: 'Obserwujesz publiczny stan pojedynku. Możesz wysyłać reakcje, ale nie odpowiadasz na pytania.',
                          })
                        : copy({
                            de: 'Du beobachtest den öffentlichen Duellstatus. Melde eine Lernenden-Sitzung an, wenn du Reaktionen senden möchtest.',
                            en: 'You are watching the public duel state. Sign in the learner session if you want to send reactions.',
                            pl: 'Obserwujesz publiczny stan pojedynku. Zaloguj sesję ucznia, jeśli chcesz wysyłać reakcje.',
                          })
                    }
                  />
                ) : null}

                {duel.actionError ? (
                  <MessageCard
                    title={copy({
                      de: 'Aktion fehlgeschlagen',
                      en: 'Action failed',
                      pl: 'Akcja nie powiodła się',
                    })}
                    description={duel.actionError}
                    tone='error'
                  />
                ) : null}
              </Card>

              {duel.session.series ? (
                <Card>
                  <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                    {copy({
                      de: 'Serie',
                      en: 'Series',
                      pl: 'Seria',
                    })}
                  </Text>
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {formatSeriesProgress(duel.session.series, locale)}
                  </Text>
                  <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
                    {formatSeriesSummary(duel.session.series, duel.session.players, locale)}
                  </Text>
                </Card>
              ) : null}

              <Card>
                <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                  {copy({
                    de: 'Spieler',
                    en: 'Players',
                    pl: 'Gracze',
                  })}
                </Text>
                <View style={{ gap: 10 }}>
                  {duel.session.players.map((player) => (
                    <View
                      key={player.learnerId}
                      style={{
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor:
                          player.learnerId === duel.player?.learnerId ? '#bfdbfe' : '#e2e8f0',
                        backgroundColor:
                          player.learnerId === duel.player?.learnerId ? '#eff6ff' : '#f8fafc',
                        gap: 8,
                        padding: 14,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                          {player.displayName}
                        </Text>
                        <Pill
                          label={formatPlayerStatusLabel(player.status, locale)}
                          tone={getPlayerStatusTone(player.status)}
                        />
                      </View>
                      <Text style={{ color: '#475569', lineHeight: 20 }}>
                        {locale === 'de'
                          ? `Punktzahl ${player.score}${player.bonusPoints ? ` + ${player.bonusPoints} Bonus` : ''} · ${formatQuestionProgress(duel.session!, player, locale)}`
                          : locale === 'en'
                            ? `Score ${player.score}${player.bonusPoints ? ` + ${player.bonusPoints} bonus` : ''} · ${formatQuestionProgress(duel.session!, player, locale)}`
                            : `Wynik ${player.score}${player.bonusPoints ? ` + ${player.bonusPoints} bonus` : ''} · ${formatQuestionProgress(duel.session!, player, locale)}`}
                      </Text>
                      {duel.session!.series ? (
                        <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 18 }}>
                          {copy({
                            de: 'Gewonnene Spiele in der Serie:',
                            en: 'Series games won:',
                            pl: 'Wygrane gry w serii:',
                          })}{' '}
                          {resolveSeriesWins(duel.session!.series, player.learnerId)}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              </Card>

              <Card>
                <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                  {copy({
                    de: 'Reaktionen',
                    en: 'Reactions',
                    pl: 'Reakcje',
                  })}
                </Text>
                {duel.session.status === 'completed' || duel.session.status === 'aborted' ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Die Sitzung ist beendet, aber die letzten Reaktionen bleiben in der Duellhistorie sichtbar.',
                      en: 'The session is finished, but the latest reactions remain visible in the duel history.',
                      pl: 'Sesja jest zakończona, ale ostatnie reakcje zostają widoczne w historii pojedynku.',
                    })}
                  </Text>
                ) : !duel.isAuthenticated ? (
                  <MessageCard
                    title={copy({
                      de: 'Reaktionen nur für angemeldete Nutzer',
                      en: 'Reactions for signed-in users',
                      pl: 'Reakcje dla zalogowanych',
                    })}
                    description={copy({
                      de: 'Ein angemeldeter Lernender kann live mit Emojis auf den Duellverlauf reagieren.',
                      en: 'A signed-in learner can react to the duel live with emoji.',
                      pl: 'Zalogowany uczeń może reagować na przebieg pojedynku emotkami na żywo.',
                    })}
                  />
                ) : (
                  <>
                    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                      {duel.isSpectating
                        ? copy({
                            de: 'Sende eine schnelle Reaktion, während du das Duell beobachtest.',
                            en: 'Send a quick reaction while watching the duel.',
                            pl: 'Wyślij szybką reakcję podczas oglądania pojedynku.',
                          })
                        : copy({
                            de: 'Sende eine schnelle Reaktion, ohne das Duell zu verlassen.',
                            en: 'Send a quick reaction without leaving the duel.',
                            pl: 'Wyślij szybką reakcję bez opuszczania pojedynku.',
                          })}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {DUEL_REACTION_OPTIONS.map((type) => (
                        <ActionButton
                          key={type}
                          disabled={duel.isMutating}
                          label={formatReactionLabel(type, locale)}
                          onPress={async () => {
                            await duel.sendReaction(type);
                          }}
                          tone='secondary'
                        />
                      ))}
                    </View>
                  </>
                )}

                {duel.session.recentReactions?.length ? (
                  <View style={{ gap: 10 }}>
                    {duel.session.recentReactions
                      .slice(-6)
                      .reverse()
                      .map((reaction) => (
                        <View
                          key={reaction.id}
                          style={{
                            borderRadius: 18,
                            borderWidth: 1,
                            borderColor:
                              reaction.learnerId === duel.player?.learnerId
                                ? '#bfdbfe'
                                : '#e2e8f0',
                            backgroundColor:
                              reaction.learnerId === duel.player?.learnerId
                                ? '#eff6ff'
                                : '#f8fafc',
                            gap: 6,
                            padding: 12,
                          }}
                        >
                          <Text
                            style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}
                          >
                            {formatReactionLabel(reaction.type, locale)}
                          </Text>
                          <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
                            {reaction.displayName} · {formatRelativeAge(reaction.createdAt, locale)}
                          </Text>
                        </View>
                      ))}
                  </View>
                ) : (
                  <MessageCard
                    title={copy({
                      de: 'Keine Reaktionen',
                      en: 'No reactions',
                      pl: 'Brak reakcji',
                    })}
                    description={copy({
                      de: 'Nach dem ersten Emoji erscheint die Reaktionshistorie hier.',
                      en: 'After the first emoji, the reaction history will appear here.',
                      pl: 'Po pierwszej emotce historia reakcji pojawi się tutaj.',
                    })}
                  />
                )}
              </Card>

              {hasWaitingSession ? (
                <Card>
                  <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                    {duel.isSpectating
                      ? copy({
                          de: 'Warteraum des öffentlichen Duells',
                          en: 'Public duel waiting room',
                          pl: 'Poczekalnia publicznego pojedynku',
                        })
                      : copy({
                          de: 'Duell-Warteraum',
                          en: 'Duel waiting room',
                          pl: 'Poczekalnia pojedynku',
                        })}
                  </Text>
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {duel.isSpectating
                      ? copy({
                          de: 'Du beobachtest die Wartephase. Sobald die benötigten Spieler beigetreten sind, wechselt die Ansicht automatisch zur aktiven Runde.',
                          en: 'You are watching the waiting phase. Once the required players join, the view will switch automatically to the active round.',
                          pl: 'Obserwujesz etap oczekiwania. Gdy wymagani gracze dołączą, podgląd przełączy się automatycznie do aktywnej rundy.',
                        })
                      : copy({
                          de: 'Wir warten, bis alle Spieler beitreten und das Backend die Sitzung in die aktive Runde umschaltet. Wenn die zweite Person in der Lobby erscheint, aktualisiert sich der Bildschirm automatisch.',
                          en: 'Waiting for all players to join so the backend can switch the session to the active round. When the second player appears in the lobby, the screen will refresh automatically.',
                          pl: 'Czekamy, aż wszyscy gracze dołączą i backend przełączy sesję do aktywnej rundy. Gdy druga osoba pojawi się w lobby, ekran odświeży się automatycznie.',
                        })}
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                    {copy({
                      de: `Minimale Spielerzahl zum Start: ${duel.session.minPlayersToStart ?? 2}`,
                      en: `Minimum players to start: ${duel.session.minPlayersToStart ?? 2}`,
                      pl: `Minimalna liczba graczy do startu: ${duel.session.minPlayersToStart ?? 2}`,
                    })}
                  </Text>
                  {canShareInvite ? (
                    <View style={{ gap: 8 }}>
                      <MessageCard
                        title={copy({
                          de: 'Einladung teilen',
                          en: 'Share invite',
                          pl: 'Udostępnij zaproszenie',
                        })}
                        description={copy({
                          de: `Sende ${inviteeName} einen direkten Link, um das private Duell auf dem Handy zu öffnen, ohne in der Lobby zu suchen.`,
                          en: `Send a direct link to ${inviteeName} to open the private duel on mobile without searching in the lobby.`,
                          pl: `Wyślij bezpośredni link do ${inviteeName}, aby otworzyć prywatny pojedynek na telefonie bez szukania go w lobby.`,
                        })}
                      />
                      <ActionButton
                        label={copy({
                          de: 'Einladungslink teilen',
                          en: 'Share invite link',
                          pl: 'Udostępnij link zaproszenia',
                        })}
                        onPress={handleInviteShare}
                        stretch
                        tone='secondary'
                      />
                      {inviteShareError ? (
                        <MessageCard
                          title={copy({
                            de: 'Einladung konnte nicht geteilt werden',
                            en: 'Could not share the invite',
                            pl: 'Nie udało się udostępnić zaproszenia',
                          })}
                          description={inviteShareError}
                          tone='error'
                        />
                      ) : null}
                    </View>
                  ) : null}
                </Card>
              ) : null}

              {duel.session.status === 'in_progress' && duel.currentQuestion ? (
                <Card>
                  <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                    {duel.isSpectating
                      ? copy({
                          de: 'Fragenansicht',
                          en: 'Question view',
                          pl: 'Podgląd pytania',
                        })
                      : copy({
                          de: 'Aktuelle Frage',
                          en: 'Current question',
                          pl: 'Aktualne pytanie',
                        })}
                  </Text>
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 22 }}>
                    {duel.currentQuestion.prompt}
                  </Text>
                  {duel.isSpectating ? (
                    <>
                      <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 18 }}>
                        {copy({
                          de: 'Zuschauer senden keine Antworten, können aber Frage und Spieltempo verfolgen.',
                          en: 'Spectators do not send answers, but they can follow the question and match pace.',
                          pl: 'Widz nie wysyła odpowiedzi, ale może śledzić pytanie i tempo meczu.',
                        })}
                      </Text>
                      <View style={{ gap: 8 }}>
                        {duel.currentQuestion.choices.map((choice, index) => (
                          <View
                            key={`spectator-choice-${index}-${String(choice)}`}
                            style={{
                              borderRadius: 18,
                              borderWidth: 1,
                              borderColor: '#e2e8f0',
                              backgroundColor: '#f8fafc',
                              padding: 12,
                            }}
                          >
                            <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                              {copy({
                                de: `Option ${index + 1}: ${String(choice)}`,
                                en: `Option ${index + 1}: ${String(choice)}`,
                                pl: `Opcja ${index + 1}: ${String(choice)}`,
                              })}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {duel.currentQuestion.choices.map((choice, index) => (
                        <ActionButton
                          key={`duel-choice-${index}-${String(choice)}`}
                          disabled={duel.isMutating}
                          label={copy({
                            de: `Antwort: ${String(choice)}`,
                            en: `Answer: ${String(choice)}`,
                            pl: `Odpowiedź: ${String(choice)}`,
                          })}
                          onPress={async () => {
                            await duel.submitAnswer(choice as KangurDuelChoice);
                          }}
                          stretch
                          tone='secondary'
                        />
                      ))}
                    </View>
                  )}
                </Card>
              ) : null}

              {duel.session.status === 'completed' || duel.session.status === 'aborted' ? (
                <Card>
                  <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                    {copy({
                      de: 'Zusammenfassung',
                      en: 'Summary',
                      pl: 'Podsumowanie',
                    })}
                  </Text>
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {resolveWinnerSummary(duel.session.players, locale)}
                  </Text>
                  {!duel.isSpectating && duel.isAuthenticated ? (
                    <View style={{ gap: 8 }}>
                      <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 18 }}>
                        {copy({
                          de: 'Das Rückspiel behält denselben Modus, dieselbe Rechenart, denselben Schwierigkeitsgrad und dasselbe Serienformat.',
                          en: 'The rematch will keep the same mode, operation, difficulty, and series format.',
                          pl: 'Rewanż zachowa ten sam tryb, działanie, poziom i format serii.',
                        })}
                      </Text>
                      <ActionButton
                        disabled={lobby.isActionPending}
                        label={copy({
                          de: 'Rückspiel starten',
                          en: 'Play rematch',
                          pl: 'Zagraj rewanż',
                        })}
                        onPress={handleRematch}
                        stretch
                      />
                    </View>
                  ) : null}
                </Card>
              ) : null}

              <Card>
                <View style={{ gap: 8 }}>
                  <ActionButton
                    disabled={duel.isMutating}
                    label={
                      duel.isSpectating
                        ? copy({
                            de: 'Duellansicht aktualisieren',
                            en: 'Refresh duel view',
                            pl: 'Odśwież podgląd pojedynku',
                          })
                        : copy({
                            de: 'Duellstatus aktualisieren',
                            en: 'Refresh duel state',
                            pl: 'Odśwież stan pojedynku',
                          })
                    }
                    onPress={duel.refresh}
                    stretch
                    tone='secondary'
                  />
                  {duel.isSpectating ? (
                    <ActionButton
                      label={copy({
                        de: 'Zurück zur Lobby',
                        en: 'Back to lobby',
                        pl: 'Wróć do lobby',
                      })}
                      onPress={openLobby}
                      stretch
                    />
                  ) : (
                    <ActionButton
                      disabled={duel.isMutating}
                      label={copy({
                        de: 'Duell verlassen',
                        en: 'Leave duel',
                        pl: 'Opuść pojedynek',
                      })}
                      onPress={async () => {
                        const didLeave = await duel.leaveSession();
                        if (didLeave) {
                          openLobby();
                        }
                      }}
                      stretch
                    />
                  )}
                </View>
              </Card>

              <LessonCheckpointsCard context='session' />
              <LessonMasteryCard context='session' />
              <NextStepsCard context='session' />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fffaf2' }}>
      <ScrollView
        keyboardShouldPersistTaps='handled'
        contentContainerStyle={{
          gap: 18,
          paddingHorizontal: 20,
          paddingVertical: 24,
        }}
      >
        <View style={{ gap: 14 }}>
          <LinkButton
            href={HOME_ROUTE}
            label={copy({
              de: 'Zurück',
              en: 'Back',
              pl: 'Wróć',
            })}
            tone='secondary'
          />
          <SectionTitle
            title={copy({
              de: 'Duelle',
              en: 'Duels',
              pl: 'Pojedynki',
            })}
            subtitle={copy({
              de: 'Die mobile Duell-Lobby nutzt dieselben Kangur-Duels-Verträge und Endpunkte wie die Webversion.',
              en: 'The mobile duels lobby uses the same Kangur duels contracts and endpoints as the web version.',
              pl: 'Mobilne lobby pojedynków korzysta z tych samych kontraktów i endpointów Kangur duels co wersja webowa.',
            })}
          />
        </View>

        {!lobby.isAuthenticated && !lobby.isLoadingAuth ? (
          <Card>
            <MessageCard
              title={copy({
                de: 'Lernenden-Sitzung anmelden',
                en: 'Sign in the learner session',
                pl: 'Zaloguj sesję ucznia',
              })}
              description={copy({
                de: 'Gäste können die öffentliche Lobby und Rangliste ansehen. Zum Erstellen oder Beitreten von Duellen ist eine aktive Lernenden-Sitzung nötig.',
                en: 'Guests can browse the public lobby and leaderboard. Creating or joining duels requires an active learner session.',
                pl: 'Goście mogą przeglądać publiczne lobby i ranking. Do tworzenia lub dołączania do pojedynków potrzebna jest aktywna sesja ucznia.',
              })}
            />
            {createLoginCallToAction(
              copy({
                de: 'Zum Login',
                en: 'Go to sign in',
                pl: 'Przejdź do logowania',
              }),
            )}
          </Card>
        ) : null}

        <Card>
          <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
            {copy({
              de: 'Spielbereich',
              en: 'Play panel',
              pl: 'Panel gry',
            })}
          </Text>
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
            {copy({
              de: 'Wähle Rechenart, Spielmodus und Schwierigkeitsgrad für das neue Duell.',
              en: 'Choose the operation, mode, and difficulty for the new duel.',
              pl: 'Wybierz działanie, tryb działań i poziom trudności dla nowego pojedynku.',
            })}
          </Text>

          <View style={{ gap: 8 }}>
            <Text style={{ color: '#0f172a', fontWeight: '700' }}>
              {copy({
                de: 'Rechenart',
                en: 'Operation',
                pl: 'Działanie',
              })}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {OPERATION_OPTIONS.map((option) => (
                <FilterChip
                  key={option}
                  label={formatOperationLabel(option, locale)}
                  onPress={() => {
                    lobby.setOperation(option);
                  }}
                  selected={lobby.operation === option}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ color: '#0f172a', fontWeight: '700' }}>
              {copy({
                de: 'Schwierigkeit',
                en: 'Difficulty',
                pl: 'Poziom',
              })}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {DIFFICULTY_OPTIONS.map((option) => (
                <FilterChip
                  key={option}
                  label={formatDifficultyLabel(option, locale)}
                  onPress={() => {
                    lobby.setDifficulty(option);
                  }}
                  selected={lobby.difficulty === option}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ color: '#0f172a', fontWeight: '700' }}>
              {copy({
                de: 'Format',
                en: 'Format',
                pl: 'Format',
              })}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SERIES_BEST_OF_OPTIONS.map((option) => (
                <FilterChip
                  key={`series-best-of-${option}`}
                  label={formatSeriesBestOfLabel(option, locale)}
                  onPress={() => {
                    lobby.setSeriesBestOf(option);
                  }}
                  selected={lobby.seriesBestOf === option}
                />
              ))}
            </View>
            <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 18 }}>
              {lobby.seriesBestOf === 1
                ? copy({
                    de: 'Neue Herausforderungen erstellen ein einzelnes Match.',
                    en: 'New challenges will create a single match.',
                    pl: 'Nowe wyzwania utworzą pojedynczy mecz.',
                  })
                : copy({
                    de: `Neue Herausforderungen erstellen ${formatSeriesBestOfLabel(lobby.seriesBestOf, locale)}.`,
                    en: `New challenges will create ${formatSeriesBestOfLabel(lobby.seriesBestOf, locale)}.`,
                    pl: `Nowe wyzwania utworzą ${formatSeriesBestOfLabel(lobby.seriesBestOf, locale)}.`,
                  })}
            </Text>
          </View>

          {lobby.actionError ? (
            <MessageCard
              title={copy({
                de: 'Aktion fehlgeschlagen',
                en: 'Action failed',
                pl: 'Akcja nie powiodła się',
              })}
              description={lobby.actionError}
              tone='error'
            />
          ) : null}

          {lobby.isAuthenticated ? (
            <View style={{ gap: 8 }}>
              <ActionButton
                disabled={lobby.isActionPending}
                label={copy({
                  de: 'Schnelles Match',
                  en: 'Quick match',
                  pl: 'Szybki mecz',
                })}
                onPress={async () => {
                  const nextSessionId = await lobby.createQuickMatch();
                  if (nextSessionId) {
                    openSession(nextSessionId);
                  }
                }}
                stretch
              />
              <ActionButton
                disabled={lobby.isActionPending}
                label={copy({
                  de: 'Öffentliche Herausforderung',
                  en: 'Public challenge',
                  pl: 'Publiczne wyzwanie',
                })}
                onPress={async () => {
                  const nextSessionId = await lobby.createPublicChallenge();
                  if (nextSessionId) {
                    openSession(nextSessionId);
                  }
                }}
                stretch
                tone='secondary'
              />
            </View>
          ) : (
            createLoginCallToAction(
              copy({
                de: 'Anmelden, um ein Duell zu starten',
                en: 'Sign in to start a duel',
                pl: 'Zaloguj, aby rozpocząć pojedynek',
              }),
            )
          )}
        </Card>

        <Card>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                {copy({
                  de: 'Lobby',
                  en: 'Lobby',
                  pl: 'Lobby',
                })}
              </Text>
              <Text style={{ color: '#64748b', fontSize: 13 }}>
                {copy({
                  de: `Sichtbare öffentliche Räume: ${lobby.visiblePublicEntries.length}`,
                  en: `Visible public rooms: ${lobby.visiblePublicEntries.length}`,
                  pl: `Widoczne publiczne pokoje: ${lobby.visiblePublicEntries.length}`,
                })}
              </Text>
            </View>
            <ActionButton
              disabled={lobby.isActionPending}
              label={copy({
                de: 'Aktualisieren',
                en: 'Refresh',
                pl: 'Odśwież',
              })}
              onPress={lobby.refresh}
              tone='secondary'
            />
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {MODE_FILTER_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                label={localizeDuelText(option.label, locale)}
                onPress={() => {
                  lobby.setModeFilter(option.value);
                }}
                selected={lobby.modeFilter === option.value}
              />
            ))}
          </View>

          {lobby.lobbyError ? (
            <MessageCard
              title={copy({
                de: 'Lobby ist nicht verfügbar',
                en: 'Lobby is unavailable',
                pl: 'Lobby jest niedostępne',
              })}
              description={lobby.lobbyError}
              tone='error'
            />
          ) : lobby.isLobbyLoading ? (
            <MessageCard
              title={copy({
                de: 'Lobby wird geladen',
                en: 'Loading lobby',
                pl: 'Ładujemy lobby',
              })}
              description={
                lobby.isRestoringAuth
                  ? copy({
                      de: 'Die Lernenden-Sitzung wird wiederhergestellt und verfügbare Duelle werden geladen.',
                      en: 'Restoring the learner session and loading available duels.',
                      pl: 'Przywracamy sesję ucznia i pobieramy dostępne pojedynki.',
                    })
                  : copy({
                      de: 'Verfügbare öffentliche und private Räume werden geladen.',
                      en: 'Loading available public and private rooms.',
                      pl: 'Pobieramy dostępne publiczne i prywatne pokoje.',
                    })
              }
            />
          ) : (
            <>
              {lobby.inviteEntries.length > 0 ? (
                <View style={{ gap: 10 }}>
                  <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                    {copy({
                      de: 'Einladungen',
                      en: 'Invites',
                      pl: 'Zaproszenia',
                    })}
                  </Text>
                  {lobby.inviteEntries.map((entry) => (
                    <LobbyEntryCard
                      key={entry.sessionId}
                      action={renderJoinAction(entry.sessionId)}
                      actionLabel={copy({
                        de: 'Private Einladung für angemeldete Lernende.',
                        en: 'Private invite for a signed-in learner.',
                        pl: 'Prywatne zaproszenie dla zalogowanego ucznia.',
                      })}
                      description={copy({
                        de: `Gastgeber ${entry.host.displayName} lädt zu einem privaten Duell ${formatOperationLabel(entry.operation, locale)} ein.`,
                        en: `Host ${entry.host.displayName} is inviting you to a private ${formatOperationLabel(entry.operation, locale)} duel.`,
                        pl: `Gospodarz ${entry.host.displayName} zaprasza do prywatnego pojedynku ${formatOperationLabel(entry.operation, locale)}.`,
                      })}
                      entry={entry}
                      locale={locale}
                    />
                  ))}
                </View>
              ) : null}

              <View style={{ gap: 10 }}>
                <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                  {copy({
                    de: 'Öffentliche Räume',
                    en: 'Public rooms',
                    pl: 'Publiczne pokoje',
                  })}
                </Text>
                {lobby.visiblePublicEntries.length === 0 ? (
                  <MessageCard
                    title={copy({
                      de: 'Keine öffentlichen Duelle',
                      en: 'No public duels',
                      pl: 'Brak publicznych pojedynków',
                    })}
                    description={copy({
                      de: 'Ein anderer Filter oder ein schnelles Match erstellt einen neuen Raum zum Beitreten.',
                      en: 'Changing the filter or starting a quick match will create a new room to join.',
                      pl: 'Zmiana filtra albo szybki mecz utworzy nowy pokój gotowy do dołączenia.',
                    })}
                  />
                ) : (
                  lobby.visiblePublicEntries.map((entry) => (
                    <LobbyEntryCard
                      key={entry.sessionId}
                      action={
                        <View style={{ gap: 8 }}>
                          {renderJoinAction(entry.sessionId)}
                          {renderSpectateAction(entry.sessionId)}
                        </View>
                      }
                      actionLabel={copy({
                        de: 'Du kannst als Spieler beitreten oder den Raum im Zuschauermodus öffnen.',
                        en: 'You can join as a player or open the room in spectator mode.',
                        pl: 'Możesz dołączyć jako gracz albo otworzyć pokój w trybie obserwatora.',
                      })}
                      description={copy({
                        de: `${formatModeLabel(entry.mode, locale)} von ${entry.host.displayName}. Status: ${formatStatusLabel(entry.status, locale).toLowerCase()}.`,
                        en: `${formatModeLabel(entry.mode, locale)} hosted by ${entry.host.displayName}. Status: ${formatStatusLabel(entry.status, locale).toLowerCase()}.`,
                        pl: `${formatModeLabel(entry.mode, locale)} gospodarza ${entry.host.displayName}. Status: ${formatStatusLabel(entry.status, locale).toLowerCase()}.`,
                      })}
                      entry={entry}
                      locale={locale}
                    />
                  ))
                )}
              </View>
            </>
          )}
        </Card>

        <Card>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                {copy({
                  de: 'Lobby-Chat',
                  en: 'Lobby chat',
                  pl: 'Czat lobby',
                })}
              </Text>
              <Text style={{ color: '#64748b', fontSize: 13 }}>
                {copy({
                  de: 'Schnelle Abstimmung vor dem Duell und während du auf einen Gegner wartest.',
                  en: 'Quick coordination before the duel and while waiting for an opponent.',
                  pl: 'Szybka koordynacja przed pojedynkiem i w czasie oczekiwania na przeciwnika.',
                })}
              </Text>
            </View>
            {chat.isAuthenticated ? (
              <ActionButton
                disabled={chat.isLoading || chat.isSending}
                label={copy({
                  de: 'Aktualisieren',
                  en: 'Refresh',
                  pl: 'Odśwież',
                })}
                onPress={chat.refresh}
                tone='secondary'
              />
            ) : null}
          </View>

          {!chat.isAuthenticated ? (
            <MessageCard
              title={copy({
                de: 'Lobby-Chat erfordert Anmeldung',
                en: 'Lobby chat requires sign-in',
                pl: 'Czat lobby wymaga logowania',
              })}
              description={copy({
                de: 'Ein angemeldeter Lernender kann kurze Nachrichten an andere Personen in der Lobby lesen und senden.',
                en: 'A signed-in learner can read and send short messages to other people in the lobby.',
                pl: 'Zalogowany uczeń może czytać i wysyłać krótkie wiadomości do innych osób w lobby.',
              })}
            />
          ) : chat.error ? (
            <MessageCard
              title={copy({
                de: 'Lobby-Chat konnte nicht geladen werden',
                en: 'Could not load the lobby chat',
                pl: 'Nie udało się pobrać czatu lobby',
              })}
              description={chat.error}
              tone='error'
            />
          ) : chat.isLoading ? (
            <MessageCard
              title={copy({
                de: 'Lobby-Chat wird geladen',
                en: 'Loading lobby chat',
                pl: 'Ładujemy czat lobby',
              })}
              description={
                chat.isRestoringAuth
                  ? copy({
                      de: 'Die Lernenden-Sitzung wird wiederhergestellt und die letzten Nachrichten werden geladen.',
                      en: 'Restoring the learner session and loading the latest messages.',
                      pl: 'Przywracamy sesję ucznia i pobieramy ostatnie wiadomości.',
                    })
                  : copy({
                      de: 'Die aktuellen Nachrichten aus der Lobby werden geladen.',
                      en: 'Loading the latest messages from the lobby.',
                      pl: 'Pobieramy bieżące wiadomości z lobby.',
                    })
              }
            />
          ) : (
            <>
              {lobbyChatPreview.length === 0 ? (
                <MessageCard
                  title={copy({
                    de: 'Keine Nachrichten',
                    en: 'No messages',
                    pl: 'Brak wiadomości',
                  })}
                  description={copy({
                    de: 'Das ist ein guter Ort, um ein schnelles Match oder ein privates Rückspiel zu verabreden.',
                    en: 'This is a good place to arrange a quick match or a private rematch.',
                    pl: 'To dobre miejsce na ustalenie szybkiego meczu albo prywatnego rewanżu.',
                  })}
                />
              ) : (
                <View style={{ gap: 10 }}>
                  {lobbyChatPreview.map((message) => (
                    <View
                      key={message.id}
                      style={{
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor:
                          message.senderId === activeLearnerId ? '#bfdbfe' : '#e2e8f0',
                        backgroundColor:
                          message.senderId === activeLearnerId ? '#eff6ff' : '#f8fafc',
                        gap: 6,
                        padding: 14,
                      }}
                    >
                      <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
                        {formatLobbyChatSenderLabel(message, activeLearnerId, locale)}
                      </Text>
                      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                        {message.message}
                      </Text>
                      <Text style={{ color: '#64748b', fontSize: 12 }}>
                        {formatRelativeAge(message.createdAt, locale)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={{ gap: 8 }}>
                <TextInput
                  accessibilityLabel={copy({
                    de: 'Nachricht an den Lobby-Chat',
                    en: 'Lobby chat message',
                    pl: 'Wiadomość do czatu lobby',
                  })}
                  editable={!chat.isSending}
                  maxLength={chat.maxMessageLength}
                  multiline
                  onChangeText={(nextValue) => {
                    setChatDraft(nextValue);
                    if (chatActionError) {
                      setChatActionError(null);
                    }
                  }}
                  placeholder={copy({
                    de: 'Schreibe in die Lobby',
                    en: 'Write to the lobby',
                    pl: 'Napisz do lobby',
                  })}
                  style={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: 16,
                    borderWidth: 1,
                    minHeight: 96,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    textAlignVertical: 'top',
                  }}
                  value={chatDraft}
                />
                <Text style={{ color: '#64748b', fontSize: 12 }}>
                  {copy({
                    de: `${chatRemainingChars} Zeichen übrig.`,
                    en: `${chatRemainingChars} characters left.`,
                    pl: `Pozostało ${chatRemainingChars} znaków.`,
                  })}
                </Text>
                {chatActionError ? (
                  <MessageCard
                    title={copy({
                      de: 'Nachricht konnte nicht gesendet werden',
                      en: 'Could not send the message',
                      pl: 'Nie udało się wysłać wiadomości',
                    })}
                    description={chatActionError}
                    tone='error'
                  />
                ) : null}
                <ActionButton
                  disabled={!canSendChatMessage}
                  label={
                    chat.isSending
                      ? copy({
                          de: 'Wird gesendet...',
                          en: 'Sending...',
                          pl: 'Wysyłanie...',
                        })
                      : copy({
                          de: 'Nachricht senden',
                          en: 'Send message',
                          pl: 'Wyślij wiadomość',
                        })
                  }
                  onPress={handleLobbyChatSend}
                  stretch
                />
              </View>
            </>
          )}
        </Card>

        <Card>
          <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
            {copy({
              de: 'Aktive Lernende',
              en: 'Active learners',
              pl: 'Aktywni uczniowie',
            })}
          </Text>
          {!lobby.isAuthenticated ? (
            <MessageCard
              title={copy({
                de: 'Liste aktiver Lernender erfordert Anmeldung',
                en: 'Active learners list requires sign-in',
                pl: 'Lista aktywnych uczniów wymaga logowania',
              })}
              description={copy({
                de: 'Nach der Anmeldung beginnt die mobile App auch, Präsenz in der Lobby zu senden.',
                en: 'After sign-in, the mobile app will also start pinging presence in the lobby.',
                pl: 'Po zalogowaniu mobilna aplikacja zacznie też pingować obecność w lobby.',
              })}
            />
          ) : lobby.presenceError ? (
            <MessageCard
              title={copy({
                de: 'Präsenz konnte nicht geladen werden',
                en: 'Could not load presence',
                pl: 'Nie udało się pobrać obecności',
              })}
              description={lobby.presenceError}
              tone='error'
            />
          ) : lobby.isPresenceLoading ? (
            <MessageCard
              title={copy({
                de: 'Präsenz wird aktualisiert',
                en: 'Updating presence',
                pl: 'Aktualizujemy obecność',
              })}
              description={copy({
                de: 'Die Liste der in der Lobby sichtbaren Lernenden wird synchronisiert.',
                en: 'Synchronizing the list of learners visible in the lobby.',
                pl: 'Synchronizujemy listę uczniów widocznych w lobby.',
              })}
            />
          ) : lobby.presenceEntries.length === 0 ? (
            <MessageCard
              title={copy({
                de: 'Keine aktiven Lernenden',
                en: 'No active learners',
                pl: 'Brak obecnych uczniów',
              })}
              description={copy({
                de: 'Wenn andere Lernende die Lobby öffnen, erscheinen sie hier.',
                en: 'When other learners open the lobby, they will appear here.',
                pl: 'Gdy inni uczniowie otworzą lobby, pojawią się tutaj.',
              })}
            />
          ) : (
            <View style={{ gap: 10 }}>
              {lobby.presenceEntries.map((entry) => (
                <View
                  key={entry.learnerId}
                  style={{
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    backgroundColor: '#f8fafc',
                    padding: 14,
                    gap: 6,
                  }}
                >
                  <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                    {entry.displayName}
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 12 }}>
                    {copy({
                      de: 'Letzte Aktivität',
                      en: 'Last activity',
                      pl: 'Ostatnia aktywność',
                    })}{' '}
                    {formatRelativeAge(entry.lastSeenAt, locale)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        <Card>
          <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
            {copy({
              de: 'Lernende suchen',
              en: 'Search learners',
              pl: 'Szukaj uczniów',
            })}
          </Text>
          {!lobby.isAuthenticated ? (
            <MessageCard
              title={copy({
                de: 'Suche erfordert Anmeldung',
                en: 'Search requires sign-in',
                pl: 'Wyszukiwanie wymaga logowania',
              })}
              description={copy({
                de: 'Nach der Anmeldung kannst du über den Login eines Lernenden eine private Herausforderung senden.',
                en: 'After signing in, you can send a private challenge using a learner login.',
                pl: 'Po zalogowaniu możesz wysłać prywatne wyzwanie po loginie ucznia.',
              })}
            />
          ) : (
            <>
              <View style={{ gap: 8 }}>
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: 'Gib mindestens 2 Zeichen des Logins oder Namens des Lernenden ein.',
                    en: 'Enter at least 2 characters from the learner login or name.',
                    pl: 'Wpisz co najmniej 2 znaki loginu lub nazwy ucznia.',
                  })}
                </Text>
                <TextInput
                  accessibilityLabel={copy({
                    de: 'Lernendensuche',
                    en: 'Learner search',
                    pl: 'Wyszukiwarka uczniów',
                  })}
                  onChangeText={lobby.setSearchQuery}
                  placeholder={copy({
                    de: 'Lernenden suchen',
                    en: 'Search learner',
                    pl: 'Szukaj ucznia',
                  })}
                  style={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: 16,
                    borderWidth: 1,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                  value={lobby.searchQuery}
                />
                <View style={{ gap: 8 }}>
                  <ActionButton
                    disabled={lobby.searchQuery.trim().length < 2}
                    label={copy({
                      de: 'Suchen',
                      en: 'Search',
                      pl: 'Szukaj',
                    })}
                    onPress={lobby.submitSearch}
                    stretch
                  />
                  {lobby.searchSubmittedQuery ? (
                    <ActionButton
                      label={copy({
                        de: 'Suche löschen',
                        en: 'Clear search',
                        pl: 'Wyczyść wyszukiwanie',
                      })}
                      onPress={lobby.clearSearch}
                      stretch
                      tone='secondary'
                    />
                  ) : null}
                </View>
              </View>

              {lobby.searchError ? (
                <MessageCard
                  title={copy({
                    de: 'Suche fehlgeschlagen',
                    en: 'Search failed',
                    pl: 'Wyszukiwanie nie powiodło się',
                  })}
                  description={lobby.searchError}
                  tone='error'
                />
              ) : lobby.isSearchLoading ? (
                <MessageCard
                  title={copy({
                    de: 'Lernende werden gesucht',
                    en: 'Searching learners',
                    pl: 'Szukamy uczniów',
                  })}
                  description={copy({
                    de: 'Die Ergebnisse für die eingegebene Anfrage werden abgeglichen.',
                    en: 'Matching results for the entered query.',
                    pl: 'Dopasowujemy wyniki dla wpisanego zapytania.',
                  })}
                />
              ) : lobby.searchSubmittedQuery.length >= 2 &&
                lobby.searchResults.length === 0 ? (
                <MessageCard
                  title={copy({
                    de: 'Keine Ergebnisse',
                    en: 'No results',
                    pl: 'Brak wyników',
                  })}
                  description={copy({
                    de: 'Es wurden keine Lernenden gefunden, die zur eingegebenen Anfrage passen.',
                    en: 'We did not find any learners matching the entered query.',
                    pl: 'Nie znaleźliśmy uczniów pasujących do wpisanego zapytania.',
                  })}
                />
              ) : lobby.searchResults.length > 0 ? (
                <View style={{ gap: 10 }}>
                  {lobby.searchResults.map((entry) => (
                    <View
                      key={entry.learnerId}
                      style={{
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        backgroundColor: '#f8fafc',
                        padding: 14,
                        gap: 8,
                      }}
                    >
                      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                        {entry.displayName}
                      </Text>
                      <Text style={{ color: '#64748b', fontSize: 12 }}>
                        {copy({
                          de: `Login: ${entry.loginName}`,
                          en: `Login: ${entry.loginName}`,
                          pl: `Login: ${entry.loginName}`,
                        })}
                      </Text>
                      <ActionButton
                        disabled={lobby.isActionPending}
                        label={copy({
                          de: 'Private Herausforderung senden',
                          en: 'Send private challenge',
                          pl: 'Wyślij prywatne wyzwanie',
                        })}
                        onPress={async () => {
                          const nextSessionId = await lobby.createPrivateChallenge(
                            entry.learnerId,
                          );
                          if (nextSessionId) {
                            openSession(nextSessionId);
                          }
                        }}
                        stretch
                      />
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          )}
        </Card>

        <Card>
          <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
            {copy({
              de: 'Letzte Gegner',
              en: 'Recent opponents',
              pl: 'Ostatni przeciwnicy',
            })}
          </Text>
          {!lobby.isAuthenticated ? (
            <MessageCard
              title={copy({
                de: 'Gegnerverlauf erfordert Anmeldung',
                en: 'Opponent history requires sign-in',
                pl: 'Historia przeciwników wymaga logowania',
              })}
              description={copy({
                de: 'Nach der Anmeldung erscheint hier eine Abkürzung, um die letzten Rivalen erneut herauszufordern.',
                en: 'After signing in, a shortcut to challenge recent rivals again will appear here.',
                pl: 'Po zalogowaniu pojawi się tutaj skrót do ponownego wyzwania ostatnich rywali.',
              })}
            />
          ) : lobby.isOpponentsLoading ? (
            <MessageCard
              title={copy({
                de: 'Gegnerliste wird geladen',
                en: 'Loading opponents',
                pl: 'Ładujemy listę przeciwników',
              })}
              description={copy({
                de: 'Die letzten Kontakte aus der Duellhistorie werden geladen.',
                en: 'Loading recent contacts from the duel history.',
                pl: 'Pobieramy ostatnie kontakty z historii pojedynków.',
              })}
            />
          ) : lobby.opponents.length === 0 ? (
            <MessageCard
              title={copy({
                de: 'Keine gespeicherten Gegner',
                en: 'No saved opponents',
                pl: 'Brak zapisanych przeciwników',
              })}
              description={copy({
                de: 'Das Backend hat für diesen Lernenden noch keinen Gegnerverlauf zurückgegeben.',
                en: 'The backend has not returned any opponent history for this learner yet.',
                pl: 'Backend nie zwrócił jeszcze historii przeciwników dla tego ucznia.',
              })}
            />
          ) : (
            <View style={{ gap: 10 }}>
              {lobby.opponents.map((entry) => (
                <View
                  key={entry.learnerId}
                  style={{
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    backgroundColor: '#f8fafc',
                    padding: 14,
                    gap: 8,
                  }}
                >
                  <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                    {entry.displayName}
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 12 }}>
                    {copy({
                      de: 'Letztes Spiel',
                      en: 'Last game',
                      pl: 'Ostatnia gra',
                    })}{' '}
                    {formatRelativeAge(entry.lastPlayedAt, locale)}
                  </Text>
                  <ActionButton
                    disabled={lobby.isActionPending}
                    label={copy({
                      de: 'Erneut herausfordern',
                      en: 'Challenge again',
                      pl: 'Wyzwij ponownie',
                    })}
                    onPress={async () => {
                      const nextSessionId = await lobby.createPrivateChallenge(
                        entry.learnerId,
                      );
                      if (nextSessionId) {
                        openSession(nextSessionId);
                      }
                    }}
                    stretch
                  />
                </View>
              ))}
            </View>
          )}
        </Card>

        <Card>
          <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
            {copy({
              de: 'Duellrangliste',
              en: 'Duels leaderboard',
              pl: 'Wyniki dueli',
            })}
          </Text>
          {lobby.leaderboardError ? (
            <MessageCard
              title={copy({
                de: 'Duellrangliste ist nicht verfügbar',
                en: 'Duels leaderboard is unavailable',
                pl: 'Ranking dueli jest niedostępny',
              })}
              description={lobby.leaderboardError}
              tone='error'
            />
          ) : lobby.leaderboardEntries.length === 0 ? (
            <MessageCard
              title={copy({
                de: 'Keine gespielten Duelle',
                en: 'No completed duels',
                pl: 'Brak rozegranych dueli',
              })}
              description={copy({
                de: 'Die Rangliste füllt sich nach den ersten abgeschlossenen Duellen.',
                en: 'The leaderboard will fill up after the first completed duels.',
                pl: 'Ranking zapełni się po pierwszych zakończonych pojedynkach.',
              })}
            />
          ) : (
            <View style={{ gap: 10 }}>
              {lobby.leaderboardEntries.map((entry, index) => (
                <View
                  key={`${entry.learnerId}-${index}`}
                  style={{
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    backgroundColor: '#f8fafc',
                    padding: 14,
                    gap: 8,
                  }}
                >
                  <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                    #{index + 1} {entry.displayName}
                  </Text>
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: `Siege ${entry.wins} · Niederlagen ${entry.losses} · Unentschieden ${entry.ties}`,
                      en: `Wins ${entry.wins} · Losses ${entry.losses} · Draws ${entry.ties}`,
                      pl: `Wygrane ${entry.wins} · Porażki ${entry.losses} · Remisy ${entry.ties}`,
                    })}
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                    {copy({
                      de: `Spiele ${entry.matches} · Siegesquote ${Math.round(entry.winRate * 100)}% · letztes Spiel ${formatRelativeAge(entry.lastPlayedAt, locale)}`,
                      en: `Matches ${entry.matches} · Win rate ${Math.round(entry.winRate * 100)}% · last game ${formatRelativeAge(entry.lastPlayedAt, locale)}`,
                      pl: `Mecze ${entry.matches} · Win rate ${Math.round(entry.winRate * 100)}% · ostatnia gra ${formatRelativeAge(entry.lastPlayedAt, locale)}`,
                    })}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        <LessonCheckpointsCard context='lobby' />
        <LessonMasteryCard context='lobby' />
        <NextStepsCard context='lobby' />
      </ScrollView>
    </SafeAreaView>
  );
}
