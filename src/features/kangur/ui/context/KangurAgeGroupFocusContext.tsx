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
  loadPersistedAgeGroupFocus,
  persistAgeGroupFocus,
  subscribeToAgeGroupFocusChanges,
} from '@/features/kangur/ui/services/age-group-focus';
import type { KangurLessonAgeGroup } from '@/features/kangur/shared/contracts/kangur';
import { internalError } from '@/shared/errors/app-error';

type KangurAgeGroupFocusContextValue = {
  ageGroup: KangurLessonAgeGroup;
  setAgeGroup: (ageGroup: KangurLessonAgeGroup) => void;
  ageGroupKey: string | null;
};

const KangurAgeGroupFocusContext = createContext<KangurAgeGroupFocusContextValue | null>(null);

const FALLBACK_AGE_GROUP_KEY = 'guest';

export function KangurAgeGroupFocusProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const { user } = useKangurAuth();
  const ageGroupKey = resolveKangurUserScopeKey(user);
  const storageKey = ageGroupKey ?? FALLBACK_AGE_GROUP_KEY;
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

  const value = useMemo<KangurAgeGroupFocusContextValue>(
    () => ({
      ageGroup,
      setAgeGroup,
      ageGroupKey,
    }),
    [ageGroup, setAgeGroup, ageGroupKey]
  );

  return (
    <KangurAgeGroupFocusContext.Provider value={value}>
      {children}
    </KangurAgeGroupFocusContext.Provider>
  );
}

export const useKangurAgeGroupFocus = (): KangurAgeGroupFocusContextValue => {
  const context = useContext(KangurAgeGroupFocusContext);
  if (!context) {
    throw internalError('useKangurAgeGroupFocus must be used within a KangurAgeGroupFocusProvider');
  }
  return context;
};
