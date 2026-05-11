import { Text } from 'react-native';

import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  KangurMobileCard as Card,
} from '../shared/KangurMobileUi';
import {
  resolveSeriesWins,
  formatSeriesProgress,
  formatSeriesSummary
} from './utils/duels-ui';
import { type UseKangurMobileDuelSessionResult as DuelSessionState } from './useKangurMobileDuelSession';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type DuelLocale = ReturnType<typeof useKangurMobileI18n>['locale'];

type DuelSessionSeriesCardProps = {
  copy: DuelCopy;
  duel: DuelSessionState;
  locale: DuelLocale;
};

export function DuelSessionSeriesCard({
  copy,
  duel,
  locale,
}: DuelSessionSeriesCardProps): React.JSX.Element {
  if (!duel.session?.series) {
    return <></>;
  }

  return (
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
        {formatSeriesSummary(duel.session.series, locale)}
      </Text>
      {duel.session.series.leaderLearnerId !== null ? (
        <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
          {copy({
            de: `Führt ${duel.session.players.find((player) => player.learnerId === duel.session.series.leaderLearnerId)?.displayName ?? 'unbekannt'} ${resolveSeriesWins(duel.session.series, duel.session.series.leaderLearnerId)}:${Object.entries(duel.session.series.winsByPlayer).reduce((total, [playerId, wins]) => playerId === duel.session.series.leaderLearnerId ? total : total + (typeof wins === 'number' ? wins : 0), 0)}.`,
            en: `Leading ${duel.session.players.find((player) => player.learnerId === duel.session.series.leaderLearnerId)?.displayName ?? 'unknown'} ${resolveSeriesWins(duel.session.series, duel.session.series.leaderLearnerId)}:${Object.entries(duel.session.series.winsByPlayer).reduce((total, [playerId, wins]) => playerId === duel.session.series.leaderLearnerId ? total : total + (typeof wins === 'number' ? wins : 0), 0)}.`,
            pl: `Prowadzi ${duel.session.players.find((player) => player.learnerId === duel.session.series.leaderLearnerId)?.displayName ?? 'nieznany'} ${resolveSeriesWins(duel.session.series, duel.session.series.leaderLearnerId)}:${Object.entries(duel.session.series.winsByPlayer).reduce((total, [playerId, wins]) => playerId === duel.session.series.leaderLearnerId ? total : total + (typeof wins === 'number' ? wins : 0), 0)}.`,
          })}
        </Text>
      ) : null}
    </Card>
  );
}
