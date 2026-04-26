import React from 'react';
import { View } from 'react-native';
import { AdminFilemakerMailClientPageFocused } from '../AdminFilemakerMailClientPage.focused';

interface FocusedViewPanelProps {
  // Add props here
}

export function FocusedViewPanel(props: FocusedViewPanelProps): React.JSX.Element {
  return (
    <View>
      <AdminFilemakerMailClientPageFocused {...props} />
    </View>
  );
}
