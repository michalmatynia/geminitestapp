'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  ContextRegistryConsumerEnvelope,
  ContextRegistryResolutionBundle,
} from '@/shared/contracts/ai-context-registry';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import {
  buildContextRegistryConsumerEnvelope,
  mergeContextRegistryResolutionBundles,
  type ContextRegistryPageSource,
} from './page-context-shared';

export type ContextRegistryPageProviderProps = {
  enabled?: boolean;
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

const {
  Context: ContextRegistryPageStateContext,
  useStrictContext: useRequiredContextRegistryPageState,
  useOptionalContext: useOptionalContextRegistryPageStateValue,
} = createStrictContext<ContextRegistryPageStateValue>({
  hookName: 'useContextRegistryPageState',
  providerName: 'ContextRegistryPageProvider',
  displayName: 'ContextRegistryPageStateContext',
  errorFactory: internalError,
});

const {
  Context: ContextRegistryPageActionsContext,
  useStrictContext: useRequiredContextRegistryPageActions,
  useOptionalContext: useOptionalContextRegistryPageActionsValue,
} = createStrictContext<ContextRegistryPageActionsValue>({
  hookName: 'useContextRegistryPageActions',
  providerName: 'ContextRegistryPageProvider',
  displayName: 'ContextRegistryPageActionsContext',
  errorFactory: internalError,
});

const EMPTY_CONTEXT_REGISTRY_PAGE_SOURCES: ContextRegistryPageSource[] = [];

function createDormantContextRegistryPageStateValue(input: {
  pageId: string;
  title?: string;
}): ContextRegistryPageStateValue {
  return {
    pageId: input.pageId,
    title: input.title,
    sources: EMPTY_CONTEXT_REGISTRY_PAGE_SOURCES,
    envelope: null,
  };
}

function createActiveContextRegistryPageStateValue(input: {
  pageId: string;
  title?: string;
  rootNodeIds: string[];
  resolved: ContextRegistryResolutionBundle | null;
  registeredSources: Record<string, ContextRegistryPageSource>;
}): ContextRegistryPageStateValue {
  const baseSource: ContextRegistryPageSource = {
    sourceId: '__page__',
    label: input.title ?? input.pageId,
    rootNodeIds: input.rootNodeIds,
    resolved: input.resolved,
  };
  const sources = [baseSource, ...Object.values(input.registeredSources)];
  const envelope = buildContextRegistryConsumerEnvelope({
    rootNodeIds: sources.flatMap((source) => source.rootNodeIds ?? []),
    refs: sources.flatMap((source) => source.refs ?? []),
    resolved: mergeContextRegistryResolutionBundles(
      ...sources.map((source) => source.resolved ?? null)
    ),
  });

  return {
    pageId: input.pageId,
    title: input.title,
    sources,
    envelope,
  };
}

function useContextRegistryPageSourceRegistry(
  enabled: boolean
): {
  registeredSources: Record<string, ContextRegistryPageSource>;
  registerSource: (source: ContextRegistryPageSource) => void;
  unregisterSource: (sourceId: string) => void;
} {
  const [registeredSources, setRegisteredSources] = useState<
    Record<string, ContextRegistryPageSource>
  >({});

  useEffect(() => {
    if (!enabled) {
      setRegisteredSources({});
    }
  }, [enabled]);

  const registerSource = useCallback((source: ContextRegistryPageSource) => {
    if (!enabled) {
      return;
    }

    setRegisteredSources((current) => {
      if (current[source.sourceId] === source) {
        return current;
      }
      return {
        ...current,
        [source.sourceId]: source,
      };
    });
  }, [enabled]);

  const unregisterSource = useCallback((sourceId: string) => {
    if (!enabled) {
      return;
    }

    setRegisteredSources((current) => {
      if (!(sourceId in current)) {
        return current;
      }

      const next = { ...current };
      delete next[sourceId];
      return next;
    });
  }, [enabled]);

  return {
    registeredSources,
    registerSource,
    unregisterSource,
  };
}

export function ContextRegistryPageProvider({
  enabled = true,
  pageId,
  title,
  rootNodeIds = [],
  resolved = null,
  children,
}: ContextRegistryPageProviderProps): React.JSX.Element {
  const {
    registeredSources,
    registerSource,
    unregisterSource,
  } = useContextRegistryPageSourceRegistry(enabled);

  const stateValue = useMemo<ContextRegistryPageStateValue>(() => {
    if (!enabled) {
      return createDormantContextRegistryPageStateValue({
        pageId,
        title,
      });
    }

    return createActiveContextRegistryPageStateValue({
      pageId,
      title,
      rootNodeIds,
      resolved,
      registeredSources,
    });
  }, [enabled, pageId, registeredSources, resolved, rootNodeIds, title]);

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
  const state = useRequiredContextRegistryPageState();
  const actions = useRequiredContextRegistryPageActions();
  return useMemo(() => ({ ...state, ...actions }), [actions, state]);
}

export function useOptionalContextRegistryPageState(): ContextRegistryPageState | null {
  const state = useOptionalContextRegistryPageStateValue();
  const actions = useOptionalContextRegistryPageActionsValue();
  return useMemo(() => {
    if (!state || !actions) {
      return null;
    }
    return { ...state, ...actions };
  }, [actions, state]);
}

export function useContextRegistryPageActions(): ContextRegistryPageActionsValue {
  return useRequiredContextRegistryPageActions();
}

export function useOptionalContextRegistryPageActions(): ContextRegistryPageActionsValue | null {
  return useOptionalContextRegistryPageActionsValue();
}

export function useContextRegistryPageEnvelope(): ContextRegistryConsumerEnvelope | null {
  return useContextRegistryPageState().envelope;
}

export function useOptionalContextRegistryPageEnvelope(): ContextRegistryConsumerEnvelope | null {
  return useOptionalContextRegistryPageStateValue()?.envelope ?? null;
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

  useEffect(() => {
    if (!registerSource || !unregisterSource || !stableSource) {
      return undefined;
    }

    registerSource(stableSource);

    return () => {
      unregisterSource(sourceId);
    };
  }, [registerSource, sourceId, stableSource, unregisterSource]);
}
