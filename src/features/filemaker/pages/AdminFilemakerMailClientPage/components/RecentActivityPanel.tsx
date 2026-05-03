import React from 'react';
import { View } from '@/shared/ui/react-native-web-shim';
import { AdminFilemakerMailClientPageRecent } from '../AdminFilemakerMailClientPage.recent';

interface RecentActivityPanelProps {
  // Add props here as needed during migration
}

export function RecentActivityPanel(props: RecentActivityPanelProps): React.JSX.Element {
  return (
    <View>
      <AdminFilemakerMailClientPageRecent {...props} />
    </View>
  );
}
