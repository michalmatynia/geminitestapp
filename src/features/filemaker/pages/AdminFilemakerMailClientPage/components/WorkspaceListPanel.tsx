import React from 'react';
import { View } from 'react-native';
import { AdminFilemakerMailClientPageWorkspaceList } from '../AdminFilemakerMailClientPage.workspace-list';

interface WorkspaceListPanelProps {
  // Add props here
}

export function WorkspaceListPanel(props: WorkspaceListPanelProps): React.JSX.Element {
  return (
    <View>
      <AdminFilemakerMailClientPageWorkspaceList {...props} />
    </View>
  );
}
