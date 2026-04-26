import React from 'react';
import { View, Text } from 'react-native';
import { Card, KangurButton } from '@/features/kangur/ui/components';

interface CampaignDetailsSectionProps {
  campaign: any;
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
