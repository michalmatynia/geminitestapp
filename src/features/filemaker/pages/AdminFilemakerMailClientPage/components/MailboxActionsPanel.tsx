import React from 'react';
import { View } from '@/shared/ui/react-native-web-shim';
import { AdminFilemakerMailClientPageMailboxActions } from '../AdminFilemakerMailClientPage.mailbox-actions';

interface MailboxActionsPanelProps {
  // Add props here as needed
}

export function MailboxActionsPanel(props: MailboxActionsPanelProps): React.JSX.Element {
  return (
    <View>
      <AdminFilemakerMailClientPageMailboxActions {...props} />
    </View>
  );
}
