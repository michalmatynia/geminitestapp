import React from 'react';
import { View } from 'react-native';
import { AdminFilemakerMailClientPageAttention } from '../AdminFilemakerMailClientPage.attention';

interface AttentionPanelProps {
  // Add props here
}

export function AttentionPanel(props: AttentionPanelProps): React.JSX.Element {
  return (
    <View>
      <AdminFilemakerMailClientPageAttention {...props} />
    </View>
  );
}
