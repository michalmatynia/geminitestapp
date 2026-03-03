'use client';

import { type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';

import { TRIGGER_EVENTS, triggerButtonsApi } from '@/shared/lib/ai-paths';
import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { SelectSimple, Card, FormField } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

const triggerButtonsQueryKey = QUERY_KEYS.ai.aiPaths.triggerButtons();

// Query for trigger buttons (always called)
const useTriggerButtonsQuery = (): UseQueryResult<AiTriggerButtonRecord[], Error> => {
  return createListQueryV2<AiTriggerButtonRecord[], AiTriggerButtonRecord[]>({
    queryKey: triggerButtonsQueryKey,
    queryFn: async (): Promise<AiTriggerButtonRecord[]> => {
      const result = await triggerButtonsApi.list();
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
    },
  });
};

export function TriggerNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();
  const triggerButtonsQuery = useTriggerButtonsQuery();
  const selectedTriggerEvent = selectedNode?.config?.trigger?.event?.trim() ?? '';

  const triggerEventOptions = useMemo(() => {
    const byId = new Map<string, { id: string; label: string }>();
    TRIGGER_EVENTS.forEach((event: { id: string; label: string }) => {
      byId.set(event.id, event);
    });
    (triggerButtonsQuery.data ?? []).forEach((button: AiTriggerButtonRecord) => {
      if (!button?.id) return;
      if (button.enabled === false && button.id !== selectedTriggerEvent) {
        return;
      }
      if (byId.has(button.id)) return;
      byId.set(button.id, { id: button.id, label: button.name });
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
          options={triggerEventOptions.map((event: { id: string; label: string }) => ({
            value: event.id,
            label: event.label,
          }))}
          placeholder='Select action'
        />
      </FormField>

      <FormField label='Context Source'>
        <SelectSimple
          size='sm'
          variant='subtle'
          value={triggerConfig.contextMode ?? 'trigger_only'}
          onValueChange={(value: string): void =>
            updateSelectedNodeConfig({
              trigger: {
                ...triggerConfig,
                contextMode: value as
                  | 'simulation_required'
                  | 'simulation_preferred'
                  | 'trigger_only',
              },
            })
          }
          options={[
            {
              value: 'simulation_required',
              label: 'Simulation required',
            },
            {
              value: 'simulation_preferred',
              label: 'Simulation preferred',
            },
            {
              value: 'trigger_only',
              label: 'Trigger only',
            },
          ]}
          placeholder='Select context source'
        />
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
