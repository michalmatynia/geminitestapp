import { Text } from 'react-native';

import { type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  KangurMobileCard as Card,
} from '../shared/KangurMobileUi';
import {
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
        {formatSeriesSummary(duel.session.series, duel.session.players, locale)}
      </Text>
    </Card>
  );
}
