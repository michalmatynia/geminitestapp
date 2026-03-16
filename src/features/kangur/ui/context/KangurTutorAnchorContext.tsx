'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from 'react';

import { internalError } from '@/features/kangur/shared/errors/app-error';

import type {
  KangurTutorAnchorKind,
  KangurTutorAnchorMetadata,
  KangurTutorAnchorRegistration,
  KangurTutorAnchorSurface,
} from './kangur-tutor-types';

type KangurTutorAnchorContextValue = {
  anchors: KangurTutorAnchorRegistration[];
  registerAnchor: (anchor: KangurTutorAnchorRegistration) => () => void;
};

type KangurTutorAnchorStateContextValue = Pick<KangurTutorAnchorContextValue, 'anchors'>;
type KangurTutorAnchorActionsContextValue = Pick<KangurTutorAnchorContextValue, 'registerAnchor'>;

const KangurTutorAnchorStateContext = createContext<KangurTutorAnchorStateContextValue | null>(
  null
);
const KangurTutorAnchorActionsContext = createContext<KangurTutorAnchorActionsContextValue | null>(
  null
);

export function KangurTutorAnchorProvider({ children }: { children: ReactNode }): JSX.Element {
  const [anchors, setAnchors] = useState<KangurTutorAnchorRegistration[]>([]);

  const registerAnchor = useCallback((anchor: KangurTutorAnchorRegistration) => {
    setAnchors((prev) => {
      const next = prev.filter((entry) => entry.id !== anchor.id);
      next.push(anchor);
      return next;
    });

    return () => {
      setAnchors((prev) => prev.filter((entry) => entry.id !== anchor.id));
    };
  }, []);

  const stateValue = useMemo<KangurTutorAnchorStateContextValue>(
    () => ({
      anchors,
    }),
    [anchors]
  );
  const actionsValue = useMemo<KangurTutorAnchorActionsContextValue>(
    () => ({
      registerAnchor,
    }),
    [registerAnchor]
  );

  return (
    <KangurTutorAnchorActionsContext.Provider value={actionsValue}>
      <KangurTutorAnchorStateContext.Provider value={stateValue}>
        {children}
      </KangurTutorAnchorStateContext.Provider>
    </KangurTutorAnchorActionsContext.Provider>
  );
}

export function useKangurTutorAnchorState(): KangurTutorAnchorStateContextValue {
  const context = useContext(KangurTutorAnchorStateContext);
  if (!context) {
    throw internalError(
      'useKangurTutorAnchorState must be used within a KangurTutorAnchorProvider'
    );
  }
  return context;
}

export function useKangurTutorAnchorActions(): KangurTutorAnchorActionsContextValue {
  const context = useContext(KangurTutorAnchorActionsContext);
  if (!context) {
    throw internalError(
      'useKangurTutorAnchorActions must be used within a KangurTutorAnchorProvider'
    );
  }
  return context;
}

export function useKangurTutorAnchors(): KangurTutorAnchorContextValue {
  const state = useContext(KangurTutorAnchorStateContext);
  const actions = useContext(KangurTutorAnchorActionsContext);
  if (!state || !actions) {
    throw internalError('useKangurTutorAnchors must be used within a KangurTutorAnchorProvider');
  }
  return useMemo(() => ({ ...state, ...actions }), [actions, state]);
}

export function useOptionalKangurTutorAnchors(): KangurTutorAnchorContextValue | null {
  const state = useContext(KangurTutorAnchorStateContext);
  const actions = useContext(KangurTutorAnchorActionsContext);
  return useMemo(() => {
    if (!state || !actions) {
      return null;
    }
    return { ...state, ...actions };
  }, [actions, state]);
}

const kindMatches = (
  anchorKind: KangurTutorAnchorKind,
  allowedKinds: KangurTutorAnchorKind[] | undefined
): boolean => {
  if (!allowedKinds || allowedKinds.length === 0) {
    return true;
  }
  return allowedKinds.includes(anchorKind);
};

const contentMatches = (
  metadata: KangurTutorAnchorMetadata | undefined,
  contentId: string | null | undefined
): boolean => {
  if (!contentId) {
    return true;
  }
  return (metadata?.contentId ?? null) === contentId;
};

export function selectBestTutorAnchor(input: {
  anchors: KangurTutorAnchorRegistration[];
  surface: KangurTutorAnchorSurface | null | undefined;
  contentId?: string | null;
  kinds?: KangurTutorAnchorKind[];
}): KangurTutorAnchorRegistration | null {
  if (!input.surface) {
    return null;
  }

  const candidates = input.anchors
    .filter((anchor) => anchor.surface === input.surface)
    .filter((anchor) => kindMatches(anchor.kind, input.kinds))
    .filter((anchor) => contentMatches(anchor.metadata, input.contentId))
    .filter((anchor) => {
      const rect = anchor.getRect();
      return Boolean(rect && rect.width >= 0 && rect.height >= 0);
    })
    .sort((left, right) => right.priority - left.priority);

  return candidates[0] ?? null;
}
