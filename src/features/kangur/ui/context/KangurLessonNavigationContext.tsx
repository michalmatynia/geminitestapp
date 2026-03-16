'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { internalError } from '@/features/kangur/shared/errors/app-error';

type KangurLessonBackAction = () => void;

export type KangurLessonSubsectionSummary = {
  emoji: string;
  title: string;
  description: string;
  isGame?: boolean;
};

export type KangurLessonSecretPill = {
  isUnlocked: boolean;
  onOpen: () => void;
};

type KangurLessonNavigationContextValue = {
  onBack: KangurLessonBackAction;
  isSubsectionNavigationActive: boolean;
  registerSubsectionNavigation: () => () => void;
  subsectionSummary: KangurLessonSubsectionSummary | null;
  setSubsectionSummary: (summary: KangurLessonSubsectionSummary | null) => void;
  secretLessonPill: KangurLessonSecretPill | null;
};

type KangurLessonNavigationStateValue = Pick<
  KangurLessonNavigationContextValue,
  'isSubsectionNavigationActive' | 'onBack' | 'secretLessonPill' | 'subsectionSummary'
>;

type KangurLessonNavigationActionsValue = Pick<
  KangurLessonNavigationContextValue,
  'registerSubsectionNavigation' | 'setSubsectionSummary'
>;

const KangurLessonNavigationContext = createContext<KangurLessonNavigationContextValue | null>(null);

export function KangurLessonNavigationProvider({
  onBack,
  secretLessonPill = null,
  children,
}: {
  onBack: KangurLessonBackAction;
  secretLessonPill?: KangurLessonSecretPill | null;
  children: ReactNode;
}): React.JSX.Element {
  const [subsectionNavigationDepth, setSubsectionNavigationDepth] = useState(0);
  const [subsectionSummary, setSubsectionSummary] = useState<KangurLessonSubsectionSummary | null>(
    null
  );
  const registerSubsectionNavigation = useCallback(() => {
    setSubsectionNavigationDepth((currentDepth) => currentDepth + 1);

    return () => {
      setSubsectionNavigationDepth((currentDepth) => Math.max(0, currentDepth - 1));
    };
  }, []);
  const value = useMemo<KangurLessonNavigationContextValue>(
    () => ({
      onBack,
      isSubsectionNavigationActive: subsectionNavigationDepth > 0,
      registerSubsectionNavigation,
      subsectionSummary,
      setSubsectionSummary,
      secretLessonPill: secretLessonPill?.isUnlocked ? secretLessonPill : null,
    }),
    [onBack, registerSubsectionNavigation, secretLessonPill, subsectionNavigationDepth, subsectionSummary]
  );

  return (
    <KangurLessonNavigationContext.Provider value={value}>
      {children}
    </KangurLessonNavigationContext.Provider>
  );
}

export function KangurLessonNavigationBoundary({
  onBack,
  children,
}: {
  onBack?: KangurLessonBackAction;
  children: ReactNode;
}): React.JSX.Element {
  if (!onBack) {
    return <>{children}</>;
  }

  const boundaryOnBack = onBack;

  return (
    <KangurLessonNavigationProvider onBack={boundaryOnBack}>
      {children}
    </KangurLessonNavigationProvider>
  );
}

export const useKangurLessonBackAction = (
  overrideOnBack?: KangurLessonBackAction
): KangurLessonBackAction => {
  const context = useContext(KangurLessonNavigationContext);

  if (overrideOnBack) {
    return overrideOnBack;
  }

  if (!context) {
    throw internalError(
      'useKangurLessonBackAction must be used within a KangurLessonNavigationProvider'
    );
  }

  return context.onBack;
};

export const useKangurLessonSubsectionNavigationActive = (): boolean =>
  useKangurLessonNavigationState().isSubsectionNavigationActive;

export const useKangurLessonSubsectionSummary = (): KangurLessonSubsectionSummary | null =>
  useKangurLessonNavigationState().subsectionSummary;

export const useKangurLessonSecretPill = (): KangurLessonSecretPill | null =>
  useKangurLessonNavigationState().secretLessonPill;

export const useKangurLessonNavigationState = (): KangurLessonNavigationStateValue => {
  const context = useContext(KangurLessonNavigationContext);
  return useMemo(
    () => ({
      isSubsectionNavigationActive: context?.isSubsectionNavigationActive ?? false,
      onBack: context?.onBack ?? (() => undefined),
      secretLessonPill: context?.secretLessonPill ?? null,
      subsectionSummary: context?.subsectionSummary ?? null,
    }),
    [context]
  );
};

export const useKangurLessonNavigationActions = (): KangurLessonNavigationActionsValue => {
  const context = useContext(KangurLessonNavigationContext);
  return useMemo(
    () => ({
      registerSubsectionNavigation: context?.registerSubsectionNavigation ?? (() => () => undefined),
      setSubsectionSummary: context?.setSubsectionSummary ?? (() => undefined),
    }),
    [context]
  );
};

export const useKangurRegisterLessonSubsectionNavigation = (): (() => () => void) => {
  const { registerSubsectionNavigation } = useKangurLessonNavigationActions();

  return useCallback(() => {
    return registerSubsectionNavigation();
  }, [registerSubsectionNavigation]);
};

export const useKangurSyncLessonSubsectionSummary = (
  summary: KangurLessonSubsectionSummary | null
): void => {
  const { setSubsectionSummary } = useKangurLessonNavigationActions();

  useEffect(() => {
    setSubsectionSummary(summary);

    return () => {
      setSubsectionSummary(null);
    };
  }, [setSubsectionSummary, summary]);
};

export function KangurLessonSubsectionSummarySync({
  summary,
}: {
  summary: KangurLessonSubsectionSummary | null;
}): null {
  useKangurSyncLessonSubsectionSummary(summary);
  return null;
}
