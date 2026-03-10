'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';

import type {
  ContextRegistryConsumerEnvelope,
  ContextRegistryResolutionBundle,
} from '@/shared/contracts/ai-context-registry';
import { internalError } from '@/shared/errors/app-error';

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

type ContextRegistryPageStateValue = Omit<
  ContextRegistryPageState,
  'registerSource' | 'unregisterSource'
>;

type ContextRegistryPageActionsValue = Pick<
  ContextRegistryPageState,
  'registerSource' | 'unregisterSource'
>;

const ContextRegistryPageStateContext = createContext<ContextRegistryPageStateValue | null>(null);
const ContextRegistryPageActionsContext = createContext<ContextRegistryPageActionsValue | null>(
  null
);

export function ContextRegistryPageProvider({
  pageId,
  title,
  rootNodeIds = [],
  resolved = null,
  children,
}: ContextRegistryPageProviderProps): React.JSX.Element {
  const [registeredSources, setRegisteredSources] = useState<
    Record<string, ContextRegistryPageSource>
  >({});

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

  const stateValue = useMemo<ContextRegistryPageStateValue>(() => {
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
    };
  }, [pageId, registeredSources, resolved, rootNodeIds, title]);

  const actionsValue = useMemo<ContextRegistryPageActionsValue>(
    () => ({
      registerSource,
      unregisterSource,
    }),
    [registerSource, unregisterSource]
  );

  return (
    <ContextRegistryPageActionsContext.Provider value={actionsValue}>
      <ContextRegistryPageStateContext.Provider value={stateValue}>
        {children}
      </ContextRegistryPageStateContext.Provider>
    </ContextRegistryPageActionsContext.Provider>
  );
}

export function useContextRegistryPageState(): ContextRegistryPageState {
  const state = useContext(ContextRegistryPageStateContext);
  const actions = useContext(ContextRegistryPageActionsContext);
  if (!state || !actions) {
    throw internalError(
      'useContextRegistryPageState must be used within ContextRegistryPageProvider'
    );
  }
  return useMemo(() => ({ ...state, ...actions }), [actions, state]);
}

export function useOptionalContextRegistryPageState(): ContextRegistryPageState | null {
  const state = useContext(ContextRegistryPageStateContext);
  const actions = useContext(ContextRegistryPageActionsContext);
  return useMemo(() => {
    if (!state || !actions) {
      return null;
    }
    return { ...state, ...actions };
  }, [actions, state]);
}

export function useContextRegistryPageActions(): ContextRegistryPageActionsValue {
  const actions = useContext(ContextRegistryPageActionsContext);
  if (!actions) {
    throw internalError(
      'useContextRegistryPageActions must be used within ContextRegistryPageProvider'
    );
  }
  return actions;
}

export function useOptionalContextRegistryPageActions(): ContextRegistryPageActionsValue | null {
  return useContext(ContextRegistryPageActionsContext);
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
  const actions = useOptionalContextRegistryPageActions();
  const registerSource = actions?.registerSource;
  const unregisterSource = actions?.unregisterSource;
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
