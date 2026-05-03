import React from 'react';

import { PathsTabPanel } from '../../ui-panels';
import { useAiPathsSettingsPageWorkspaceContext } from '../AiPathsSettingsPageContext';

export function AiPathsListView(): React.JSX.Element | null {
  const { activeTab, onTabChange } = useAiPathsSettingsPageWorkspaceContext();

  if (activeTab !== 'paths') return null;

  return (
    <PathsTabPanel
      onPathOpen={() => {
        onTabChange?.('canvas');
      }}
    />
  );
}
