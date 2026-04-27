import React from 'react';
import { View, Text } from '@/shared/ui/react-native-web-shim';
import { Card } from '@/features/kangur/ui/components';

interface ContentSectionProps {
  draft: any;
  setDraft: any;
  database: any;
  preview: any;
  contentGroupRegistry: any;
  contentLocale: string;
}

export function ContentSection({
  draft,
  setDraft,
  database,
  preview,
  contentGroupRegistry,
  contentLocale,
}: ContentSectionProps): React.JSX.Element {
  return (
    <Card>
      <Text style={{ fontSize: 18, fontWeight: '800' }}>
        Content Section
      </Text>
      {/* Logic to be migrated here */}
    </Card>
  );
}
