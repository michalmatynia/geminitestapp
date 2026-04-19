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

import {
  DEFAULT_KANGUR_SUBJECT,
  resolveKangurSubjectForAgeGroup,
} from '@/features/kangur/lessons/lesson-catalog-metadata';
import {
  useKangurAuthSessionState,
  useKangurAuthStatusState,
} from '@/features/kangur/ui/context/KangurAuthContext';
import { resolveKangurUserScopeKey } from '@/features/kangur/ui/context/kangur-user-scope';
import {
  loadPersistedAgeGroupFocus,
  persistAgeGroupFocus,
  subscribeToAgeGroupFocusChanges,
} from '@/features/kangur/ui/services/age-group-focus';
import {
  hasPersistedSubjectFocus,
  loadPersistedSubjectFocus,
  loadRemoteSubjectFocus,
  normalizeKangurSubjectFocusSubject,
  persistRemoteSubjectFocus,
  persistSubjectFocus,
  subscribeToSubjectFocusChanges,
} from '@/features/kangur/ui/services/subject-focus';
import { setProgressScope } from '@/features/kangur/ui/services/progress';
import { internalError } from '@/shared/errors/app-error';

import type {
  KangurLessonAgeGroup,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';

type KangurSubjectFocusStateContextValue = {
  subject: KangurLessonSubject;
  subjectKey: string | null;
};

type KangurSubjectFocusActionsContextValue = {
  setSubject: (subject: KangurLessonSubject) => void;
};

type KangurAgeGroupFocusContextValue = {
  ageGroup: KangurLessonAgeGroup;
  setAgeGroup: (ageGroup: KangurLessonAgeGroup) => void;
  ageGroupKey: string | null;
};

const KangurSubjectFocusStateContext =
  createContext<KangurSubjectFocusStateContextValue | null>(null);
const KangurSubjectFocusActionsContext =
  createContext<KangurSubjectFocusActionsContextValue | null>(null);
const KangurAgeGroupFocusContext = createContext<KangurAgeGroupFocusContextValue | null>(null);

const FALLBACK_FOCUS_SCOPE_KEY = 'guest';

const useHydrateKangurSubjectFocus = ({
  canSyncRemote,
  setSubjectState,
  storageKey,
}: {
  canSyncRemote: boolean;
  setSubjectState: (subject: KangurLessonSubject) => void;
  storageKey: string;
}): void => {
  useEffect(() => {
    if (!canSyncRemote || hasPersistedSubjectFocus(storageKey)) {
      return undefined;
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

    hydrate().catch(() => undefined);

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [canSyncRemote, setSubjectState, storageKey]);
};

const useKangurFocusScope = (): {
  canSyncRemote: boolean;
  scopeKey: string | null;
  storageKey: string;
} => {
  const { user, isAuthenticated } = useKangurAuthSessionState();
  const { isLoadingAuth } = useKangurAuthStatusState();
  const scopeKey = resolveKangurUserScopeKey(user);

  return {
    canSyncRemote:
      !isLoadingAuth && isAuthenticated && typeof scopeKey === 'string' && scopeKey.length > 0,
    scopeKey,
    storageKey: scopeKey ?? FALLBACK_FOCUS_SCOPE_KEY,
  };
};

const useKangurSubjectFocusStateValue = ({
  canSyncRemote,
  scopeKey,
  storageKey,
}: {
  canSyncRemote: boolean;
  scopeKey: string | null;
  storageKey: string;
}): KangurSubjectFocusStateContextValue & KangurSubjectFocusActionsContextValue => {
  const [subject, setSubjectState] = useState<KangurLessonSubject>(DEFAULT_KANGUR_SUBJECT);

  useEffect(() => {
    setSubjectState(loadPersistedSubjectFocus(storageKey));
  }, [storageKey]);

  useEffect(() => subscribeToSubjectFocusChanges(storageKey, setSubjectState), [storageKey]);
  useHydrateKangurSubjectFocus({
    canSyncRemote,
    setSubjectState,
    storageKey,
  });

  useEffect(() => {
    setProgressScope({
      subject,
      ownerKey: scopeKey,
    });
  }, [scopeKey, subject]);

  const setSubject = useCallback(
    (nextSubject: KangurLessonSubject): void => {
      const normalizedSubject = normalizeKangurSubjectFocusSubject(nextSubject);
      if (normalizedSubject === null || normalizedSubject === subject) {
        return;
      }

      setSubjectState(normalizedSubject);
      persistSubjectFocus(storageKey, normalizedSubject);
      if (canSyncRemote) {
        persistRemoteSubjectFocus(storageKey, normalizedSubject).catch(() => undefined);
      }
    },
    [canSyncRemote, storageKey, subject]
  );

  return useMemo(
    () => ({
      subject,
      subjectKey: scopeKey,
      setSubject,
    }),
    [scopeKey, setSubject, subject]
  );
};

const useKangurAgeGroupFocusStateValue = ({
  storageKey,
}: {
  storageKey: string;
}): KangurAgeGroupFocusContextValue => {
  const [ageGroup, setAgeGroupState] = useState<KangurLessonAgeGroup>(() =>
    loadPersistedAgeGroupFocus(storageKey)
  );

  useEffect(() => {
    setAgeGroupState(loadPersistedAgeGroupFocus(storageKey));
  }, [storageKey]);

  useEffect(() => subscribeToAgeGroupFocusChanges(storageKey, setAgeGroupState), [storageKey]);

  const setAgeGroup = useCallback(
    (nextAgeGroup: KangurLessonAgeGroup): void => {
      setAgeGroupState(nextAgeGroup);
      persistAgeGroupFocus(storageKey, nextAgeGroup);
    },
    [storageKey]
  );

  return useMemo(
    () => ({
      ageGroup,
      setAgeGroup,
      ageGroupKey: storageKey === FALLBACK_FOCUS_SCOPE_KEY ? null : storageKey,
    }),
    [ageGroup, storageKey, setAgeGroup]
  );
};

const KangurFocusContextsProvider = ({
  ageGroupValue,
  children,
  subjectValue,
}: {
  ageGroupValue: KangurAgeGroupFocusContextValue;
  children: ReactNode;
  subjectValue: KangurSubjectFocusStateContextValue & KangurSubjectFocusActionsContextValue;
}): React.JSX.Element => (
  <KangurSubjectFocusActionsContext.Provider value={{ setSubject: subjectValue.setSubject }}>
    <KangurSubjectFocusStateContext.Provider
      value={{ subject: subjectValue.subject, subjectKey: subjectValue.subjectKey }}
    >
      <KangurAgeGroupFocusContext.Provider value={ageGroupValue}>
        {children}
      </KangurAgeGroupFocusContext.Provider>
    </KangurSubjectFocusStateContext.Provider>
  </KangurSubjectFocusActionsContext.Provider>
);

export function KangurFocusProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const focusScope = useKangurFocusScope();
  const subjectValue = useKangurSubjectFocusStateValue(focusScope);
  const ageGroupValue = useKangurAgeGroupFocusStateValue(focusScope);

  useEffect(() => {
    const nextSubject = resolveKangurSubjectForAgeGroup(
      subjectValue.subject,
      ageGroupValue.ageGroup
    );
    if (nextSubject !== subjectValue.subject) {
      subjectValue.setSubject(nextSubject);
    }
  }, [ageGroupValue.ageGroup, subjectValue]);

  return (
    <KangurFocusContextsProvider ageGroupValue={ageGroupValue} subjectValue={subjectValue}>
      {children}
    </KangurFocusContextsProvider>
  );
}

export function KangurSubjectFocusProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const focusScope = useKangurFocusScope();
  const subjectValue = useKangurSubjectFocusStateValue(focusScope);

  return (
    <KangurSubjectFocusActionsContext.Provider value={{ setSubject: subjectValue.setSubject }}>
      <KangurSubjectFocusStateContext.Provider
        value={{ subject: subjectValue.subject, subjectKey: subjectValue.subjectKey }}
      >
        {children}
      </KangurSubjectFocusStateContext.Provider>
    </KangurSubjectFocusActionsContext.Provider>
  );
}

export function KangurAgeGroupFocusProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const focusScope = useKangurFocusScope();
  const ageGroupValue = useKangurAgeGroupFocusStateValue(focusScope);

  return (
    <KangurAgeGroupFocusContext.Provider value={ageGroupValue}>
      {children}
    </KangurAgeGroupFocusContext.Provider>
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

export const useKangurAgeGroupFocus = (): KangurAgeGroupFocusContextValue => {
  const context = useContext(KangurAgeGroupFocusContext);
  if (!context) {
    throw internalError('useKangurAgeGroupFocus must be used within a KangurAgeGroupFocusProvider');
  }
  return context;
};
