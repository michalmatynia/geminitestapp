'use client';

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { QueryClientContext, type QueryClient } from '@tanstack/react-query';
import {
  loadPersistedTutorVisibilityHidden,
  subscribeToTutorVisibilityChanges,
} from '@/features/kangur/ui/components/ai-tutor-widget/KangurAiTutorWidget.storage';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { getKangurAvatarById } from '@/features/kangur/ui/avatars/catalog';
import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { useOptionalKangurAiTutor } from '@/features/kangur/ui/context/KangurAiTutorContext';
import {
  useOptionalKangurAuthSessionState,
  useOptionalKangurAuthStatusState,
} from '@/features/kangur/ui/context/KangurAuthContext';
import { useOptionalKangurRouteTransitionState } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useKangurElevatedSession } from '@/features/kangur/ui/hooks/useKangurElevatedSession';
import { useKangurMobileBreakpoint } from '@/features/kangur/ui/hooks/useKangurMobileBreakpoint';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';
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
  | 'navLabel'
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
  activeLearner: OptionalKangurAuthUser['activeLearner'] | null;
  authUser: OptionalKangurAuthUser | null;
  effectiveCanManageLearners: boolean;
  effectiveIsAuthenticated: boolean;
  effectiveShowParentDashboard: boolean;
  hasActiveLearner: boolean;
  isLoggingOut: boolean;
  isParentAccount: boolean;
};

type KangurPrimaryNavigationMenuState = {
  shouldRenderElevatedUserMenu: boolean;
  shouldRenderProfileMenu: boolean;
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
    activeLearner,
    authUser,
    effectiveCanManageLearners,
    effectiveIsAuthenticated,
    effectiveShowParentDashboard: resolveKangurPrimaryNavigationEffectiveShowParentDashboard({
      canManageLearners,
      effectiveCanManageLearners,
      showParentDashboard,
    }),
    hasActiveLearner,
    isLoggingOut,
    isParentAccount: authUser?.actorType === 'parent',
  };
}

function buildKangurPrimaryNavigationElevatedSessionUser({
  authUser,
  elevatedSessionSnapshot,
}: {
  authUser: OptionalKangurAuthUser | null;
  elevatedSessionSnapshot: NonNullable<ReturnType<typeof useKangurElevatedSession>['elevatedUser']>;
}): {
  email: string | null;
  name: string | null;
} & NonNullable<ReturnType<typeof useKangurElevatedSession>['elevatedUser']> {
  return {
    ...elevatedSessionSnapshot,
    email: resolveKangurPrimaryNavigationElevatedSessionEmail(authUser, elevatedSessionSnapshot),
    name: resolveKangurPrimaryNavigationElevatedSessionName(authUser, elevatedSessionSnapshot),
  };
}

function resolveKangurPrimaryNavigationElevatedSessionEmail(
  authUser: OptionalKangurAuthUser | null,
  elevatedSessionSnapshot: NonNullable<ReturnType<typeof useKangurElevatedSession>['elevatedUser']>
): string | null {
  return elevatedSessionSnapshot.email ?? authUser?.email?.trim() ?? null;
}

function resolveKangurPrimaryNavigationElevatedSessionName(
  authUser: OptionalKangurAuthUser | null,
  elevatedSessionSnapshot: NonNullable<ReturnType<typeof useKangurElevatedSession>['elevatedUser']>
): string | null {
  return elevatedSessionSnapshot.name ?? authUser?.full_name.trim() ?? null;
}

function resolveKangurPrimaryNavigationElevatedSessionUser({
  authUser,
  elevatedSessionSnapshot,
}: {
  authUser: OptionalKangurAuthUser | null;
  elevatedSessionSnapshot: ReturnType<typeof useKangurElevatedSession>['elevatedUser'];
}): ReturnType<typeof buildKangurPrimaryNavigationElevatedSessionUser> | null {
  if (!elevatedSessionSnapshot) {
    return null;
  }

  return buildKangurPrimaryNavigationElevatedSessionUser({
    authUser,
    elevatedSessionSnapshot,
  });
}

