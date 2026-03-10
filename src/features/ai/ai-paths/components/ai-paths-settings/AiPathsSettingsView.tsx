'use client';

import React from 'react';

import { useAiPathsDocsTooltips } from '@/features/ai/ai-paths/hooks/useAiPathsDocsTooltips';
import { LoadingState } from '@/shared/ui';

import { useAiPathsSettingsPageContext } from './AiPathsSettingsPageContext';
import { usePersistenceState } from '../../context';
import { DocsTooltipEnhancer } from '../DocsTooltipEnhancer';
import { AiPathsCanvasView } from './sections/AiPathsCanvasView';
import { AiPathsDialogs } from './sections/AiPathsDialogs';
import { AiPathsDocsView } from './sections/AiPathsDocsView';
import { AiPathsListView } from './sections/AiPathsListView';


export function AiPathsSettingsView(): React.JSX.Element {
  const { isFocusMode } = useAiPathsSettingsPageContext();
  const { loading } = usePersistenceState();

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
