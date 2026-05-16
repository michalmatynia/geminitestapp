import React from 'react';
import { Text } from '@/shared/ui/react-native-web-shim';
import { Card } from '@/shared/ui/primitives.public';

interface LaunchSectionProps {
  draft?: unknown;
  setDraft?: unknown;
  copy: (v: Record<string, string>) => string;
}

export function LaunchSection({ copy }: LaunchSectionProps): React.JSX.Element {
  return (
    <Card>
      <Text style={{ fontSize: 18, fontWeight: '800' }}>
        {copy({ de: 'Start-Regeln', en: 'Launch rules', pl: 'Reguły startu' })}
      </Text>
      {/* Logic to be migrated here */}
    </Card>
  );
}
