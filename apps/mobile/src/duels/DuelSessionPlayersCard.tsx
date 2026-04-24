import { Text, View } from 'react-native';

import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  KangurMobileCard as Card,
  KangurMobilePill as Pill,
} from '../shared/KangurMobileUi';
import {
  formatPlayerStatusLabel,
  formatQuestionProgress,
  getPlayerStatusTone,
  resolveSeriesWins,
} from './utils/duels-ui';
import { type UseKangurMobileDuelSessionResult as DuelSessionState } from './useKangurMobileDuelSession';

type DuelCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
type DuelLocale = ReturnType<typeof useKangurMobileI18n>['locale'];

type DuelSessionPlayersCardProps = {
  copy: DuelCopy;
  duel: DuelSessionState;
  locale: DuelLocale;
};

function PlayerScoreLabel({
  player,
  locale,
}: {
  player: NonNullable<DuelSessionState['session']>['players'][number];
  locale: DuelLocale;
}): React.JSX.Element {
  const hasBonus = player.bonusPoints !== undefined && player.bonusPoints !== 0;
  let bonusSuffix = '';
  if (hasBonus) {
    let bonusLabel = 'bonus';
    if (locale === 'de') {
      bonusLabel = 'Bonus';
    }
    bonusSuffix = ` + ${player.bonusPoints} ${bonusLabel}`;
  }

  let label = '';
  if (locale === 'de') {
    label = `Punktzahl ${player.score}${bonusSuffix}`;
  } else if (locale === 'en') {
    label = `Score ${player.score}${bonusSuffix}`;
  } else {
    label = `Wynik ${player.score}${bonusSuffix}`;
  }

  return <Text style={{ color: '#475569', lineHeight: 20 }}>{label}</Text>;
}

function PlayerRow({
  player,
  session,
  isSelf,
  locale,
  copy,
}: {
  player: NonNullable<DuelSessionState['session']>['players'][number];
  session: NonNullable<DuelSessionState['session']>;
  isSelf: boolean;
  locale: DuelLocale;
  copy: DuelCopy;
}): React.JSX.Element {
  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: isSelf ? '#bfdbfe' : '#e2e8f0',
        backgroundColor: isSelf ? '#eff6ff' : '#f8fafc',
        gap: 8,
        padding: 14,
      }}
    >
      <View style={{ gap: 8 }}>
        <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
          {player.displayName}
        </Text>
        <Pill
          label={formatPlayerStatusLabel(player.status, locale)}
          tone={getPlayerStatusTone(player.status)}
        />
      </View>
      <View style={{ gap: 4 }}>
        <PlayerScoreLabel locale={locale} player={player} />
        <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 18 }}>
          {formatQuestionProgress(session, player, locale)}
        </Text>
      </View>
      {session.series ? (
        <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 18 }}>
          {copy({
            de: 'Gewonnene Spiele in der Serie:',
            en: 'Series games won:',
            pl: 'Wygrane gry w serii:',
          })}{' '}
          {resolveSeriesWins(session.series, player.learnerId)}
        </Text>
      ) : null}
    </View>
  );
}

export function DuelSessionPlayersCard({
  copy,
  duel,
  locale,
}: DuelSessionPlayersCardProps): React.JSX.Element {
  const { session } = duel;

  if (session === null) {
    return <></>;
  }

  return (
    <Card>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        {copy({
          de: 'Spieler',
          en: 'Players',
          pl: 'Gracze',
        })}
      </Text>
      <View style={{ gap: 10 }}>
        {session.players.map((player) => (
          <PlayerRow
            key={player.learnerId}
            copy={copy}
            isSelf={player.learnerId === duel.player?.learnerId}
            locale={locale}
            player={player}
            session={session}
          />
        ))}
      </View>
    </Card>
  );
}
