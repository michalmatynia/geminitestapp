'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';

import type { ContextRegistryConsumerEnvelope, ContextRegistryResolutionBundle } from '@/shared/contracts/ai-context-registry';
import {
  buildContextRegistryConsumerEnvelope,
  mergeContextRegistryResolutionBundles,
  type ContextRegistryPageSource,
} from './page-context-shared';

export type ContextRegistryPageProviderProps = {
  pageId: string;
  title?: string;
  rootNodeIds?: string[];
  resolved?: ContextRegistryResolutionBundle | null;
  children: React.ReactNode;
};

export type ContextRegistryPageState = {
  pageId: string;
  title?: string;
  sources: ContextRegistryPageSource[];
  envelope: ContextRegistryConsumerEnvelope | null;
  registerSource: (source: ContextRegistryPageSource) => void;
  unregisterSource: (sourceId: string) => void;
};

const ContextRegistryPageContext = createContext<ContextRegistryPageState | null>(null);

export function ContextRegistryPageProvider({
  pageId,
  title,
  rootNodeIds = [],
  resolved = null,
  children,
}: ContextRegistryPageProviderProps): React.JSX.Element {
  const [registeredSources, setRegisteredSources] = useState<Record<string, ContextRegistryPageSource>>(
    {}
  );

  const registerSource = useCallback((source: ContextRegistryPageSource) => {
    setRegisteredSources((current) => {
      if (current[source.sourceId] === source) {
        return current;
      }
      return {
        ...current,
        [source.sourceId]: source,
      };
    });
  }, []);

  const unregisterSource = useCallback((sourceId: string) => {
    setRegisteredSources((current) => {
      if (!(sourceId in current)) {
        return current;
      }

      const next = { ...current };
      delete next[sourceId];
      return next;
    });
  }, []);

  const value = useMemo<ContextRegistryPageState>(() => {
    const baseSource: ContextRegistryPageSource = {
      sourceId: '__page__',
      label: title ?? pageId,
      rootNodeIds,
      resolved,
    };
    const sources = [baseSource, ...Object.values(registeredSources)];
    const envelope = buildContextRegistryConsumerEnvelope({
      rootNodeIds: sources.flatMap((source) => source.rootNodeIds ?? []),
      refs: sources.flatMap((source) => source.refs ?? []),
      resolved: mergeContextRegistryResolutionBundles(
        ...sources.map((source) => source.resolved ?? null)
      ),
    });

    return {
      pageId,
      title,
      sources,
      envelope,
      registerSource,
      unregisterSource,
    };
  }, [pageId, registerSource, registeredSources, resolved, rootNodeIds, title, unregisterSource]);

  return (
    <ContextRegistryPageContext.Provider value={value}>
      {children}
    </ContextRegistryPageContext.Provider>
  );
}

export function useContextRegistryPageState(): ContextRegistryPageState {
  const context = useContext(ContextRegistryPageContext);
  if (!context) {
    throw new Error('useContextRegistryPageState must be used within ContextRegistryPageProvider');
  }
  return context;
}

export function useOptionalContextRegistryPageState(): ContextRegistryPageState | null {
  return useContext(ContextRegistryPageContext);
}

export function useContextRegistryPageEnvelope(): ContextRegistryConsumerEnvelope | null {
  return useContextRegistryPageState().envelope;
}

export function useOptionalContextRegistryPageEnvelope(): ContextRegistryConsumerEnvelope | null {
  return useOptionalContextRegistryPageState()?.envelope ?? null;
}

export function useRegisterContextRegistryPageSource(
  sourceId: string,
  source: Omit<ContextRegistryPageSource, 'sourceId'> | null | undefined
): void {
  const context = useOptionalContextRegistryPageState();
  const registerSource = context?.registerSource;
  const unregisterSource = context?.unregisterSource;
  const sourceSignature = source ? JSON.stringify(source) : null;
  const stableSource = useMemo(
    () =>
      source
        ? {
          sourceId,
          ...source,
        }
        : null,
    [sourceId, sourceSignature]
  );

  useLayoutEffect(() => {
    if (!registerSource || !unregisterSource || !stableSource) {
      return;
    }

    registerSource(stableSource);

    return () => {
      unregisterSource(sourceId);
    };
  }, [registerSource, sourceId, stableSource, unregisterSource]);
}
