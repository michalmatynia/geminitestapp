import React from 'react';
import { View, Text } from 'react-native';
import { KangurMobileCard as Card } from '@/features/kangur/ui/components'; // Assuming shared UI exists

interface LessonsManagerHeaderProps {
  copy: (v: Record<string, string>) => string;
}

export function LessonsManagerHeader({ copy }: LessonsManagerHeaderProps): React.JSX.Element {
  return (
    <Card>
      <Text style={{ fontSize: 24, fontWeight: '800' }}>
        {copy({ de: 'Lektionsverwaltung', en: 'Lesson manager', pl: 'Zarządzanie lekcjami' })}
      </Text>
    </Card>
  );
}
