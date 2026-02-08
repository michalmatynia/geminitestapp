'use client';
import { RunHistoryEntries } from '@/features/ai/ai-paths/components/RunHistoryEntries';
import type { AiNode, RuntimeState } from '@/features/ai/ai-paths/lib';
import { Button } from '@/shared/ui';

type NodeHistoryTabProps = {
  selectedNode: AiNode;
  runtimeState: RuntimeState;
  onClearNodeHistory?: (nodeId: string) => void | Promise<void>;
};

export function NodeHistoryTab({
  selectedNode,
  runtimeState,
  onClearNodeHistory,
}: NodeHistoryTabProps): React.JSX.Element {
  const history = (runtimeState.history?.[selectedNode.id] ?? []);
  const hasHistory = history.length > 0;
  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='text-xs text-gray-400'>
          History entries: {history.length}
        </div>
        {onClearNodeHistory ? (
          <Button
            type='button'
            className='rounded-md border border-border px-3 py-1 text-xs text-gray-300 hover:bg-card/60'
            onClick={() => {
              void onClearNodeHistory(selectedNode.id);
            }}
            disabled={!hasHistory}
            title={hasHistory ? 'Clear history for this node' : 'No history recorded yet'}
          >
            Clear Node History
          </Button>
        ) : null}
      </div>
      <RunHistoryEntries
        entries={history}
        emptyMessage='No history yet. Run the path to capture inputs/outputs for this node.'
      />
    </div>
  );
}
