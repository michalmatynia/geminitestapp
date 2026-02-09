'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';

import { TRIGGER_EVENTS, triggerButtonsApi } from '@/features/ai/ai-paths/lib';
import type { AiTriggerButtonRecord } from '@/shared/types/ai-trigger-buttons';
import { Label, UnifiedSelect } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

// Query for trigger buttons (always called)
const useTriggerButtonsQuery = (): UseQueryResult<AiTriggerButtonRecord[], Error> => useQuery({
  queryKey: ['ai-paths', 'trigger-buttons'],
  queryFn: async (): Promise<AiTriggerButtonRecord[]> => {
    const result = await triggerButtonsApi.list();
    if (!result.ok) return [];
    return Array.isArray(result.data) ? result.data : [];
  },
  staleTime: 10_000,
});

export function TriggerNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();
  const triggerButtonsQuery = useTriggerButtonsQuery();

  const triggerEventOptions = useMemo(() => {
    const byId = new Map<string, { id: string; label: string }>();
    TRIGGER_EVENTS.forEach((event: { id: string; label: string }) => {
      byId.set(event.id, event);
    });
    (triggerButtonsQuery.data ?? []).forEach((button: AiTriggerButtonRecord) => {
      if (!button?.id) return;
      if (byId.has(button.id)) return;
      byId.set(button.id, { id: button.id, label: button.name });
    });
    return Array.from(byId.values());
  }, [triggerButtonsQuery.data]);

  if (!selectedNode || selectedNode.type !== 'trigger') return null;

  const triggerConfig = selectedNode.config?.trigger ?? {
    event: TRIGGER_EVENTS[0]?.id ?? 'manual',
  };
  const isScheduled = triggerConfig.event === 'scheduled_run';

  if (!selectedNode.config) return null; // Added type guard

  return (
    <div className='space-y-4'>
      <div>
        <Label className='text-xs text-gray-400'>Trigger Action</Label>
        <UnifiedSelect
          value={triggerConfig.event}
          onValueChange={(value: string): void =>
            updateSelectedNodeConfig({
              trigger: { event: value },
            })
          }
          options={triggerEventOptions.map((event: { id: string; label: string }) => ({
            value: event.id,
            label: event.label
          }))}
          placeholder='Select action'
          triggerClassName='mt-2 w-full border-border bg-card/70 text-sm text-white'
        />
      </div>
      {isScheduled ? (
        <div className='rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100'>
          <div className='text-[10px] font-semibold uppercase tracking-wide text-amber-200'>
            Server Schedule
          </div>
          <div className='mt-1 text-amber-100/80'>
            This trigger runs from server schedules or cron. Context input is optional,
            and manual runs are allowed for testing.
          </div>
        </div>
      ) : null}
    </div>
  );
}
