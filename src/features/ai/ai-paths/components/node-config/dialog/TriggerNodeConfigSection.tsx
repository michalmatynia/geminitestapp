'use client';

import { type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import { TRIGGER_EVENTS, triggerButtonsApi } from '@/shared/lib/ai-paths';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { SelectSimple, FormField } from '@/shared/ui/forms-and-actions.public';
import { Card } from '@/shared/ui/primitives.public';

import { useAiPathOrchestrator, useAiPathSelection } from '../../AiPathConfigContext';

const triggerButtonsQueryKey = QUERY_KEYS.ai.aiPaths.triggerButtons();

// Query for trigger buttons (always called)
const useTriggerButtonsQuery = (): UseQueryResult<AiTriggerButtonRecord[], Error> => {
  return createListQueryV2<AiTriggerButtonRecord[], AiTriggerButtonRecord[]>({
    queryKey: triggerButtonsQueryKey,
    queryFn: async (): Promise<AiTriggerButtonRecord[]> => {
      const result = await triggerButtonsApi.list({ entityType: 'custom' });
      if (!result.ok) return [];
      return Array.isArray(result.data) ? result.data : [];
    },
    // Use cached data immediately, but always validate freshness on mount.
    staleTime: 5 * 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    meta: {
      source: 'ai.ai-paths.node-config.trigger-buttons',
      operation: 'list',
      resource: 'ai-paths.trigger-buttons',
      domain: 'ai_paths',
      tags: ['ai-paths', 'node-config', 'trigger-buttons'],
      description: 'Loads ai paths trigger buttons.'},
  });
};

export function TriggerNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  const { updateSelectedNodeConfig } = useAiPathOrchestrator();
  const triggerButtonsQuery = useTriggerButtonsQuery();
  const selectedTriggerEvent = selectedNode?.config?.trigger?.event?.trim() ?? '';

  const triggerEventOptions = useMemo<Array<LabeledOptionDto<string>>>(() => {
    const byId = new Map<string, LabeledOptionDto<string>>();
    TRIGGER_EVENTS.forEach((event: { id: string; label: string }) => {
      byId.set(event.id, { value: event.id, label: event.label });
    });
    (triggerButtonsQuery.data ?? []).forEach((button: AiTriggerButtonRecord) => {
      if (!button?.id) return;
      if (button.enabled === false && button.id !== selectedTriggerEvent) {
        return;
      }
      if (byId.has(button.id)) return;
      byId.set(button.id, { value: button.id, label: button.name });
    });
    return Array.from(byId.values());
  }, [selectedTriggerEvent, triggerButtonsQuery.data]);

  if (selectedNode?.type !== 'trigger') return null;

  const triggerConfig = selectedNode.config?.trigger ?? {
    event: TRIGGER_EVENTS[0]?.id ?? 'manual',
    contextMode: 'trigger_only',
  };
  const isScheduled = triggerConfig.event === 'scheduled_run';

  if (!selectedNode.config) return null; // Added type guard

  return (
    <div className='space-y-4'>
      <FormField label='Trigger Action'>
        <SelectSimple
          size='sm'
          variant='subtle'
          value={triggerConfig.event}
          onValueChange={(value: string): void =>
            updateSelectedNodeConfig({
              trigger: {
                ...triggerConfig,
                event: value,
              },
            })
          }
          options={triggerEventOptions}
          placeholder='Select action'
         ariaLabel='Select action' title='Select action'/>
      </FormField>

      <FormField label='Context Source'>
        <Card variant='outline' padding='sm' className='text-[11px] text-muted-foreground'>
          Trigger context mode is fixed to <span className='font-medium'>Trigger only</span>.
          Resolve entity context downstream with a Fetcher or Simulation node.
        </Card>
      </FormField>

      {isScheduled ? (
        <Card variant='warning' padding='sm' className='text-[11px] text-amber-100'>
          <div className='text-[10px] font-semibold uppercase tracking-wide text-amber-200'>
            Server Schedule
          </div>
          <div className='mt-1 text-amber-100/80'>
            This trigger runs from server schedules or cron. Context input is optional, and manual
            runs are allowed for testing.
          </div>
        </Card>
      ) : null}
    </div>
  );
}
