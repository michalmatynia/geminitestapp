import React from 'react';
import { View } from 'react-native';
import { AdminFilemakerMailClientPageWorkspaceReply } from '../AdminFilemakerMailClientPage.workspace-reply';

interface WorkspaceReplyPanelProps {
  // Add props here as needed
}

export function WorkspaceReplyPanel(props: WorkspaceReplyPanelProps): React.JSX.Element {
  return (
    <View>
      <AdminFilemakerMailClientPageWorkspaceReply {...props} />
    </View>
  );
}
