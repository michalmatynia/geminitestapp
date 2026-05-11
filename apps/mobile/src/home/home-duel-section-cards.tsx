import type { KangurDuelLobbyEntry } from '@kangur/contracts/kangur-duels';
import { Pressable, Text, View } from 'react-native';

import {
  DuelInviteCard,
} from './home-duel-section-cards-1';
import {
  DuelLeaderboardEntryCard,
  RecentOpponentCard,
} from './home-duel-section-cards-2';
import { type KangurMobileLocale, type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { formatKangurMobileScoreOperation } from '../scores/mobileScoreSummary';
import {
  formatHomeRelativeAge,
  getHomeDuelDifficultyLabel,
  getHomeDuelModeLabel,
  getHomeDuelSeriesLabel,
} from './homeScreenLabels';

type CardCopy = ReturnType<typeof useKangurMobileI18n>['copy'];

const extractText = (copy: CardCopy, fallback: string): string =>
  copy({
    de: fallback,
    en: fallback,
    pl: fallback,
  });

const getModeOperationLine = (
  copy: CardCopy,
  entry: KangurDuelLobbyEntry,
  locale: KangurMobileLocale,
): string => {
  return `${getHomeDuelModeLabel(entry.mode, locale)} • ${formatKangurMobileScoreOperation(entry.operation, locale)} • ${copy({
    de: 'Stufe',
    en: 'level',
    pl: 'poziom',
  })} ${getHomeDuelDifficultyLabel(entry.difficulty, locale)}`;
};

const getUpdatedLine = (
  copy: CardCopy,
  entry: KangurDuelLobbyEntry,
  locale: KangurMobileLocale,
): string =>
  copy({
    de: `${entry.questionCount} Fragen • ${entry.timePerQuestionSec}s pro Frage • aktualisiert ${formatHomeRelativeAge(entry.updatedAt, locale)}`,
    en: `${entry.questionCount} questions • ${entry.timePerQuestionSec}s per question • updated ${formatHomeRelativeAge(entry.updatedAt, locale)}`,
    pl: `${entry.questionCount} pytań • ${entry.timePerQuestionSec}s na pytanie • aktualizacja ${formatHomeRelativeAge(entry.updatedAt, locale)}`,
  });

export function ActiveRivalCard({
  copy,
  entry,
  isActionPending,
  isCurrentLearner,
  isPending,
  locale: _locale,
  onChallenge,
}: {
  copy: CardCopy;
  entry: { displayName?: string; learnerId?: string };
  isActionPending: boolean;
  isCurrentLearner: boolean;
  isPending: boolean;
  locale: KangurMobileLocale;
  onChallenge: (() => void) | null;
}): React.JSX.Element {
  const name = entry.displayName ?? entry.learnerId ?? 'Rival';
  const actionLabel = isCurrentLearner
    ? extractText(copy, 'Duell-Rivale (Ty)')
    : extractText(
        copy,
        `Wyzwij: ${name}`,
      );
  const isBusy = isActionPending || isPending;
  const title = `${name} ${isCurrentLearner ? '· Ty' : ''}`.trim();

  return (
    <View
      style={{
        gap: 8,
        padding: 14,
        borderRadius: 20,
        backgroundColor: '#f8fafc',
        borderColor: '#e2e8f0',
        borderWidth: 1,
      }}
    >
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
        {title}
      </Text>
      <Pressable
        disabled={!onChallenge || isBusy}
        onPress={() => {
          onChallenge?.();
        }}
      >
        <Text style={{ color: '#3b82f6' }}>
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}

export function OutgoingChallengeCard({
  copy,
  entry,
  isSharing,
  locale,
  onShare,
}: {
  copy: CardCopy;
  entry: KangurDuelLobbyEntry;
  isSharing: boolean;
  locale: KangurMobileLocale;
  onShare: () => void;
}): React.JSX.Element {
  const seriesLine =
    entry.series === null || entry.series === undefined
      ? null
      : getHomeDuelSeriesLabel(entry.series, locale);

  return (
    <View
      style={{
        gap: 8,
        padding: 14,
        borderRadius: 20,
        backgroundColor: '#f8fafc',
        borderColor: '#e2e8f0',
        borderWidth: 1,
      }}
    >
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
        {extractText(copy, 'Prywatne wyzwanie')}
      </Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {entry.host?.displayName ?? 'Prywatne wyzwanie'}
      </Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {getModeOperationLine(copy, entry, locale)}
      </Text>
      <Text style={{ color: '#64748b' }}>{getUpdatedLine(copy, entry, locale)}</Text>
      {seriesLine === null ? null : (
        <Text style={{ color: '#4338ca', lineHeight: 20 }}>{seriesLine}</Text>
      )}
      <Pressable disabled={isSharing} onPress={() => onShare()}>
        <Text style={{ color: '#3b82f6' }}>
          {isSharing ? extractText(copy, 'Udostępnianie...') : extractText(copy, 'Udostępnij link')}
        </Text>
      </Pressable>
    </View>
  );
}

export function LiveDuelCard({
  copy,
  entry,
  isAuthenticated,
  locale,
}: {
  copy: CardCopy;
  entry: KangurDuelLobbyEntry;
  isAuthenticated: boolean;
  locale: KangurMobileLocale;
}): React.JSX.Element {
  const hostName = entry.host?.displayName ?? 'Sesja publiczna';
  const seriesLine =
    entry.series === null || entry.series === undefined
      ? null
      : getHomeDuelSeriesLabel(entry.series, locale);

  return (
    <View
      style={{
        gap: 8,
        padding: 14,
        borderRadius: 20,
        backgroundColor: '#f8fafc',
        borderColor: '#e2e8f0',
        borderWidth: 1,
      }}
    >
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>{hostName}</Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {getModeOperationLine(copy, entry, locale)}
      </Text>
      <Text style={{ color: '#64748b' }}>{getUpdatedLine(copy, entry, locale)}</Text>
      {seriesLine === null ? null : (
        <Text style={{ color: '#4338ca', lineHeight: 20 }}>{seriesLine}</Text>
      )}
      <Pressable disabled={!isAuthenticated}>
        <Text style={{ color: '#3b82f6' }}>
          {isAuthenticated
            ? extractText(copy, 'Obserwuj na żywo')
            : extractText(copy, 'Zaloguj, aby obserwować')}
        </Text>
      </Pressable>
    </View>
  );
}

export function DuelLeaderboardSnapshotCard({
  copy,
  entry,
  locale: _locale,
  rank,
}: {
  copy: CardCopy;
  entry: { learnerId?: string; displayName?: string };
  locale: string;
  rank: number;
}): React.JSX.Element {
  return (
    <View
      style={{
        gap: 8,
        padding: 14,
        borderRadius: 20,
        backgroundColor: '#eff6ff',
        borderColor: '#bfdbfe',
        borderWidth: 1,
      }}
    >
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
        #{rank} {entry.displayName ?? entry.learnerId ?? 'Rival'}
      </Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {copy({
          de: 'DEIN DUELLSTAND',
          en: 'YOUR DUEL SNAPSHOT',
          pl: 'TWÓJ WYNIK W POJEDYNKACH',
        })}
      </Text>
    </View>
  );
}

export { DuelInviteCard, DuelLeaderboardEntryCard, RecentOpponentCard };
