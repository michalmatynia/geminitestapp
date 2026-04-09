import React from 'react';

import { DOCUMENTATION_MODULE_IDS } from '@/shared/contracts/documentation';
import { LoadingState } from '@/shared/ui/navigation-and-layout.public';
import { DocumentationTooltipEnhancer as DocsTooltipEnhancer } from '@/shared/lib/documentation/DocumentationTooltipEnhancer';

import {
  useAiPathsSettingsPageDiagnosticsContext,
  useAiPathsSettingsPageWorkspaceContext,
} from './AiPathsSettingsPageContext';
import { usePersistenceState } from '../../context';
import { AiPathsCanvasView } from './sections/AiPathsCanvasView';
import { AiPathsDialogs } from './sections/AiPathsDialogs';
import { AiPathsDocsView } from './sections/AiPathsDocsView';
import { AiPathsListView } from './sections/AiPathsListView';


export function AiPathsSettingsView(): React.JSX.Element {
  const { activeTab, isFocusMode } = useAiPathsSettingsPageWorkspaceContext();
  const { loading } = usePersistenceState();

  const { docsTooltipsEnabled } = useAiPathsSettingsPageDiagnosticsContext();

  if (loading) {
    return <LoadingState message='Loading AI Paths...' className='py-12' />;
  }

  return (
    <div id='ai-paths-docs-root' className={isFocusMode ? 'h-full space-y-0' : 'space-y-6'}>
      <DocsTooltipEnhancer
        rootId='ai-paths-docs-root'
        enabled={docsTooltipsEnabled}
        moduleId={DOCUMENTATION_MODULE_IDS.aiPaths}
        fallbackDocId='workflow_overview'
      />

      {activeTab === 'canvas' ? <AiPathsCanvasView /> : null}
      {activeTab === 'paths' ? <AiPathsListView /> : null}
      {activeTab === 'docs' ? <AiPathsDocsView /> : null}

      <AiPathsDialogs />
    </div>
  );
}
