import React from 'react';
import { View } from '@/shared/ui/react-native-web-shim';
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
