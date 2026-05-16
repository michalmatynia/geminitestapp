import React from 'react';
import { Text } from '@/shared/ui/react-native-web-shim';
import { Card } from '@/shared/ui/primitives.public';

interface CampaignDetailsSectionProps {
  campaign: {
    title: string;
  };
  copy: (v: Record<string, string>) => string;
}

export function CampaignDetailsSection({
  campaign,
  copy,
}: CampaignDetailsSectionProps): React.JSX.Element {
  return (
    <Card>
      <Text style={{ fontSize: 18, fontWeight: '800' }}>
        {copy({ de: 'Kampagnendetails', en: 'Campaign details', pl: 'Szczegóły kampanii' })}
      </Text>
      <Text>{campaign.title}</Text>
    </Card>
  );
}
