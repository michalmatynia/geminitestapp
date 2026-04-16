import React from 'react';

import { useRuntimeDataState } from '@/features/ai/ai-paths/context';

import { AiPathsRuntimeEventLog } from '../AiPathsRuntimeEventLog';

export function AiPathsLiveLog(): React.JSX.Element {
  const { runtimeEvents } = useRuntimeDataState();

  return <AiPathsRuntimeEventLog events={runtimeEvents} />;
}
