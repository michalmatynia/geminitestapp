import React from 'react';

import { PathsTabPanel } from '../../ui-panels';
import { useAiPathsSettingsPageContext } from '../AiPathsSettingsPageContext';

export function AiPathsListView(): React.JSX.Element | null {
  const { activeTab, onTabChange } = useAiPathsSettingsPageContext();

  if (activeTab !== 'paths') return null;

  return (
    <PathsTabPanel
      onPathOpen={() => {
        onTabChange?.('canvas');
      }}
    />
  );
}
