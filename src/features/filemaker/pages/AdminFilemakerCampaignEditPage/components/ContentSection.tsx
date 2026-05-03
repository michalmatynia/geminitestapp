import React from 'react';
import { Text } from '@/shared/ui/react-native-web-shim';
import { Card } from '@/features/kangur/ui/components';

interface ContentSectionProps {
  contentGroupRegistry: unknown;
  contentLocale: string;
  database: unknown;
  draft: unknown;
  preview: unknown;
  setDraft: unknown;
}

export function ContentSection(_props: ContentSectionProps): React.JSX.Element {
  return (
    <Card>
      <Text style={{ fontSize: 18, fontWeight: '800' }}>
        Content Section
      </Text>
      {/* Logic to be migrated here */}
    </Card>
  );
}
