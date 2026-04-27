import React from 'react';
import { View } from '@/shared/ui/react-native-web-shim';
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
