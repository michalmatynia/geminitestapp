'use client';

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { QueryClientContext } from '@tanstack/react-query';
import {
  loadPersistedTutorVisibilityHidden,
  subscribeToTutorVisibilityChanges,
} from '@/features/kangur/ui/components/KangurAiTutorWidget.storage';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { getKangurAvatarById } from '@/features/kangur/ui/avatars/catalog';
import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { useOptionalKangurAiTutor } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useOptionalKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
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

export function useKangurPrimaryNavigationState({
  canManageLearners,
  currentPage,
  isAuthenticated,
  navLabel,
  showParentDashboard,
}: KangurPrimaryNavigationProps) {
  const tutorContent = useKangurAiTutorContent();
  const tutor = useOptionalKangurAiTutor();
  const auth = useOptionalKangurAuth();
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

  const effectiveIsAuthenticated = auth?.isAuthenticated ?? isAuthenticated;
  const effectiveCanManageLearners = auth?.user
    ? Boolean(auth.user.canManageLearners)
    : canManageLearners;
  const effectiveShowParentDashboard =
    effectiveCanManageLearners && (showParentDashboard ?? canManageLearners);
  const authUser = auth?.user ?? null;
  const isLoggingOut = auth?.isLoggingOut ?? false;
  const isParentAccount = authUser?.actorType === 'parent';
  const activeLearner = authUser?.activeLearner ?? null;
  const activeLearnerId = activeLearner?.id?.trim() ?? '';
  const hasActiveLearner = activeLearnerId.length > 0;
  
  const elevatedSessionUser = useMemo(() => {
    if (!elevatedSessionSnapshot) return null;
    return {
      ...elevatedSessionSnapshot,
      email: elevatedSessionSnapshot.email ?? authUser?.email?.trim() ?? null,
      name: elevatedSessionSnapshot.name ?? authUser?.full_name?.trim() ?? null,
    };
  }, [authUser?.email, authUser?.full_name, elevatedSessionSnapshot]);

  const profileAvatar = getKangurAvatarById(activeLearner?.avatarId);
  const shouldRenderElevatedUserMenu =
    effectiveIsAuthenticated && Boolean(elevatedSessionUser) && !hasActiveLearner;
  const shouldRenderProfileMenu =
    effectiveIsAuthenticated &&
    (!isParentAccount || hasActiveLearner) &&
    (!elevatedSessionUser || hasActiveLearner);

  const [isTutorHidden, setIsTutorHidden] = useState(() => loadPersistedTutorVisibilityHidden());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isAgeGroupModalOpen, setIsAgeGroupModalOpen] = useState(false);
  
  const { subject, setSubject } = useKangurSubjectFocus();
  const { ageGroup, setAgeGroup } = useKangurAgeGroupFocus();
  const isMobileViewport = useKangurMobileBreakpoint();
  const isCoarsePointer = useKangurCoarsePointer();

  useEffect(() => subscribeToTutorVisibilityChanges(setIsTutorHidden), []);

  useEffect(() => {
    if (!isMobileViewport) setIsMobileMenuOpen(false);
  }, [isMobileViewport]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentPage]);

  const closeMobileMenu = useCallback((): void => setIsMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback((): void => setIsMobileMenuOpen((prev) => !prev), []);

  return {
    auth,
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
