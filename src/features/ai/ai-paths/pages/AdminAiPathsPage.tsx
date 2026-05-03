import { ContextRegistryPageProvider } from '@/features/ai/ai-context-registry/context/page-context';
import { AI_PATHS_CONTEXT_ROOT_IDS } from '../context-registry/workspace';
import { AdminAiPathsPageView } from './AdminAiPathsPageView';
import { AiPathsWorkspaceProvider } from '../context/AiPathsContext';

export function AdminAiPathsPage(): React.JSX.Element {
  return (
    <ContextRegistryPageProvider pageId='admin:ai-paths' title='AI Paths' rootNodeIds={[...AI_PATHS_CONTEXT_ROOT_IDS]}>
      <AiPathsWorkspaceProvider>
        <AdminAiPathsPageView />
      </AiPathsWorkspaceProvider>
    </ContextRegistryPageProvider>
  );
}
