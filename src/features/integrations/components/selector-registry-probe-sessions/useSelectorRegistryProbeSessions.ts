import { useMemo, useState, useEffect } from 'react';
import {
  useArchiveSelectorRegistryProbeSessionMutation,
  useDeleteSelectorRegistryProbeSessionMutation,
  useRestoreSelectorRegistryProbeSessionMutation,
  useSaveSelectorRegistryEntryMutation,
} from '@/features/integrations/hooks/useSelectorRegistry';
import type { SelectorRegistryProbeSession } from '@/shared/contracts/integrations/selector-registry';
import {
  applySelectorRegistryProbeCarryForwardManualSelection,
} from '@/shared/lib/browser-execution/selector-registry-probe-carry-forward';

export function useSelectorRegistryProbeSessions(sessions: SelectorRegistryProbeSession[]) {
  const saveMutation = useSaveSelectorRegistryEntryMutation();
  const archiveMutation = useArchiveSelectorRegistryProbeSessionMutation();
  const restoreMutation = useRestoreSelectorRegistryProbeSessionMutation();
  const deleteMutation = useDeleteSelectorRegistryProbeSessionMutation();

  const [selectedKeys, setSelectedKeys] = useState<Record<string, string>>({});
  const [manuallySelectedKeys, setManuallySelectedKeys] = useState<Record<string, boolean>>({});

  const activeSessions = useMemo(
    () => sessions.filter((s) => s.archivedAt === null),
    [sessions]
  );

  const suggestionIds = useMemo(
    () =>
      activeSessions.flatMap((s) =>
        s.suggestions.map((sug) => `${s.id}:${sug.suggestionId}`)
      ),
    [activeSessions]
  );
  const activeSuggestionKeySet = useMemo(() => new Set(suggestionIds), [suggestionIds]);

  useEffect(() => {
    setManuallySelectedKeys((current) => {
      const next = Object.fromEntries(
        Object.entries(current).filter(([key]) => activeSuggestionKeySet.has(key))
      );
      return Object.keys(next).length === Object.keys(current).length ? current : next;
    });
  }, [activeSuggestionKeySet]);

  const updateSelection = (itemId: string, selectedKey: string, clusterItems: any[]) => {
    const nextState = applySelectorRegistryProbeCarryForwardManualSelection({
      items: clusterItems,
      selectedKeys,
      manuallySelectedKeys,
      itemId,
      selectedKey,
    });
    setManuallySelectedKeys(nextState.manuallySelectedKeys);
    setSelectedKeys(nextState.selectedKeys);
  };

  return {
    activeSessions,
    selectedKeys,
    setSelectedKeys,
    manuallySelectedKeys,
    setManuallySelectedKeys,
    updateSelection,
    saveMutation,
    archiveMutation,
    restoreMutation,
    deleteMutation,
  };
}
