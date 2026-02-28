'use client';

import React from 'react';
import { DocsTabPanel } from '../../ui-panels';
import { useAiPathsSettingsPageContext } from '../AiPathsSettingsPageContext';

export function AiPathsDocsView(): React.JSX.Element | null {
  const { activeTab } = useAiPathsSettingsPageContext();

  if (activeTab !== 'docs') return null;

  return <DocsTabPanel />;
}
