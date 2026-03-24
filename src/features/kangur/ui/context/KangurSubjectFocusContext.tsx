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
import {
  loadPersistedSubjectFocus,
  loadRemoteSubjectFocus,
  persistSubjectFocus,
  persistRemoteSubjectFocus,
  subscribeToSubjectFocusChanges,
} from '@/features/kangur/ui/services/subject-focus';
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

const resolveSubjectFocusKey = (user: ReturnType<typeof useKangurAuth>['user']): string | null => {
  const activeLearnerId = user?.activeLearner?.id?.trim();
  if (activeLearnerId) {
    return activeLearnerId;
  }

  if (user?.actorType === 'parent') {
    return null;
  }

  const userId = user?.id?.trim();
  return userId && userId.length > 0 ? userId : null;
};

const FALLBACK_SUBJECT_KEY = 'guest';

export function KangurSubjectFocusProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const { user, isAuthenticated, isLoadingAuth } = useKangurAuth();
  const subjectKey = resolveSubjectFocusKey(user);
  const storageKey = subjectKey ?? FALLBACK_SUBJECT_KEY;
  const [subject, setSubjectState] = useState<KangurLessonSubject>(() =>
    loadPersistedSubjectFocus(storageKey)
  );
  const canSyncRemote =
    !isLoadingAuth && isAuthenticated && typeof subjectKey === 'string' && subjectKey.length > 0;

  useEffect(() => {
    setSubjectState(loadPersistedSubjectFocus(storageKey));
  }, [storageKey]);

  useEffect(() => subscribeToSubjectFocusChanges(storageKey, setSubjectState), [storageKey]);

  useEffect(() => {
    if (!canSyncRemote) {
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
      setSubjectState(nextSubject);
      persistSubjectFocus(storageKey, nextSubject);
      if (canSyncRemote) {
        void persistRemoteSubjectFocus(nextSubject);
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
