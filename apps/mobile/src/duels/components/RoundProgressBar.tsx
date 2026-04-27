import type { KangurDuelStatus } from '@kangur/contracts/kangur-duels';
import React from 'react';
import { View, Text } from 'react-native';
import type { KangurMobileLocale } from '../../i18n/kangurMobileI18n';
import { formatRoundProgressLabel } from '../utils/duels-ui';

interface RoundProgressBarProps {
  locale: KangurMobileLocale;
  roundProgress: { current: number; total: number; percent: number };
  status: KangurDuelStatus;
}

export function RoundProgressBar({
  locale,
  roundProgress,
  status,
}: RoundProgressBarProps): React.JSX.Element {
  const isFinished = status === 'completed' || status === 'aborted';
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {formatRoundProgressLabel(roundProgress, locale)}
      </Text>
      <View
        style={{
          height: 10,
          width: '100%',
          borderRadius: 999,
          backgroundColor: '#e2e8f0',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${roundProgress.percent}%`,
            borderRadius: 999,
            backgroundColor: isFinished ? '#16a34a' : '#1d4ed8',
          }}
        />
      </View>
    </View>
  );
}
