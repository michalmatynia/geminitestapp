import React from 'react';

import { DocsTabPanel } from '../../ui-panels';
import { useAiPathsSettingsPageWorkspaceContext } from '../AiPathsSettingsPageContext';

export function AiPathsDocsView(): React.JSX.Element | null {
  const { activeTab } = useAiPathsSettingsPageWorkspaceContext();

  if (activeTab !== 'docs') return null;

  return <DocsTabPanel />;
}
