import React from 'react';
import { View } from 'react-native';
import { AdminFilemakerMailClientPageWorkspaceReader } from '../AdminFilemakerMailClientPage.workspace-reader';

interface WorkspaceReaderPanelProps {
  // Add props here as needed
}

export function WorkspaceReaderPanel(props: WorkspaceReaderPanelProps): React.JSX.Element {
  return (
    <View>
      <AdminFilemakerMailClientPageWorkspaceReader {...props} />
    </View>
  );
}
