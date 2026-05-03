import React from 'react';
import { View, Text } from 'react-native';
import type { KangurMobilePracticeBadgeItem } from './useKangurMobilePracticeBadges';

export function PracticeBadgeChip({
  item,
}: {
  item: KangurMobilePracticeBadgeItem;
}): React.JSX.Element {
  return (
    <View
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#fde68a',
        backgroundColor: '#fff7ed',
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <Text style={{ color: '#9a3412', fontSize: 13, fontWeight: '700' }}>
        {item.emoji} {item.name}
      </Text>
    </View>
  );
}
