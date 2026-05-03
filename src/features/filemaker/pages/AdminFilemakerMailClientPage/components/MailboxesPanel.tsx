import React from 'react';
import { View } from '@/shared/ui/react-native-web-shim';
import { AdminFilemakerMailClientPageMailboxes } from '../AdminFilemakerMailClientPage.mailboxes';

interface MailboxesPanelProps {
  // Add props here
}

export function MailboxesPanel(props: MailboxesPanelProps): React.JSX.Element {
  return (
    <View>
      <AdminFilemakerMailClientPageMailboxes {...props} />
    </View>
  );
}
