'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { resolveKangurUserScopeKey } from '@/features/kangur/ui/context/kangur-user-scope';
import {
  hasPersistedSubjectFocus,
  loadPersistedSubjectFocus,
  loadRemoteSubjectFocus,
  normalizeKangurSubjectFocusSubject,
  persistSubjectFocus,
  persistRemoteSubjectFocus,
  subscribeToSubjectFocusChanges,
} from '@/features/kangur/ui/services/subject-focus';
import { DEFAULT_KANGUR_SUBJECT } from '@/features/kangur/lessons/lesson-catalog-metadata';
import { setProgressScope } from '@/features/kangur/ui/services/progress';
import type { KangurLessonSubject } from '@/shared/contracts/kangur';
import { internalError } from '@/shared/errors/app-error';

type KangurSubjectFocusStateContextValue = {
  subject: KangurLessonSubject;
  subjectKey: string | null;
};

type KangurSubjectFocusActionsContextValue = {
  setSubject: (subject: KangurLessonSubject) => void;
};

const KangurSubjectFocusStateContext = createContext<KangurSubjectFocusStateContextValue | null>(
  null
);
const KangurSubjectFocusActionsContext =
  createContext<KangurSubjectFocusActionsContextValue | null>(null);

const FALLBACK_SUBJECT_KEY = 'guest';

export function KangurSubjectFocusProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const { user, isAuthenticated, isLoadingAuth } = useKangurAuth();
  const subjectKey = resolveKangurUserScopeKey(user);
  const storageKey = subjectKey ?? FALLBACK_SUBJECT_KEY;
  const [subject, setSubjectState] = useState<KangurLessonSubject>(DEFAULT_KANGUR_SUBJECT);
  const canSyncRemote =
    !isLoadingAuth && isAuthenticated && typeof subjectKey === 'string' && subjectKey.length > 0;

  useEffect(() => {
    setSubjectState(loadPersistedSubjectFocus(storageKey));
  }, [storageKey]);

  useEffect(() => subscribeToSubjectFocusChanges(storageKey, setSubjectState), [storageKey]);

  useEffect(() => {
    if (!canSyncRemote || hasPersistedSubjectFocus(storageKey)) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const hydrate = async (): Promise<void> => {
      const remoteSubject = await loadRemoteSubjectFocus(controller.signal);
      if (cancelled || remoteSubject === null) {
        return;
      }

      persistSubjectFocus(storageKey, remoteSubject);
      setSubjectState(remoteSubject);
    };

    void hydrate();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [canSyncRemote, storageKey]);

  useEffect(() => {
    setProgressScope({
      subject,
      ownerKey: subjectKey,
    });
  }, [subject, subjectKey]);

  const setSubject = useCallback(
    (nextSubject: KangurLessonSubject): void => {
      const normalizedSubject = normalizeKangurSubjectFocusSubject(nextSubject);
      if (!normalizedSubject) {
        return;
      }

      setSubjectState(normalizedSubject);
      persistSubjectFocus(storageKey, normalizedSubject);
      if (canSyncRemote) {
        void persistRemoteSubjectFocus(normalizedSubject);
      }
    },
    [canSyncRemote, storageKey]
  );

  const stateValue = useMemo<KangurSubjectFocusStateContextValue>(
    () => ({
      subject,
      subjectKey,
    }),
    [subject, subjectKey]
  );

  const actionsValue = useMemo<KangurSubjectFocusActionsContextValue>(
    () => ({
      setSubject,
    }),
    [setSubject]
  );

  return (
    <KangurSubjectFocusActionsContext.Provider value={actionsValue}>
      <KangurSubjectFocusStateContext.Provider value={stateValue}>
        {children}
      </KangurSubjectFocusStateContext.Provider>
    </KangurSubjectFocusActionsContext.Provider>
  );
}

export const useKangurSubjectFocusState = (): KangurSubjectFocusStateContextValue => {
  const context = useContext(KangurSubjectFocusStateContext);
  if (!context) {
    throw internalError(
      'useKangurSubjectFocusState must be used within a KangurSubjectFocusProvider'
    );
  }
  return context;
};

export const useOptionalKangurSubjectFocusState = ():
  | KangurSubjectFocusStateContextValue
  | null => useContext(KangurSubjectFocusStateContext);

export const useKangurSubjectFocusActions = (): KangurSubjectFocusActionsContextValue => {
  const context = useContext(KangurSubjectFocusActionsContext);
  if (!context) {
    throw internalError(
      'useKangurSubjectFocusActions must be used within a KangurSubjectFocusProvider'
    );
  }
  return context;
};

export const useKangurSubjectFocus = (): KangurSubjectFocusStateContextValue &
  KangurSubjectFocusActionsContextValue => {
  const state = useKangurSubjectFocusState();
  const actions = useKangurSubjectFocusActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
};
