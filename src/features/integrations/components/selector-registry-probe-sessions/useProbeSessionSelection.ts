'use client';

import React, { useEffect, useMemo } from 'react';
import type {
  SelectorRegistryProbeSession,
  SelectorRegistryProbeSessionCluster,
} from '@/shared/contracts/integrations/selector-registry';
import {
  applySelectorRegistryProbeCarryForwardDefaults,
  buildSelectorRegistryProbeCarryForwardItems,
} from '@/shared/lib/browser-execution/selector-registry-probe-carry-forward';

function useSyncManuallySelectedKeys(params: {
  suggestionIds: string[];
  setManuallySelectedKeys: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}): void {
  const { suggestionIds, setManuallySelectedKeys } = params;
  const activeSuggestionKeySet = useMemo(() => new Set(suggestionIds), [suggestionIds]);

  useEffect(() => {
    if (suggestionIds.length === 0) {
      setManuallySelectedKeys({});
      return;
    }

    setManuallySelectedKeys((current: Record<string, boolean>) => {
      const next = Object.fromEntries(
        Object.entries(current).filter(([suggestionKey]) => activeSuggestionKeySet.has(suggestionKey))
      );
      return Object.keys(next).length === Object.keys(current).length ? current : next;
    });
  }, [activeSuggestionKeySet, suggestionIds, setManuallySelectedKeys]);
}

function useSyncSelectedKeys(params: {
  suggestionIds: string[];
  resolvedClusters: SelectorRegistryProbeSessionCluster[];
  defaultKeysByRole: Map<string, string>;
  manuallySelectedKeys: Record<string, boolean>;
  setSelectedKeys: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}): void {
  const { suggestionIds, resolvedClusters, defaultKeysByRole, manuallySelectedKeys, setSelectedKeys } = params;

  useEffect(() => {
    if (suggestionIds.length === 0) {
      setSelectedKeys({});
      return;
    }

    setSelectedKeys((current: Record<string, string>) => {
      const next: Record<string, string> = {};

      for (const cluster of resolvedClusters) {
        Object.assign(
          next,
          applySelectorRegistryProbeCarryForwardDefaults({
            items: buildSelectorRegistryProbeCarryForwardItems({
              items: cluster.sessions.flatMap((session) =>
                session.suggestions.map((suggestion) => ({
                  sessionId: session.id,
                  suggestion,
                }))
              ),
              getItemId: (item) => `${item.sessionId}:${item.suggestion.suggestionId}`,
              getRole: (item) => item.suggestion.classificationRole,
              defaultKeysByRole,
            }),
            selectedKeys: current,
            manuallySelectedKeys,
          })
        );
      }
      return next;
    });
  }, [defaultKeysByRole, manuallySelectedKeys, resolvedClusters, suggestionIds, setSelectedKeys]);
}

export function useProbeSessionSelection(params: {
  activeSessions: SelectorRegistryProbeSession[];
  resolvedClusters: SelectorRegistryProbeSessionCluster[];
  defaultKeysByRole: Map<string, string>;
  manuallySelectedKeys: Record<string, boolean>;
  setManuallySelectedKeys: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setSelectedKeys: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}): void {
  const {
    activeSessions,
    resolvedClusters,
    defaultKeysByRole,
    manuallySelectedKeys,
    setManuallySelectedKeys,
    setSelectedKeys,
  } = params;

  const suggestionIds = useMemo(
    () =>
      activeSessions.flatMap((session) =>
        session.suggestions.map((suggestion) => `${session.id}:${suggestion.suggestionId}`)
      ),
    [activeSessions]
  );

  useSyncManuallySelectedKeys({ suggestionIds, setManuallySelectedKeys });
  useSyncSelectedKeys({
    suggestionIds,
    resolvedClusters,
    defaultKeysByRole,
    manuallySelectedKeys,
    setSelectedKeys,
  });
}
