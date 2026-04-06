import React, { Suspense } from 'react';

import {
  SystemLogsProvider,
} from '@/features/observability/context/SystemLogsContext';
import {
  SYSTEM_LOGS_CONTEXT_ROOT_IDS,
} from '@/shared/lib/observability/runtime-context/system-logs-workspace';
import {
  ContextRegistryPageProvider,
} from '@/shared/lib/ai-context-registry/page-context';
import { LoadingState } from '@/shared/ui/navigation-and-layout.public';

import { SystemLogsContent } from './system-logs/SystemLogsContent';

export default function SystemLogsPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={<LoadingState message='Mounting observation post...' className='h-screen' />}
    >
      <ContextRegistryPageProvider
        pageId='admin:system-logs'
        title='Observation Post'
        rootNodeIds={[...SYSTEM_LOGS_CONTEXT_ROOT_IDS]}
      >
        <SystemLogsProvider>
          <SystemLogsContent />
        </SystemLogsProvider>
      </ContextRegistryPageProvider>
    </Suspense>
  );
}
