'use client';

import { resolveRunHistoryEntryAction } from '@/features/ai/ai-paths/components/run-history-entry-actions';
import { RunHistoryEntries } from '@/features/ai/ai-paths/components/RunHistoryEntries';
import { useRunHistoryActions } from '@/features/ai/ai-paths/context';
import { Button } from '@/shared/ui';

import {
  useAiPathOrchestrator,
  useAiPathRuntime,
  useAiPathSelection,
} from '../../AiPathConfigContext';


export function NodeHistoryTab(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  const { runtimeState } = useAiPathRuntime();
  const { clearNodeHistory } = useAiPathOrchestrator();
  const { resumeRun, retryRunNode } = useRunHistoryActions();
  if (!selectedNode) return null;

  const history = runtimeState.history?.[selectedNode.id] ?? [];
  const hasHistory = history.length > 0;
  const durationMs = runtimeState.nodeDurations?.[selectedNode.id];
  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='space-y-1 text-xs text-gray-400'>
          <div>History entries: {history.length}</div>
          {typeof durationMs === 'number' ? (
            <div className='text-[11px] text-gray-500'>
              Last duration:{' '}
              <span className='font-mono text-gray-200'>
                {durationMs.toFixed(0)}
                ms
              </span>
            </div>
          ) : null}
        </div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => {
            void clearNodeHistory(selectedNode.id);
          }}
          disabled={!hasHistory}
          title={hasHistory ? 'Clear history for this node' : 'No history recorded yet'}
        >
          Clear Node History
        </Button>
      </div>
      <RunHistoryEntries
        entries={history}
        emptyMessage='No history yet. Run the path to capture inputs/outputs for this node.'
        onReplayFromEntry={(entry): void => {
          const currentRunId = runtimeState.currentRun?.id;
          if (!currentRunId) return;
          const action = resolveRunHistoryEntryAction(entry);
          if (action.kind === 'retry_node') {
            void retryRunNode(currentRunId, entry.nodeId).catch(() => {});
            return;
          }
          void resumeRun(currentRunId, action.resumeMode ?? 'replay').catch(() => {});
        }}
      />
    </div>
  );
}
