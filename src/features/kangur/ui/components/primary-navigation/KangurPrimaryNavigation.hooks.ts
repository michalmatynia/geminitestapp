'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import {
  loadPersistedTutorVisibilityHidden,
  subscribeToTutorVisibilityChanges,
} from '@/features/kangur/ui/components/ai-tutor-widget/KangurAiTutorWidget.storage';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { useOptionalKangurAiTutorController } from '@/features/kangur/ui/context/KangurAiTutorContext';
import {
  useOptionalKangurAuthSessionState,
  useOptionalKangurAuthStatusState,
} from '@/features/kangur/ui/context/KangurAuthContext';
import { useOptionalKangurRouteTransitionState } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useKangurElevatedSession } from '@/features/kangur/ui/hooks/useKangurElevatedSession';
import { useKangurMobileBreakpoint } from '@/features/kangur/ui/hooks/useKangurMobileBreakpoint';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import {
  getPrimaryNavigationFallbackCopy,
} from './KangurPrimaryNavigation.utils';
import type {
  KangurPrimaryNavigationProps,
} from './KangurPrimaryNavigation.types';

type KangurPrimaryNavigationStateInput = Pick<
  KangurPrimaryNavigationProps,
  | 'canManageLearners'
  | 'currentPage'
  | 'isAuthenticated'
  | 'showParentDashboard'
>;

type OptionalKangurAuthSessionState = ReturnType<
  typeof useOptionalKangurAuthSessionState
>;
type OptionalKangurAuthStatusState = ReturnType<
  typeof useOptionalKangurAuthStatusState
>;
type OptionalKangurAuthUser = NonNullable<
  NonNullable<OptionalKangurAuthSessionState>['user']
>;

type KangurPrimaryNavigationSessionState = {
  authUser: OptionalKangurAuthUser | null;
  effectiveIsAuthenticated: boolean;
  effectiveShowParentDashboard: boolean;
  isLoggingOut: boolean;
};

type KangurPrimaryNavigationUiState = {
  closeMobileMenu: () => void;
  isAgeGroupModalOpen: boolean;
  isCoarsePointer: boolean;
  isMobileMenuOpen: boolean;
  isMobileViewport: boolean;
  isSubjectModalOpen: boolean;
  isTutorHidden: boolean;
  setIsAgeGroupModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSubjectModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsTutorHidden: React.Dispatch<React.SetStateAction<boolean>>;
  toggleMobileMenu: () => void;
};

function resolveKangurPrimaryNavigationAuthUser(
  authSessionState: OptionalKangurAuthSessionState
): OptionalKangurAuthUser | null {
  return authSessionState ? authSessionState.user : null;
}

function resolveKangurPrimaryNavigationActiveLearner(
  authUser: OptionalKangurAuthUser | null
): {
  activeLearner: OptionalKangurAuthUser['activeLearner'] | null;
  hasActiveLearner: boolean;
} {
  const activeLearner = authUser?.activeLearner ?? null;
  const activeLearnerId = activeLearner?.id.trim() ?? '';

  return {
    activeLearner,
    hasActiveLearner: activeLearnerId.length > 0,
  };
}

function resolveKangurPrimaryNavigationEffectiveAuthState({
  authSessionState,
  authStatusState,
  isAuthenticated,
}: {
  authSessionState: OptionalKangurAuthSessionState;
  authStatusState: OptionalKangurAuthStatusState;
  isAuthenticated: boolean | undefined;
}): { effectiveIsAuthenticated: boolean; isLoggingOut: boolean } {
  return {
    effectiveIsAuthenticated: Boolean(
      authSessionState?.isAuthenticated ?? isAuthenticated
    ),
    isLoggingOut: authStatusState?.isLoggingOut ?? false,
  };
}

function resolveKangurPrimaryNavigationEffectiveCanManageLearners({
  authUser,
  canManageLearners,
}: {
  authUser: OptionalKangurAuthUser | null;
  canManageLearners: boolean | undefined;
}): boolean {
  if (authUser) {
    return Boolean(authUser.canManageLearners);
  }

  return Boolean(canManageLearners);
}

function resolveKangurPrimaryNavigationEffectiveShowParentDashboard({
  canManageLearners,
  effectiveCanManageLearners,
  showParentDashboard,
}: {
  canManageLearners: boolean | undefined;
  effectiveCanManageLearners: boolean;
  showParentDashboard: boolean | undefined;
}): boolean {
  return effectiveCanManageLearners && (showParentDashboard ?? Boolean(canManageLearners));
}

