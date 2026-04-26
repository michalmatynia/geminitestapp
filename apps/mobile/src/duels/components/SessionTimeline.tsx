import React from 'react';
import { View, Text } from 'react-native';

interface SessionTimelineProps {
  copy: (v: Record<string, string>) => string;
  items: string[];
}

export function SessionTimeline({ copy, items }: SessionTimelineProps): React.JSX.Element {
  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        padding: 14,
        gap: 8,
      }}
    >
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: 'Zeitachse der Sitzung',
          en: 'Session timeline',
          pl: 'Oś sesji',
        })}
      </Text>
      <View style={{ gap: 6 }}>
        {items.map((item) => (
          <Text key={item} style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
            {item}
          </Text>
        ))}
      </View>
    </View>
  );
}
