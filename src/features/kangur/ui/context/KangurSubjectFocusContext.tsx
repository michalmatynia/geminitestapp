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
import { setProgressSubject } from '@/features/kangur/ui/services/progress';
import type { KangurLessonSubject } from '@/shared/contracts/kangur';
import { internalError } from '@/shared/errors/app-error';

type KangurSubjectFocusContextValue = {
  subject: KangurLessonSubject;
  setSubject: (subject: KangurLessonSubject) => void;
  subjectKey: string | null;
};

const KangurSubjectFocusContext = createContext<KangurSubjectFocusContextValue | null>(null);

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

    const hydrate = async (): Promise<void> => {
      const remoteSubject = await loadRemoteSubjectFocus();
      if (cancelled || remoteSubject === null) {
        return;
      }

      persistSubjectFocus(storageKey, remoteSubject);
      setSubjectState(remoteSubject);
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [canSyncRemote, storageKey]);

  useEffect(() => {
    setProgressSubject(subject);
  }, [subject]);

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

  const value = useMemo<KangurSubjectFocusContextValue>(
    () => ({
      subject,
      setSubject,
      subjectKey,
    }),
    [subject, setSubject, subjectKey]
  );

  return (
    <KangurSubjectFocusContext.Provider value={value}>
      {children}
    </KangurSubjectFocusContext.Provider>
  );
}

export const useKangurSubjectFocus = (): KangurSubjectFocusContextValue => {
  const context = useContext(KangurSubjectFocusContext);
  if (!context) {
    throw internalError('useKangurSubjectFocus must be used within a KangurSubjectFocusProvider');
  }
  return context;
};
