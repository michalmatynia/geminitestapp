'use client';
import { RunHistoryEntries } from '@/features/ai/ai-paths/components/RunHistoryEntries';
import type { RuntimeHistoryEntry } from '@/features/ai/ai-paths/lib';
import { Button } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

export function NodeHistoryTab(): React.JSX.Element | null {
  const { selectedNode, runtimeState, clearNodeHistory } = useAiPathConfig();
  if (!selectedNode) return null;

  const history = (runtimeState.history?.[selectedNode.id] ?? []) as RuntimeHistoryEntry[];
  const hasHistory = history.length > 0;
  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='text-xs text-gray-400'>
          History entries: {history.length}
        </div>
        <Button
          type='button'
          className='rounded-md border border-border px-3 py-1 text-xs text-gray-300 hover:bg-card/60'
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
      />
    </div>
  );
}
