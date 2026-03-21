'use client';

import React from 'react';

import { useRuntimeState } from '@/features/ai/ai-paths/context';

import { AiPathsRuntimeEventLog } from '../AiPathsRuntimeEventLog';

export function AiPathsLiveLog(): React.JSX.Element {
  const { runtimeEvents } = useRuntimeState();

  return <AiPathsRuntimeEventLog events={runtimeEvents} />;
}
