import type { KangurDuelLeaderboardEntry } from '@kangur/contracts/kangur-duels';
import { Text, View } from 'react-native';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  KangurMobileCard,
  KangurMobileSummaryChip,
} from '../shared/KangurMobileUi';

type LeaderboardDuelsState = {
  actionError: string | null;
  challengeLearner: (opponentLearnerId: string) => Promise<string | null>;
  currentEntry: KangurDuelLeaderboardEntry | null;
  currentRank: number | null;
  entries: KangurDuelLeaderboardEntry[];
  error: string | null;
  isActionPending: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingLearnerId: string | null;
  refresh: () => Promise<void>;
};

function LeaderboardHeader({ copy }: { copy: ReturnType<typeof useKangurMobileI18n>['copy'] }): React.JSX.Element {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: 'Duell-Rangliste',
          en: 'Duel leaderboard',
          pl: 'Ranking pojedynków',
        })}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
        {copy({
          de: 'Rivalentabelle',
          en: 'Rivals board',
          pl: 'Tabela rywali',
        })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Vergleiche die aktuelle Form, prüfe ob dein Stand schon sichtbar ist und fordere Rivalen direkt von hier aus heraus.',
          en: 'Compare current form, check whether your standing is already visible, and challenge a rival right from here.',
          pl: 'Porównaj bieżącą formę, sprawdź czy Twój wynik jest już widoczny i rzuć wyzwanie od razu stąd.',
        })}
      </Text>
    </View>
  );
}

function getChipLabel(
  copy: ReturnType<typeof useKangurMobileI18n>['copy'],
  duelLeaderboard: LeaderboardDuelsState
): string {
  if (duelLeaderboard.currentRank !== null) {
    return copy({
      de: `Deine Position #${duelLeaderboard.currentRank}`,
      en: `Your rank #${duelLeaderboard.currentRank}`,
      pl: `Twoja pozycja #${duelLeaderboard.currentRank}`,
    });
  }
  if (duelLeaderboard.isAuthenticated) {
    return copy({
      de: 'Wartet auf Sichtbarkeit',
      en: 'Waiting for visibility',
      pl: 'Czeka na widoczność',
    });
  }
  return copy({
    de: 'Anmelden',
    en: 'Sign in',
    pl: 'Zaloguj się',
  });
}

function LeaderboardChips({
  copy,
  duelLeaderboard,
  duelTopWinRatePercent,
}: {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  duelLeaderboard: LeaderboardDuelsState;
  duelTopWinRatePercent: number | null;
}): React.JSX.Element {
  const winRateLabel = duelTopWinRatePercent === null
    ? copy({
        de: 'Top-Quote wartet',
        en: 'Top win rate pending',
        pl: 'Top win rate czeka',
      })
    : copy({
        de: `Top-Quote ${duelTopWinRatePercent}%`,
        en: `Top win rate ${duelTopWinRatePercent}%`,
        pl: `Top win rate ${duelTopWinRatePercent}%`,
      });

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <KangurMobileSummaryChip
        label={copy({
          de: `Spieler ${duelLeaderboard.entries.length}`,
          en: `Players ${duelLeaderboard.entries.length}`,
          pl: `Gracze ${duelLeaderboard.entries.length}`,
        })}
        backgroundColor='#eff6ff'
        borderColor='#bfdbfe'
        textColor='#1d4ed8'
      />
      <KangurMobileSummaryChip
        label={winRateLabel}
        backgroundColor='#fffbeb'
        borderColor='#fde68a'
        textColor='#b45309'
      />
      <KangurMobileSummaryChip
        label={getChipLabel(copy, duelLeaderboard)}
        backgroundColor='#ecfdf5'
        borderColor='#a7f3d0'
        textColor='#047857'
      />
    </View>
  );
}

export function LeaderboardDuelsSection({
  duelLeaderboard,
  duelTopWinRatePercent,
}: {
  duelLeaderboard: LeaderboardDuelsState;
  duelTopWinRatePercent: number | null;
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <KangurMobileCard gap={14}>
      <LeaderboardHeader copy={copy} />

      <LeaderboardChips
        copy={copy}
        duelLeaderboard={duelLeaderboard}
        duelTopWinRatePercent={duelTopWinRatePercent}
      />
    </KangurMobileCard>
  );
}
