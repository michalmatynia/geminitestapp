'use client';

import { useMemo } from 'react';

import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import type { NodeDefinition } from '@/shared/lib/ai-paths';
import {
  palette,
  derivePaletteNodeTypeId,
  TRIGGER_INPUT_PORTS,
  TRIGGER_OUTPUT_PORTS,
  triggerButtonsApi,
} from '@/shared/lib/ai-paths';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export function usePaletteWithTriggerButtons(): NodeDefinition[] {
  const triggerButtonsQuery = createListQueryV2<AiTriggerButtonRecord[], AiTriggerButtonRecord[]>({
    queryKey: QUERY_KEYS.ai.aiPaths.triggerButtons(),
    queryFn: async () => {
      const response = await triggerButtonsApi.list({ entityType: 'custom' });
      if (!response.ok) throw new Error(response.error);
      return response.data;
    },
    meta: {
      source: 'ai.ai-paths.settings.trigger-buttons',
      operation: 'list',
      resource: 'aiPaths.triggerButtons',
      domain: 'global',
    },
  });

  return useMemo<NodeDefinition[]>(() => {
    const buttons = (triggerButtonsQuery.data ?? [])
      .filter((button: AiTriggerButtonRecord): boolean => button.enabled !== false)
      .reduce((acc: AiTriggerButtonRecord[], button: AiTriggerButtonRecord) => {
        if (!button.id || acc.some((item: AiTriggerButtonRecord) => item.id === button.id)) {
          return acc;
        }
        acc.push(button);
        return acc;
      }, []);
    if (buttons.length === 0) return palette;

    const usedTitles = new Set<string>(palette.map((node: NodeDefinition) => node.title));
    const derived: NodeDefinition[] = [];
    buttons.forEach((button: AiTriggerButtonRecord) => {
      const nameLabel = button.name.trim();
      const displayLabel = button.display.label.trim();
      const label = nameLabel || displayLabel;
      if (!label) return;

      const baseTitle = `Trigger: ${label}`;
      let title = baseTitle;
      let suffix = 2;
      while (usedTitles.has(title)) {
        title = `${baseTitle} (${suffix})`;
        suffix += 1;
      }
      usedTitles.add(title);
      const triggerConfig = { trigger: { event: button.id } };
      derived.push({
        type: 'trigger',
        nodeTypeId: derivePaletteNodeTypeId({
          type: 'trigger',
          title,
          config: triggerConfig,
        }),
        title,
        description: `User trigger button: ${label} (${button.id}).`,
        inputs: TRIGGER_INPUT_PORTS,
        outputs: TRIGGER_OUTPUT_PORTS,
        config: triggerConfig,
      });
    });

    return [...palette, ...derived];
  }, [triggerButtonsQuery.data]);
}
