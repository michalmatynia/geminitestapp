import React from 'react';
import { Text } from '@/shared/ui/react-native-web-shim';
import { Card } from '@/shared/ui/primitives.public';
import { AudienceSourceSection } from '../../campaign-edit-sections/AudienceSourceSection';

export function AudienceSection(): React.JSX.Element {
  return (
    <Card>
      <Text style={{ fontSize: 18, fontWeight: '800' }}>
        Audience Section
      </Text>
      <AudienceSourceSection />
      {/* Migration of filters and other internal logic here */}
    </Card>
  );
}
