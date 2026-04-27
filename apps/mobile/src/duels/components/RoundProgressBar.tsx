import React from 'react';
import { View, Text } from 'react-native';
import { formatRoundProgressLabel } from "../utils/duels-ui";

interface RoundProgressBarProps {
  locale: any;
  roundProgress: { percent: number };
  status: string;
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
        {formatRoundProgressLabel(roundProgress as any, locale)}
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
