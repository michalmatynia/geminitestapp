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

import type {
  KangurTutorAnchorKind,
  KangurTutorAnchorMetadata,
  KangurTutorAnchorRegistration,
} from './kangur-tutor-types';

type KangurTutorAnchorContextValue = {
  anchors: KangurTutorAnchorRegistration[];
  registerAnchor: (anchor: KangurTutorAnchorRegistration) => () => void;
};

const KangurTutorAnchorContext = createContext<KangurTutorAnchorContextValue | null>(null);

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

  const value = useMemo(
    () => ({
      anchors,
      registerAnchor,
    }),
    [anchors, registerAnchor]
  );

  return (
    <KangurTutorAnchorContext.Provider value={value}>
      {children}
    </KangurTutorAnchorContext.Provider>
  );
}

export function useKangurTutorAnchors(): KangurTutorAnchorContextValue {
  const context = useContext(KangurTutorAnchorContext);
  if (!context) {
    throw new Error('useKangurTutorAnchors must be used within a KangurTutorAnchorProvider');
  }
  return context;
}

export function useOptionalKangurTutorAnchors(): KangurTutorAnchorContextValue | null {
  return useContext(KangurTutorAnchorContext);
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
  surface: 'lesson' | 'test' | null | undefined;
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
