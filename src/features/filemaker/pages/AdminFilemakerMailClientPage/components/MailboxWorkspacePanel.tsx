import React from 'react';
import { View } from 'react-native';
import { AdminFilemakerMailClientPageWorkspace } from '../AdminFilemakerMailClientPage.workspace';

interface MailboxWorkspacePanelProps {
  // Add props here as needed during migration
}

export function MailboxWorkspacePanel(props: MailboxWorkspacePanelProps): React.JSX.Element {
  return (
    <View>
      <AdminFilemakerMailClientPageWorkspace {...props} />
    </View>
  );
}
