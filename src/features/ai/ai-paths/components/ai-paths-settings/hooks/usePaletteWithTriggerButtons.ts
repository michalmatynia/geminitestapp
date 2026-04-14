'use client';
'use no memo';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import type { NodeDefinition } from '@/shared/contracts/ai-paths';
import { TRIGGER_INPUT_PORTS, TRIGGER_OUTPUT_PORTS } from '@/shared/lib/ai-paths/core/constants';
import { palette } from '@/shared/lib/ai-paths/core/definitions';
import { derivePaletteNodeTypeId } from '@/shared/lib/ai-paths/core/utils';
import { triggerButtonsApi } from '@/shared/lib/ai-paths/api';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export function usePaletteWithTriggerButtons({
  enabled = true,
}: {
  enabled?: boolean;
} = {}): NodeDefinition[] {
  const triggerButtonsQuery = useQuery<AiTriggerButtonRecord[]>({
    queryKey: QUERY_KEYS.ai.aiPaths.triggerButtons(),
    queryFn: async () => {
      const response = await triggerButtonsApi.list({ entityType: 'custom' });
      if (!response.ok) throw new Error(response.error);
      return response.data;
    },
    enabled,
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
