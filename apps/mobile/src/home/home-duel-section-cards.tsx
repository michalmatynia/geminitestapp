import { Pressable, Text, View } from 'react-native';

import {
  DuelInviteCard,
} from './home-duel-section-cards-1';
import {
  DuelLeaderboardEntryCard,
  RecentOpponentCard,
} from './home-duel-section-cards-2';

type CardCopy = (key: string) => string;

type BaseCardProps = {
  copy: Record<string, CardCopy> | CardCopy;
};

const extractText = (
  copy: BaseCardProps['copy'],
  fallback: string,
): string => {
  if (typeof copy === 'function') {
    return copy(fallback);
  }

  return fallback;
};

export function ActiveRivalCard({
  copy,
  entry,
  isActionPending,
  isCurrentLearner,
  isPending,
  locale: _locale,
  onChallenge,
}: {
  copy: BaseCardProps['copy'];
  entry: { displayName?: string; learnerId?: string };
  isActionPending: boolean;
  isCurrentLearner: boolean;
  isPending: boolean;
  locale: string;
  onChallenge: (() => void) | null;
}): React.JSX.Element {
  const label = isCurrentLearner ? 'Duell-Rivale (Ty)' : 'Wyzywaj rywala';
  const isBusy = isActionPending || isPending;

  return (
    <View style={{ gap: 8, padding: 14, borderRadius: 20, backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: 1 }}>
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
        {entry.displayName ?? entry.learnerId ?? 'Rival'}
      </Text>
      <Pressable
        disabled={!onChallenge || isBusy}
        onPress={() => {
          onChallenge?.();
        }}
      >
        <Text style={{ color: '#3b82f6' }}>
          {extractText(copy, label)}
        </Text>
      </Pressable>
    </View>
  );
}

export function OutgoingChallengeCard({
  copy,
  entry,
  isSharing,
  locale: _locale,
  onShare,
}: {
  copy: BaseCardProps['copy'];
  entry: { learnerId?: string; targetLearner?: { displayName?: string } };
  isSharing: boolean;
  locale: string;
  onShare: () => void;
}): React.JSX.Element {
  return (
    <View style={{ gap: 8, padding: 14, borderRadius: 20, backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: 1 }}>
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
        {entry.targetLearner?.displayName ?? entry.learnerId ?? 'Wysłane wyzwanie'}
      </Text>
      <Pressable disabled={isSharing} onPress={() => onShare()}>
        <Text style={{ color: '#3b82f6' }}>
          {isSharing
            ? extractText(copy, 'Wysyłanie...')
            : extractText(copy, 'Udostępnij wyzwanie')}
        </Text>
      </Pressable>
    </View>
  );
}

export function LiveDuelCard({
  copy,
  entry,
  isAuthenticated,
  locale: _locale,
}: {
  copy: BaseCardProps['copy'];
  entry: { sessionId?: string; host?: { displayName?: string } };
  isAuthenticated: boolean;
  locale: string;
}): React.JSX.Element {
  const hostName = entry.host?.displayName ?? 'Sesja publiczna';
  return (
    <View style={{ gap: 8, padding: 14, borderRadius: 20, backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: 1 }}>
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>{hostName}</Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {extractText(copy, isAuthenticated ? 'Dołącz do duelu' : 'Zaloguj, aby dołączyć')}
      </Text>
      <Text style={{ color: '#64748b' }}>{entry.sessionId ?? 'Sesja bez ID'}</Text>
    </View>
  );
}

export function DuelLeaderboardSnapshotCard({
  copy,
  entry,
  locale: _locale,
  rank,
}: {
  copy: BaseCardProps['copy'];
  entry: { learnerId?: string; displayName?: string };
  locale: string;
  rank: number;
}): React.JSX.Element {
  return (
    <View style={{ gap: 8, padding: 14, borderRadius: 20, backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1 }}>
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
        #{rank} {entry.displayName ?? entry.learnerId ?? 'Rival'}
      </Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {extractText(copy, 'Twój snapshot klasyfikacji')}
      </Text>
    </View>
  );
}

export { DuelInviteCard, DuelLeaderboardEntryCard, RecentOpponentCard };
