import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '@/features/kangur/ui/components';

interface LaunchSectionProps {
  draft: any;
  setDraft: any;
  copy: (v: Record<string, string>) => string;
}

export function LaunchSection({ draft, setDraft, copy }: LaunchSectionProps): React.JSX.Element {
  return (
    <Card>
      <Text style={{ fontSize: 18, fontWeight: '800' }}>
        {copy({ de: 'Start-Regeln', en: 'Launch rules', pl: 'Reguły startu' })}
      </Text>
      {/* Logic to be migrated here */}
    </Card>
  );
}
