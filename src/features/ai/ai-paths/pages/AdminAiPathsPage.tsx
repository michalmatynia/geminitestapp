'use client';
import { ContextRegistryPageProvider } from '@/features/ai/ai-context-registry/context/page-context';
import { AI_PATHS_CONTEXT_ROOT_IDS } from '../context-registry/workspace';
import { AdminAiPathsPageView } from './AdminAiPathsPageView';
import { AiPathsProvider } from '../context/AiPathsContext';

export function AdminAiPathsPage(): React.JSX.Element {
  return (
    <ContextRegistryPageProvider pageId='admin:ai-paths' title='AI Paths' rootNodeIds={[...AI_PATHS_CONTEXT_ROOT_IDS]}>
      <AiPathsProvider>
        <AdminAiPathsPageView />
      </AiPathsProvider>
    </ContextRegistryPageProvider>
  );
}