function resolveKangurPrimaryNavigationMenuState({
  effectiveIsAuthenticated,
  elevatedSessionUser,
  hasActiveLearner,
  isParentAccount,
}: {
  effectiveIsAuthenticated: boolean;
  elevatedSessionUser: ReturnType<typeof resolveKangurPrimaryNavigationElevatedSessionUser>;
  hasActiveLearner: boolean;
  isParentAccount: boolean;
}): KangurPrimaryNavigationMenuState {
  return {
    shouldRenderElevatedUserMenu:
      effectiveIsAuthenticated && Boolean(elevatedSessionUser) && !hasActiveLearner,
    shouldRenderProfileMenu:
      effectiveIsAuthenticated &&
      (!isParentAccount || hasActiveLearner) &&
      (!elevatedSessionUser || hasActiveLearner),
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

export function useKangurPrimaryNavigationLessonsPrefetchOnIntent({
  ageGroup: _ageGroup,
  currentPage: _currentPage,
  normalizedLocale: _normalizedLocale,
  queryClient: _queryClient,
  subject: _subject,
}: {
  ageGroup: ReturnType<typeof useKangurAgeGroupFocus>['ageGroup'];
  currentPage: KangurPrimaryNavigationStateInput['currentPage'];
  normalizedLocale: string;
  queryClient: QueryClient | null | undefined;
  subject: ReturnType<typeof useKangurSubjectFocus>['subject'];
}): () => void {
  return useCallback((): void => {}, []);
}

export function useKangurPrimaryNavigationState({
  canManageLearners,
  currentPage,
  isAuthenticated,
  navLabel,
  showParentDashboard,
}: KangurPrimaryNavigationStateInput) {
  const tutorContent = useKangurAiTutorContent();
  const tutor = useOptionalKangurAiTutor();
  const authSessionState = useOptionalKangurAuthSessionState();
  const authStatusState = useOptionalKangurAuthStatusState();
  const { elevatedUser: elevatedSessionSnapshot, isSuperAdmin } = useKangurElevatedSession();
  const kangurAppearance = useKangurStorefrontAppearance();
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const locale = useLocale();
  const queryClient = useContext(QueryClientContext);
  const navTranslations = useTranslations('KangurNavigation');
  const normalizedLocale = normalizeSiteLocale(locale);
  const fallbackCopy = useMemo(
    () => getPrimaryNavigationFallbackCopy(normalizedLocale),
    [normalizedLocale]
  );
  const navigationLabel = navLabel ?? fallbackCopy.navLabel;
  const {
    activeLearner,
    authUser,
    effectiveCanManageLearners,
    effectiveIsAuthenticated,
    effectiveShowParentDashboard,
    hasActiveLearner,
    isLoggingOut,
    isParentAccount,
  } = resolveKangurPrimaryNavigationSessionState({
    authSessionState,
    authStatusState,
    canManageLearners,
    isAuthenticated,
    showParentDashboard,
  });
  const elevatedSessionUser = useMemo(
    () =>
      resolveKangurPrimaryNavigationElevatedSessionUser({
        authUser,
        elevatedSessionSnapshot,
      }),
    [authUser, elevatedSessionSnapshot]
  );
  const profileAvatar = getKangurAvatarById(activeLearner?.avatarId);
  const { shouldRenderElevatedUserMenu, shouldRenderProfileMenu } =
    resolveKangurPrimaryNavigationMenuState({
      effectiveIsAuthenticated,
      elevatedSessionUser,
      hasActiveLearner,
      isParentAccount,
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
    activeLearner,
    elevatedSessionUser,
    isSuperAdmin,
    isLoggingOut,
    effectiveIsAuthenticated,
    hasActiveLearner,
    isParentAccount,
    profileAvatar,
    shouldRenderElevatedUserMenu,
    shouldRenderProfileMenu,
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
    navigationLabel,
    navTranslations,
    tutorContent,
    tutor,
    routeTransitionState,
    normalizedLocale,
    queryClient,
    kangurAppearance,
    effectiveCanManageLearners,
    effectiveShowParentDashboard,
  };
}
