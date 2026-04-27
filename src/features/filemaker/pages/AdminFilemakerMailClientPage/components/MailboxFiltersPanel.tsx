import React from 'react';
import { View } from '@/shared/ui/react-native-web-shim';
import { AdminFilemakerMailClientPageFilters } from '../AdminFilemakerMailClientPage.filters';

interface MailboxFiltersPanelProps {
  // Add props here as needed during migration
}

export function MailboxFiltersPanel(props: MailboxFiltersPanelProps): React.JSX.Element {
  return (
    <View>
      <AdminFilemakerMailClientPageFilters {...props} />
    </View>
  );
}
