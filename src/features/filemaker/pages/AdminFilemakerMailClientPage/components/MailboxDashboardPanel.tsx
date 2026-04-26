import React from 'react';
import { View } from 'react-native';
import { AdminFilemakerMailClientPageDashboard } from '../AdminFilemakerMailClientPage.dashboard';

interface MailboxDashboardPanelProps {
  // Add props here as needed during migration
}

export function MailboxDashboardPanel(props: MailboxDashboardPanelProps): React.JSX.Element {
  return (
    <View>
      <AdminFilemakerMailClientPageDashboard {...props} />
    </View>
  );
}
