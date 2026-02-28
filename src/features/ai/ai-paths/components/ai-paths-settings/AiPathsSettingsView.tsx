'use client';

import React from 'react';
import { useAiPathsSettingsPageContext } from './AiPathsSettingsPageContext';
import { useAiPathsSettingsOrchestrator } from './AiPathsSettingsOrchestratorContext';
import { AiPathsCanvasView } from './sections/AiPathsCanvasView';
import { AiPathsListView } from './sections/AiPathsListView';
import { AiPathsDocsView } from './sections/AiPathsDocsView';
import { AiPathsDialogs } from './sections/AiPathsDialogs';
import { LoadingState } from '@/shared/ui';
import { DocsTooltipEnhancer } from '../DocsTooltipEnhancer';
import { useAiPathsDocsTooltips } from '@/features/ai/ai-paths/hooks/useAiPathsDocsTooltips';

export function AiPathsSettingsView(): React.JSX.Element {
  const { isFocusMode } = useAiPathsSettingsPageContext();
  const { loading } = useAiPathsSettingsOrchestrator();

  const { docsTooltipsEnabled } = useAiPathsDocsTooltips();

  if (loading) {
    return <LoadingState message='Loading AI Paths...' className='py-12' />;
  }

  return (
    <div id='ai-paths-docs-root' className={isFocusMode ? 'h-full space-y-0' : 'space-y-6'}>
      <DocsTooltipEnhancer rootId='ai-paths-docs-root' enabled={docsTooltipsEnabled} />

      <AiPathsCanvasView />
      <AiPathsListView />
      <AiPathsDocsView />

      <AiPathsDialogs />
    </div>
  );
}
