import React from 'react';
import { View, Text } from '@/shared/ui/react-native-web-shim';
import { Card } from '@/features/kangur/ui/components';
import { AudienceSourceSection } from '../campaign-edit-sections/AudienceSourceSection';

interface AudienceSectionProps {
  draft: any;
  setDraft: any;
  organizationOptions: any[];
  eventOptions: any[];
  partyOptions: any[];
}

export function AudienceSection({
  draft,
  setDraft,
  organizationOptions,
  eventOptions,
  partyOptions,
}: AudienceSectionProps): React.JSX.Element {
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