function resolveKangurPrimaryNavigationSessionState({
  authSessionState,
  authStatusState,
  canManageLearners,
  isAuthenticated,
  showParentDashboard,
}: {
  authSessionState: OptionalKangurAuthSessionState;
  authStatusState: OptionalKangurAuthStatusState;
  canManageLearners: boolean | undefined;
  isAuthenticated: boolean | undefined;
  showParentDashboard: boolean | undefined;
}): KangurPrimaryNavigationSessionState {
  const authUser = resolveKangurPrimaryNavigationAuthUser(authSessionState);
  const { activeLearner, hasActiveLearner } = resolveKangurPrimaryNavigationActiveLearner(authUser);
  const { effectiveIsAuthenticated, isLoggingOut } =
    resolveKangurPrimaryNavigationEffectiveAuthState({
      authSessionState,
      authStatusState,
      isAuthenticated,
    });
  const effectiveCanManageLearners = resolveKangurPrimaryNavigationEffectiveCanManageLearners({
    authUser,
    canManageLearners,
  });

  return {
    authUser,
    effectiveIsAuthenticated,
    effectiveShowParentDashboard: resolveKangurPrimaryNavigationEffectiveShowParentDashboard({
      canManageLearners,
      effectiveCanManageLearners,
      showParentDashboard,
    }),
    isLoggingOut,
  };
}

function useKangurPrimaryNavigationUiState(
  currentPage: KangurPrimaryNavigationStateInput['currentPage']
): KangurPrimaryNavigationUiState {
  const [isTutorHidden, setIsTutorHidden] = useState(() => loadPersistedTutorVisibilityHidden());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isAgeGroupModalOpen, setIsAgeGroupModalOpen] = useState(false);
  const isMobileViewport = useKangurMobileBreakpoint();
  const isCoarsePointer = useKangurCoarsePointer();

  useEffect(() => subscribeToTutorVisibilityChanges(setIsTutorHidden), []);

  useEffect(() => {
    if (!isMobileViewport) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobileViewport]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentPage]);

  const closeMobileMenu = useCallback((): void => setIsMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback((): void => setIsMobileMenuOpen((prev) => !prev), []);

  return {
    closeMobileMenu,
    isAgeGroupModalOpen,
    isCoarsePointer,
    isMobileMenuOpen,
    isMobileViewport,
    isSubjectModalOpen,
    isTutorHidden,
    setIsAgeGroupModalOpen,
    setIsMobileMenuOpen,
    setIsSubjectModalOpen,
    setIsTutorHidden,
    toggleMobileMenu,
  };
}

export function useKangurPrimaryNavigationState({
  canManageLearners,
  currentPage,
  isAuthenticated,
  showParentDashboard,
}: KangurPrimaryNavigationStateInput) {
  const tutor = useOptionalKangurAiTutorController();
  const authSessionState = useOptionalKangurAuthSessionState();
  const authStatusState = useOptionalKangurAuthStatusState();
  const { elevatedUser: elevatedSessionSnapshot, isSuperAdmin } = useKangurElevatedSession();
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const locale = useLocale();
  const normalizedLocale = normalizeSiteLocale(locale);
  const fallbackCopy = useMemo(
    () => getPrimaryNavigationFallbackCopy(normalizedLocale),
    [normalizedLocale]
  );
  const {
    authUser,
    effectiveIsAuthenticated,
    effectiveShowParentDashboard,
    isLoggingOut,
  } = resolveKangurPrimaryNavigationSessionState({
    authSessionState,
    authStatusState,
    canManageLearners,
    isAuthenticated,
    showParentDashboard,
  });
  const { subject, setSubject } = useKangurSubjectFocus();
  const { ageGroup, setAgeGroup } = useKangurAgeGroupFocus();
  const {
    closeMobileMenu,
    isAgeGroupModalOpen,
    isCoarsePointer,
    isMobileMenuOpen,
    isMobileViewport,
    isSubjectModalOpen,
    isTutorHidden,
    setIsAgeGroupModalOpen,
    setIsMobileMenuOpen,
    setIsSubjectModalOpen,
    setIsTutorHidden,
    toggleMobileMenu,
  } = useKangurPrimaryNavigationUiState(currentPage);

  return {
    authUser,
    elevatedSessionSnapshot,
    isSuperAdmin,
    isLoggingOut,
    effectiveIsAuthenticated,
    isTutorHidden,
    setIsTutorHidden,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isSubjectModalOpen,
    setIsSubjectModalOpen,
    isAgeGroupModalOpen,
    setIsAgeGroupModalOpen,
    subject,
    setSubject,
    ageGroup,
    setAgeGroup,
    isMobileViewport,
    isCoarsePointer,
    closeMobileMenu,
    toggleMobileMenu,
    fallbackCopy,
    tutor,
    routeTransitionState,
    normalizedLocale,
    effectiveShowParentDashboard,
  };
}
