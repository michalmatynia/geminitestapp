
import type { AiNode, PathConfig } from '@/shared/contracts/ai-paths';
import {
  AI_PATHS_UI_STATE_KEY,
  TRIGGER_EVENTS,
} from '@/shared/lib/ai-paths/core/constants';
import { safeParseJson } from '@/shared/lib/ai-paths/core/utils/runtime';
import { loadPathConfigsFromSettings } from './trigger-event-settings';

export type TriggerSelectionCandidate = Pick<PathConfig, 'id' | 'isActive'>;

export const selectTriggerCandidates = <T extends TriggerSelectionCandidate>(args: {
  triggerCandidates: T[];
  preferredPathId: string | null;
  activePathId: string | null;
}): {
  activeTriggerCandidates: T[];
  selectedConfig: T | null;
  missingPreferredPathId: string | null;
  usedSingleActiveFallback: boolean;
} => {
  const { triggerCandidates, preferredPathId, activePathId } = args;
  const activeTriggerCandidates: T[] = triggerCandidates.filter(
    (config: T): boolean => config.isActive !== false
  );

  const preferredByButton = preferredPathId
    ? (triggerCandidates.find((config: T): boolean => config.id === preferredPathId) ?? null)
    : null;

  if (preferredPathId) {
    if (preferredByButton) {
      return {
        activeTriggerCandidates,
        selectedConfig: preferredByButton,
        missingPreferredPathId: null,
        usedSingleActiveFallback: false,
      };
    }

    if (activeTriggerCandidates.length === 1) {
      return {
        activeTriggerCandidates,
        selectedConfig: activeTriggerCandidates[0] ?? null,
        missingPreferredPathId: preferredPathId,
        usedSingleActiveFallback: true,
      };
    }

    return {
      activeTriggerCandidates,
      selectedConfig: null,
      missingPreferredPathId: preferredPathId,
      usedSingleActiveFallback: false,
    };
  }

  const preferredByActivePath = activePathId
    ? (activeTriggerCandidates.find((config: T): boolean => config.id === activePathId) ?? null)
    : null;

  if (activeTriggerCandidates.length > 1 && !preferredByActivePath) {
    return {
      activeTriggerCandidates,
      selectedConfig: null,
      missingPreferredPathId: null,
      usedSingleActiveFallback: false,
    };
  }

  return {
    activeTriggerCandidates,
    selectedConfig:
      preferredByActivePath ?? activeTriggerCandidates[0] ?? triggerCandidates[0] ?? null,
    missingPreferredPathId: null,
    usedSingleActiveFallback: false,
  };
};

export const resolveTriggerSelection = async (
  settingsData: Array<{ key: string; value: string }>,
  triggerEventId: string,
  options?: {
    preferredPathId?: string | null | undefined;
    preferredActivePathId?: string | null | undefined;
  }
): Promise<{
  triggerCandidates: PathConfig[];
  activeTriggerCandidates: PathConfig[];
  selectedConfig: PathConfig | null;
  uiState: Record<string, unknown> | null;
  missingPreferredPathId: string | null;
  usedSingleActiveFallback: boolean;
}> => {
  const { configs, settingsPathOrder } = await loadPathConfigsFromSettings(settingsData);
  const configsList: PathConfig[] = Object.values(configs);
  const pathOrder: string[] = settingsPathOrder;
  const map = new Map<string, string>(
    settingsData.map((item: { key: string; value: string }) => [item.key, item.value])
  );
  const uiStateRaw = map.get(AI_PATHS_UI_STATE_KEY);
  const uiStateEnvelope = uiStateRaw ? safeParseJson<{ value?: unknown }>(uiStateRaw).value : null;
  const uiStateParsed =
    uiStateEnvelope && typeof uiStateEnvelope === 'object' ? uiStateEnvelope['value'] : null;
  const uiState =
    uiStateParsed && typeof uiStateParsed === 'object'
      ? (uiStateParsed as Record<string, unknown>)
      : null;

  const orderedConfigs: PathConfig[] = pathOrder.length
    ? pathOrder
      .map((id: string) => configs[id])
      .filter((config: PathConfig | undefined): config is PathConfig => Boolean(config))
    : configsList;

  const fallbackTriggerEventId = (TRIGGER_EVENTS[0]?.id as string) ?? 'manual';
  const triggerCandidates: PathConfig[] = orderedConfigs.filter((config: PathConfig) =>
    Array.isArray(config?.nodes)
      ? config.nodes.some((node: AiNode) => {
        if (node.type !== 'trigger') return false;
        const configuredEvent = node.config?.trigger?.event ?? fallbackTriggerEventId;
        return configuredEvent === triggerEventId;
      })
      : false
  );

  const preferredPathId =
    typeof options?.preferredPathId === 'string' && options.preferredPathId.trim().length > 0
      ? options.preferredPathId.trim()
      : null;
  const activePathId =
    (typeof options?.preferredActivePathId === 'string' &&
    options.preferredActivePathId.trim().length > 0
      ? options.preferredActivePathId.trim()
      : null) ??
    (typeof uiState?.['activePathId'] === 'string' && uiState['activePathId'].trim().length > 0
      ? uiState['activePathId'].trim()
      : null);

  const selection = selectTriggerCandidates<PathConfig>({
    triggerCandidates,
    preferredPathId,
    activePathId,
  });

  return {
    triggerCandidates,
    activeTriggerCandidates: selection.activeTriggerCandidates,
    selectedConfig: selection.selectedConfig,
    uiState,
    missingPreferredPathId: selection.missingPreferredPathId,
    usedSingleActiveFallback: selection.usedSingleActiveFallback,
  };
};
