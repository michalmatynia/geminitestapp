import React from 'react';
import { View } from 'react-native';
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
