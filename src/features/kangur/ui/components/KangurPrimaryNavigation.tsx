'use client';

import {
  BookOpen,
  BookCheck,
  BrainCircuit,
  Gamepad2,
  Users,
  LayoutGrid,
  LogIn,
  LogOut,
  Menu,
  Trophy,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState, type AriaAttributes } from 'react';

import {
  CmsStorefrontAppearanceButtons,
  useOptionalCmsStorefrontAppearance,
} from '@/features/cms/public';
import {
  canAccessKangurPage,
  resolveAccessibleKangurPageKey,
} from '@/features/kangur/config/page-access';
import { KANGUR_TIGHT_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import {
  getKangurHomeHref,
  getKangurPageHref as createPageUrl,
  isKangurEmbeddedBasePath,
} from '@/features/kangur/config/routing';
import {
  loadPersistedTutorVisibilityHidden,
  persistTutorVisibilityHidden,
  subscribeToTutorVisibilityChanges,
} from '@/features/kangur/ui/components/KangurAiTutorWidget.storage';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { getKangurAvatarById } from '@/features/kangur/ui/avatars/catalog';
const KangurChoiceDialog = dynamic(() =>
  import('@/features/kangur/ui/components/KangurChoiceDialog').then(m => ({ default: m.KangurChoiceDialog }))
);
import { KangurDialogHeader } from '@/features/kangur/ui/components/KangurDialogHeader';
import { KangurHomeLogo } from '@/features/kangur/ui/components/KangurHomeLogo';
import KangurVisualCueContent from '@/features/kangur/ui/components/KangurVisualCueContent';
const KangurLanguageSwitcher = dynamic(() =>
  import('@/features/kangur/ui/components/KangurLanguageSwitcher').then(m => ({ default: m.KangurLanguageSwitcher }))
);
import { KangurNavAction } from '@/features/kangur/ui/components/KangurNavAction';
import { KangurPanelCloseButton } from '@/features/kangur/ui/components/KangurPanelCloseButton';
const KangurProfileMenu = dynamic(() =>
  import('@/features/kangur/ui/components/KangurProfileMenu').then(m => ({ default: m.KangurProfileMenu }))
);
const KangurElevatedUserMenu = dynamic(() =>
  import('@/features/kangur/ui/components/KangurElevatedUserMenu').then((m) => ({
    default: m.KangurElevatedUserMenu,
  }))
);
import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { useOptionalKangurAiTutor } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useOptionalKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useOptionalKangurRouteTransitionState } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import {
  KangurButton,
  KangurPageTopBar,
  KangurTextField,
  KangurTopNavGroup,
} from '@/features/kangur/ui/design/primitives';
import {
  DEFAULT_KANGUR_AGE_GROUP,
  KANGUR_AGE_GROUPS,
  getKangurDefaultSubjectForAgeGroup,
  getKangurSubjectsForAgeGroup,
} from '@/features/kangur/lessons/lesson-catalog';
import {
  getLocalizedKangurAgeGroupLabel,
  getLocalizedKangurSubjectLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import {
  getKangurSixYearOldAgeGroupVisual,
  getKangurSixYearOldSubjectVisual,
} from '@/features/kangur/ui/constants/six-year-old-visuals';
import { useKangurMobileBreakpoint } from '@/features/kangur/ui/hooks/useKangurMobileBreakpoint';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';
import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';
import { getElevatedSessionUserSnapshot } from '@/shared/lib/auth/elevated-session-user';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

type KangurPrimaryNavigationPage =
  | 'Competition'
  | 'Game'
  | 'GamesLibrary'
  | 'Lessons'
  | 'Tests'
  | 'LearnerProfile'
  | 'ParentDashboard'
  | 'Duels'
  | 'SocialUpdates';

type KangurNavActionConfig = {
  active?: boolean;
  ariaControls?: string;
  ariaExpanded?: boolean;
  ariaHasPopup?: AriaAttributes['aria-haspopup'];
  ariaLabel?: string;
  className?: string;
  content: React.ReactNode;
  disabled?: boolean;
  docId: string;
  elementRef?: React.Ref<HTMLButtonElement>;
  href?: string;
  onClick?: () => void;
  prefetch?: boolean;
  targetPageKey?: KangurPrimaryNavigationPage;
  testId?: string;
  title?: string;
  transition?: {
    active?: boolean;
    acknowledgeMs?: number;
    sourceId?: string;
  };
};

type KangurPrimaryNavigationProps = {
  basePath: string;
  canManageLearners?: boolean;
  className?: string;
  contentClassName?: string;
  currentPage: KangurPrimaryNavigationPage;
  guestPlayerName?: string;
  guestPlayerNamePlaceholder?: string;
  homeActive?: boolean;
  isAuthenticated: boolean;
  navLabel?: string;
  onGuestPlayerNameChange?: (value: string) => void;
  onHomeClick?: () => void;
  onLogin?: () => void;
  onLogout: () => void;
  rightAccessory?: React.ReactNode;
  showParentDashboard?: boolean;
};

type KangurPrimaryNavigationFallbackCopy = {
  adminLabel: string;
  avatarLabel: string;
  enableTutorLabel: string;
  disableTutorLabel: string;
  guestPlayerNameLabel: string;
  guestPlayerNamePlaceholder: string;
  loginLabel: string;
  logoutLabel: string;
  logoutPendingLabel: string;
  navLabel: string;
  profileLabel: string;
  profileLabelWithName: (name: string) => string;
};

const getPrimaryNavigationFallbackCopy = (
  locale: ReturnType<typeof normalizeSiteLocale>
): KangurPrimaryNavigationFallbackCopy => {
  if (locale === 'uk') {
    return {
      adminLabel: 'Адмін',
      avatarLabel: 'Аватар адміністратора',
      enableTutorLabel: 'Увімкнути AI Tutor',
      disableTutorLabel: 'Вимкнути AI Tutor',
      guestPlayerNameLabel: "Ім'я гравця",
      guestPlayerNamePlaceholder: "Введіть ім'я гравця...",
      loginLabel: 'Увійти',
      logoutLabel: 'Вийти',
      logoutPendingLabel: 'Вихід...',
      navLabel: 'Головна навігація Kangur',
      profileLabel: 'Профіль',
      profileLabelWithName: (name) => `Профіль ${name}`,
    };
  }

  if (locale === 'de') {
    return {
      adminLabel: 'Admin',
      avatarLabel: 'Administrator-Avatar',
      enableTutorLabel: 'AI Tutor aktivieren',
      disableTutorLabel: 'AI Tutor deaktivieren',
      guestPlayerNameLabel: 'Name des Spielers',
      guestPlayerNamePlaceholder: 'Name des Spielers eingeben...',
      loginLabel: 'Anmelden',
      logoutLabel: 'Abmelden',
      logoutPendingLabel: 'Abmeldung...',
      navLabel: 'Kangur-Hauptnavigation',
      profileLabel: 'Profil',
      profileLabelWithName: (name) => `Profil ${name}`,
    };
  }

  if (locale === 'en') {
    return {
      adminLabel: 'Admin',
      avatarLabel: 'Admin avatar',
      enableTutorLabel: 'Enable AI Tutor',
      disableTutorLabel: 'Disable AI Tutor',
      guestPlayerNameLabel: 'Player name',
      guestPlayerNamePlaceholder: 'Enter the player name...',
      loginLabel: 'Sign in',
      logoutLabel: 'Sign out',
      logoutPendingLabel: 'Signing out...',
      navLabel: 'Kangur primary navigation',
      profileLabel: 'Profile',
      profileLabelWithName: (name) => `Profile ${name}`,
    };
  }

  return {
    adminLabel: 'Admin',
    avatarLabel: 'Awatar administratora',
    enableTutorLabel: 'Włącz AI Tutora',
    disableTutorLabel: 'Wyłącz AI Tutora',
    guestPlayerNameLabel: 'Imię gracza',
    guestPlayerNamePlaceholder: 'Wpisz imię gracza...',
    loginLabel: 'Zaloguj się',
    logoutLabel: 'Wyloguj',
    logoutPendingLabel: 'Wylogowywanie...',
    navLabel: 'Główna nawigacja Kangur',
    profileLabel: 'Profil',
    profileLabelWithName: (name) => `Profil ${name}`,
  };
};

export type { KangurPrimaryNavigationProps };

const ICON_CLASSNAME = 'h-[18px] w-[18px] sm:h-5 sm:w-5';
const PRIMARY_NAV_ROUTE_ACKNOWLEDGE_MS = 0;
const isTransitionSourceActive = ({
  activeTransitionSourceId,
  transitionPhase,
  transitionSourceId,
}: {
  activeTransitionSourceId?: string | null;
  transitionPhase?:
    | 'acknowledging'
    | 'idle'
    | 'pending'
    | 'waiting_for_ready'
    | 'revealing';
  transitionSourceId?: string;
}): boolean =>
  Boolean(
    transitionSourceId &&
      activeTransitionSourceId === transitionSourceId &&
      transitionPhase &&
      transitionPhase !== 'idle'
  );

const renderNavAction = (config: KangurNavActionConfig): React.JSX.Element => {
  const { content, ...action } = config;
  return <KangurNavAction action={action}>{content}</KangurNavAction>;
};

const resolveTutorFallbackCopy = (
  locale: ReturnType<typeof normalizeSiteLocale>,
  value: string | null | undefined,
  polishDefault: string,
  fallback: string
): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback;
  }

  if (locale !== 'pl' && value === polishDefault) {
    return fallback;
  }

  return value;
};

function KangurHomeBetaBadge(): React.JSX.Element {
  return (
    <svg
      aria-hidden='true'
      className='mt-0.5 h-[12px] w-auto overflow-visible sm:h-[13px]'
      data-testid='kangur-home-beta-badge'
      fill='none'
      viewBox='0 0 62 18'
      xmlns='http://www.w3.org/2000/svg'
    >
      <title>StuqiQ Beta badge</title>
      <rect
        fill='color-mix(in srgb, var(--kangur-accent, #5566f2) 10%, white)'
        height='17'
        rx='8.5'
        stroke='color-mix(in srgb, var(--kangur-accent, #5566f2) 36%, white)'
        strokeWidth='1'
        width='61'
        x='0.5'
        y='0.5'
      />
      <text
        fill='color-mix(in srgb, var(--kangur-accent, #5566f2) 68%, #1e293b)'
        fontFamily='ui-sans-serif, system-ui, sans-serif'
        fontSize='8'
        fontWeight='800'
        letterSpacing='0.18em'
        textAnchor='middle'
        x='31'
        y='11.2'
      >
        BETA
      </text>
    </svg>
  );
}

export function KangurPrimaryNavigation({
  basePath,
  canManageLearners = false,
  className,
  contentClassName,
  currentPage,
  guestPlayerName,
  guestPlayerNamePlaceholder,
  homeActive,
  isAuthenticated,
  navLabel,
  onGuestPlayerNameChange,
  onHomeClick,
  onLogin,
  onLogout,
  rightAccessory,
  showParentDashboard = canManageLearners,
}: KangurPrimaryNavigationProps): React.JSX.Element {
  const tutorContent = useKangurAiTutorContent();
  const tutor = useOptionalKangurAiTutor();
  const auth = useOptionalKangurAuth();
  const { data: session } = useSession();
  const storefrontAppearance = useOptionalCmsStorefrontAppearance();
  const kangurAppearance = useKangurStorefrontAppearance();
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const locale = useLocale();
  const normalizedLocale = normalizeSiteLocale(locale);
  const fallbackCopy = useMemo(
    () => getPrimaryNavigationFallbackCopy(normalizedLocale),
    [normalizedLocale]
  );
  const guestPlayerNameValue = typeof guestPlayerName === 'string' ? guestPlayerName : '';
  const guestPlayerPlaceholderText =
    guestPlayerNamePlaceholder ?? fallbackCopy.guestPlayerNamePlaceholder;
  const navigationLabel = navLabel ?? fallbackCopy.navLabel;
  const topBarClassName = className;
  const topBarContentClassName = contentClassName;
  const effectiveIsAuthenticated = auth?.isAuthenticated ?? isAuthenticated;
  const effectiveCanManageLearners = auth?.user
    ? Boolean(auth.user.canManageLearners)
    : canManageLearners;
  const effectiveShowParentDashboard = effectiveCanManageLearners && showParentDashboard;
  const authUser = auth?.user ?? null;
  const isLoggingOut = auth?.isLoggingOut ?? false;
  const isParentAccount = authUser?.actorType === 'parent';
  const activeLearner = authUser?.activeLearner ?? null;
  const activeLearnerId = activeLearner?.id?.trim() ?? '';
  const hasActiveLearner = activeLearnerId.length > 0;
  const activeLearnerName =
    activeLearner?.displayName?.trim() || activeLearner?.loginName?.trim() || null;
  const elevatedSessionUser = useMemo(() => {
    const snapshot = getElevatedSessionUserSnapshot(session);

    if (!snapshot) {
      return null;
    }

    return {
      ...snapshot,
      email: snapshot.email ?? authUser?.email?.trim() ?? null,
      name: snapshot.name ?? authUser?.full_name?.trim() ?? null,
    };
  }, [authUser?.email, authUser?.full_name, session]);
  const profileDisplayName = activeLearnerName || authUser?.full_name?.trim() || null;
  const profileLabel = profileDisplayName
    ? fallbackCopy.profileLabelWithName(profileDisplayName)
    : fallbackCopy.profileLabel;
  const profileAvatar = getKangurAvatarById(activeLearner?.avatarId);
  const shouldRenderElevatedUserMenu =
    effectiveIsAuthenticated && Boolean(elevatedSessionUser);
  const canAccessGamesLibrary =
    effectiveIsAuthenticated && canAccessKangurPage('GamesLibrary', session);
  const accessibleCurrentPage = resolveAccessibleKangurPageKey(
    currentPage,
    session,
    'Game'
  ) as KangurPrimaryNavigationPage;
  const forceLanguageSwitcherFallbackPath = accessibleCurrentPage !== currentPage;
  const effectiveHomeActive = homeActive ?? accessibleCurrentPage === 'Game';
  const learnerProfileIsActive = accessibleCurrentPage === 'LearnerProfile';
  const shouldRenderProfileMenu =
    effectiveIsAuthenticated && !shouldRenderElevatedUserMenu && (!isParentAccount || hasActiveLearner);
  const isCoarsePointer = useKangurCoarsePointer();
  const mobileNavItemClassName =
    `max-sm:col-span-1 max-sm:min-w-0 max-sm:w-full max-sm:justify-center ${
      isCoarsePointer ? 'max-sm:min-h-12 max-sm:px-4' : 'max-sm:px-3'
    }`;
  const mobileWideNavItemClassName =
    `max-sm:col-span-2 max-sm:min-w-0 max-sm:w-full max-sm:justify-center ${
      isCoarsePointer ? 'max-sm:min-h-12 max-sm:px-4' : 'max-sm:px-3'
    }`;
  const mobileAuthActionClassName = mobileNavItemClassName;
  const elevatedUserTriggerClassName = isCoarsePointer
    ? 'min-h-12 min-w-12 touch-manipulation select-none active:scale-[0.985]'
    : undefined;
  const { entry: loginActionContent } = useKangurPageContentEntry('shared-nav-login-action');
  const loginActionRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuPreviousFocusRef = useRef<HTMLElement | null>(null);
  const [isTutorHidden, setIsTutorHidden] = useState(() => loadPersistedTutorVisibilityHidden());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isAgeGroupModalOpen, setIsAgeGroupModalOpen] = useState(false);
  const navTranslations = useTranslations('KangurNavigation');
  const { subject, setSubject } = useKangurSubjectFocus();
  const { ageGroup, setAgeGroup } = useKangurAgeGroupFocus();
  const isMobileViewport = useKangurMobileBreakpoint();
  const enableTutorLabel = resolveTutorFallbackCopy(
    normalizedLocale,
    tutorContent.common.enableTutorLabel ?? tutorContent.navigation.restoreTutorLabel,
    DEFAULT_KANGUR_AI_TUTOR_CONTENT.common.enableTutorLabel,
    fallbackCopy.enableTutorLabel
  );
  const disableTutorLabel = resolveTutorFallbackCopy(
    normalizedLocale,
    tutorContent.common.disableTutorAria,
    DEFAULT_KANGUR_AI_TUTOR_CONTENT.common.disableTutorAria,
    fallbackCopy.disableTutorLabel
  );
  const [isEditingGuestPlayerName, setIsEditingGuestPlayerName] = useState(
    !(guestPlayerName?.trim() ?? '')
  );
  const showGuestPlayerNameInput =
    !effectiveIsAuthenticated &&
    typeof guestPlayerName === 'string' &&
    typeof onGuestPlayerNameChange === 'function';
  const hasGuestPlayerName = (guestPlayerName?.trim() ?? '').length > 0;
  const homeHref = getKangurHomeHref(basePath);
  const gamesLibraryHref = createPageUrl('GamesLibrary', basePath);
  const lessonsHref = createPageUrl('Lessons', basePath);
  const duelsHref = createPageUrl('Duels', basePath);
  const parentDashboardHref = createPageUrl('ParentDashboard', basePath);
  const profileHref = createPageUrl('LearnerProfile', basePath);
  const transitionPhase = routeTransitionState?.transitionPhase ?? 'idle';
  const activeTransitionSourceId = routeTransitionState?.activeTransitionSourceId ?? null;
  const subjectDialogId = 'kangur-primary-nav-subject-dialog';
  const ageGroupDialogId = 'kangur-primary-nav-age-group-dialog';
  const homeTransitionSourceId = 'kangur-primary-nav:home';
  const gamesLibraryTransitionSourceId = 'kangur-primary-nav:games-library';
  const lessonsTransitionSourceId = 'kangur-primary-nav:lessons';
  const duelsTransitionSourceId = 'kangur-primary-nav:duels';
  const profileTransitionSourceId = 'kangur-primary-nav:profile';
  const parentDashboardTransitionSourceId = 'kangur-primary-nav:parent-dashboard';
  const isSixYearOld = ageGroup === 'six_year_old';
  const subjectChoiceLabel = getLocalizedKangurSubjectLabel(subject, locale);
  const ageGroupChoiceLabel = getLocalizedKangurAgeGroupLabel(ageGroup, locale);
  const defaultSubjectLabel = getLocalizedKangurSubjectLabel(
    getKangurDefaultSubjectForAgeGroup(ageGroup),
    locale
  );
  const defaultAgeGroupLabel =
    getLocalizedKangurAgeGroupLabel(
      KANGUR_AGE_GROUPS.find((group) => group.default)?.id ?? DEFAULT_KANGUR_AGE_GROUP,
      locale
    );
  const subjectVisual = getKangurSixYearOldSubjectVisual(subject);
  const ageGroupVisual = getKangurSixYearOldAgeGroupVisual(ageGroup);
  const availableSubjects = useMemo(() => getKangurSubjectsForAgeGroup(ageGroup), [ageGroup]);
  const subjectOptions = useMemo(
    () =>
      availableSubjects.map((item) => ({
        ariaLabel: getLocalizedKangurSubjectLabel(item.id, locale, item.label),
        id: item.id,
        label: isSixYearOld ? (
          <KangurVisualCueContent
            detail={getKangurSixYearOldSubjectVisual(item.id).detail}
            detailClassName='text-sm font-bold'
            detailTestId={`kangur-primary-nav-subject-option-detail-${item.id}`}
            icon={getKangurSixYearOldSubjectVisual(item.id).icon}
            iconClassName='text-lg'
            iconTestId={`kangur-primary-nav-subject-option-icon-${item.id}`}
            label={getLocalizedKangurSubjectLabel(item.id, locale, item.label)}
          />
        ) : (
          getLocalizedKangurSubjectLabel(item.id, locale, item.label)
        ),
        isActive: subject === item.id,
        onSelect: () => setSubject(item.id),
      })),
    [availableSubjects, isSixYearOld, locale, setSubject, subject]
  );
  const ageGroupOptions = useMemo(
    () =>
      KANGUR_AGE_GROUPS.map((group) => ({
        ariaLabel: getLocalizedKangurAgeGroupLabel(group.id, locale, group.label),
        id: group.id,
        label: isSixYearOld ? (
          <KangurVisualCueContent
            detail={getKangurSixYearOldAgeGroupVisual(group.id).detail}
            detailClassName='text-sm font-bold'
            detailTestId={`kangur-primary-nav-age-group-option-detail-${group.id}`}
            icon={getKangurSixYearOldAgeGroupVisual(group.id).icon}
            iconClassName='text-lg'
            iconTestId={`kangur-primary-nav-age-group-option-icon-${group.id}`}
            label={getLocalizedKangurAgeGroupLabel(group.id, locale, group.label)}
          />
        ) : (
          getLocalizedKangurAgeGroupLabel(group.id, locale, group.label)
        ),
        isActive: ageGroup === group.id,
        onSelect: () => setAgeGroup(group.id),
      })),
    [ageGroup, isSixYearOld, locale, setAgeGroup]
  );
  const yellowPillActionClassName =
    `border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(254,243,199,0.94)_100%)] px-4 text-amber-700 shadow-[0_14px_24px_-18px_rgba(245,158,11,0.55)] ring-1 ring-amber-100/90 hover:border-amber-200 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(254,243,199,0.96)_100%)] hover:text-amber-800 ${mobileWideNavItemClassName}`;
  const amberPillActionClassName =
    `border-amber-300/90 bg-[linear-gradient(180deg,rgba(254,243,199,0.96)_0%,rgba(253,230,138,0.92)_100%)] px-4 text-amber-800 shadow-[0_14px_24px_-18px_rgba(245,158,11,0.58)] ring-1 ring-amber-200/90 hover:border-amber-300 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(253,230,138,0.94)_100%)] hover:text-amber-900 ${mobileWideNavItemClassName}`;
  const closeMobileMenu = useCallback((): void => setIsMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback((): void => setIsMobileMenuOpen((prev) => !prev), []);

  useEffect(() => subscribeToTutorVisibilityChanges(setIsTutorHidden), []);

  useEffect(() => {
    if (!isMobileViewport) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobileViewport]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [accessibleCurrentPage]);

  useEffect(() => {
    if (!isMobileMenuOpen || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return (): void => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen || typeof window === 'undefined') return;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isMobileMenuOpen) {
      mobileMenuPreviousFocusRef.current = document.activeElement as HTMLElement | null;
      return;
    }
    if (mobileMenuPreviousFocusRef.current) {
      mobileMenuPreviousFocusRef.current.focus();
      mobileMenuPreviousFocusRef.current = null;
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen || typeof document === 'undefined') return;
    const closeButton = document.getElementById('kangur-mobile-menu-close');
    if (closeButton instanceof HTMLElement) {
      closeButton.focus();
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const menu = mobileMenuRef.current;
    if (!menu || typeof document === 'undefined') return;
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');
    const getFocusable = (): HTMLElement[] =>
      Array.from(menu.querySelectorAll<HTMLElement>(selector)).filter(
        (element) => !element.hasAttribute('disabled') && !element.getAttribute('aria-hidden')
      );
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      const first = focusable.at(0);
      const last = focusable.at(-1);
      if (!first || !last) return;
      const firstElement = first;
      const lastElement = last;
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === firstElement || active === menu) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }
      if (active === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };
    menu.addEventListener('keydown', handleKeyDown);
    return (): void => {
      menu.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!showGuestPlayerNameInput) {
      setIsEditingGuestPlayerName(false);
      return;
    }

    if (!hasGuestPlayerName) {
      setIsEditingGuestPlayerName(true);
    }
  }, [hasGuestPlayerName, showGuestPlayerNameInput]);

  const handleGuestPlayerNameChange = (value: string): void => {
    onGuestPlayerNameChange?.(value);
  };

  useKangurTutorAnchor({
    id: 'kangur-auth-login-action',
    kind: 'login_action',
    ref: loginActionRef,
    surface: 'auth',
    enabled: !effectiveIsAuthenticated && Boolean(onLogin),
    priority: 130,
    metadata: {
      label: fallbackCopy.loginLabel,
    },
  });

  const commitGuestPlayerName = (): void => {
    if (!showGuestPlayerNameInput || !hasGuestPlayerName) {
      setIsEditingGuestPlayerName(true);
      return;
    }

    const trimmedValue = guestPlayerName.trim();
    if (trimmedValue !== guestPlayerName) {
      handleGuestPlayerNameChange(trimmedValue);
    }
    setIsEditingGuestPlayerName(false);
  };

  const logoutAction: KangurNavActionConfig = {
    content: (
      <>
        <LogOut aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
        <span className='truncate'>
          {isLoggingOut ? fallbackCopy.logoutPendingLabel : fallbackCopy.logoutLabel}
        </span>
      </>
    ),
    disabled: isLoggingOut,
    docId: 'profile_logout',
    className: mobileNavItemClassName,
    onClick: onLogout,
    testId: 'kangur-primary-nav-logout',
  };
  const buildActionWithClose = (
    action: KangurNavActionConfig,
    onActionClick?: () => void
  ): KangurNavActionConfig => {
    if (!onActionClick) return action;
    const existingClick = action.onClick;
    return {
      ...action,
      onClick: () => {
        existingClick?.();
        onActionClick();
      },
    };
  };

  const renderAuthActions = (onActionClick?: () => void): React.ReactNode => {
    if (shouldRenderElevatedUserMenu) {
      return null;
    }

    if (effectiveIsAuthenticated) {
      return renderNavAction(buildActionWithClose(logoutAction, onActionClick));
    }

    if (!onLogin && !showGuestPlayerNameInput) {
      return null;
    }

    return (
      <>
        {showGuestPlayerNameInput ? (
          isEditingGuestPlayerName || !hasGuestPlayerName ? (
            <div className='w-full sm:w-[220px]'>
              <label className='sr-only' htmlFor='kangur-primary-nav-guest-player-name'>
                {fallbackCopy.guestPlayerNameLabel}
              </label>
              <KangurTextField
                accent='indigo'
                className='h-11 min-w-0 text-sm'
                data-doc-id='profile_guest_player_name'
                id='kangur-primary-nav-guest-player-name'
                maxLength={20}
                onBlur={commitGuestPlayerName}
                onChange={(event) => handleGuestPlayerNameChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitGuestPlayerName();
                  }
                }}
                placeholder={guestPlayerPlaceholderText}
                size='md'
                type='text'
                value={guestPlayerNameValue}
              />
            </div>
          ) : (
            <KangurButton
              className='w-full justify-start px-3 text-left sm:w-auto sm:min-w-[180px]'
              data-doc-id='profile_guest_player_name_display'
              onClick={() => setIsEditingGuestPlayerName(true)}
              size='md'
              type='button'
              variant='navigation'
            >
              <span className='truncate'>{guestPlayerName.trim()}</span>
            </KangurButton>
          )
        ) : null}
        {onLogin ? (
          renderNavAction(
            buildActionWithClose(
              {
                className: mobileAuthActionClassName,
                content: (
                  <>
                    <LogIn aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
                    <span className='truncate'>
                      {loginActionContent?.title ?? fallbackCopy.loginLabel}
                    </span>
                  </>
                ),
                docId: 'profile_login',
                elementRef: loginActionRef,
                onClick: onLogin,
                testId: 'kangur-primary-nav-login',
                title: loginActionContent?.summary ?? undefined,
              },
              onActionClick
            )
          )
        ) : null}
      </>
    );
  };

  const tutorToggleActionConfig: KangurNavActionConfig = {
    ariaLabel: isTutorHidden ? enableTutorLabel : disableTutorLabel,
    className: isTutorHidden
      ? yellowPillActionClassName
      : mobileNavItemClassName,
    content: (
      <>
        <BrainCircuit aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
        <span className='truncate'>{isTutorHidden ? enableTutorLabel : disableTutorLabel}</span>
      </>
    ),
    docId: isTutorHidden ? 'kangur-ai-tutor-enable' : 'kangur-ai-tutor-disable',
    onClick: (): void => {
      const nextHidden = !isTutorHidden;
      persistTutorVisibilityHidden(nextHidden);
      if (!nextHidden && tutor?.enabled) {
        tutor.openChat();
      }
    },
    testId: 'kangur-ai-tutor-toggle',
    title: isTutorHidden ? enableTutorLabel : disableTutorLabel,
    transition: {},
  };
  const homeAction: KangurNavActionConfig = {
    active: effectiveHomeActive,
    ariaLabel: navTranslations('home'),
    className: `px-3 sm:px-4 ${mobileNavItemClassName}`,
    content: (
      <>
        <span
          className='flex flex-col items-center justify-center'
          data-testid='kangur-home-brand'
        >
          <span
            className='flex items-center justify-center transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none'
            data-testid='kangur-home-logo'
          >
            <KangurHomeLogo
              idPrefix='kangur-primary-nav-logo'
              className='-translate-y-[1px]'
            />
          </span>
          {/* Temporary beta marker for the home nav brand. Remove this block when the label is no longer needed. */}
          <KangurHomeBetaBadge />
        </span>
        <span className='sr-only'>{navTranslations('home')}</span>
      </>
    ),
    docId: 'top_nav_home',
    href: onHomeClick ? undefined : homeHref,
    onClick: onHomeClick,
    targetPageKey: 'Game',
    testId: 'kangur-primary-nav-home',
    transition: {
      active: isTransitionSourceActive({
        activeTransitionSourceId,
        transitionPhase,
        transitionSourceId: homeTransitionSourceId,
      }),
      acknowledgeMs: onHomeClick ? undefined : PRIMARY_NAV_ROUTE_ACKNOWLEDGE_MS,
      sourceId: onHomeClick ? undefined : homeTransitionSourceId,
    },
  };
  const lessonsAction: KangurNavActionConfig = {
    active: accessibleCurrentPage === 'Lessons',
    ariaLabel: navTranslations('lessons'),
    className: mobileNavItemClassName,
    content: isSixYearOld ? (
      <KangurVisualCueContent
        icon={<BookOpen aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />}
        iconTestId='kangur-primary-nav-lessons-icon'
        label={navTranslations('lessons')}
      />
    ) : (
      <>
        <BookOpen aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
        <span className='truncate'>{navTranslations('lessons')}</span>
      </>
    ),
    docId: 'top_nav_lessons',
    href: lessonsHref,
    targetPageKey: 'Lessons',
    testId: 'kangur-primary-nav-lessons',
    transition: {
      active: isTransitionSourceActive({
        activeTransitionSourceId,
        transitionPhase,
        transitionSourceId: lessonsTransitionSourceId,
      }),
      sourceId: lessonsTransitionSourceId,
    },
  };
  const gamesLibraryAction: KangurNavActionConfig = {
    active: accessibleCurrentPage === 'GamesLibrary',
    ariaLabel: navTranslations('gamesLibrary'),
    className: mobileNavItemClassName,
    content: isSixYearOld ? (
      <KangurVisualCueContent
        icon={<Gamepad2 aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />}
        iconTestId='kangur-primary-nav-games-library-icon'
        label={navTranslations('gamesLibrary')}
      />
    ) : (
      <>
        <Gamepad2 aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
        <span className='truncate'>{navTranslations('gamesLibrary')}</span>
      </>
    ),
    docId: 'top_nav_games_library',
    href: gamesLibraryHref,
    targetPageKey: 'GamesLibrary',
    testId: 'kangur-primary-nav-games-library',
    transition: {
      active: isTransitionSourceActive({
        activeTransitionSourceId,
        transitionPhase,
        transitionSourceId: gamesLibraryTransitionSourceId,
      }),
      sourceId: gamesLibraryTransitionSourceId,
    },
  };
  const subjectAction: KangurNavActionConfig = {
    ariaControls: subjectDialogId,
    ariaExpanded: isSubjectModalOpen,
    ariaHasPopup: 'dialog',
    ariaLabel: navTranslations('subject.label'),
    className: yellowPillActionClassName,
    content: isSixYearOld ? (
      <KangurVisualCueContent
        detail={subjectVisual.detail}
        detailClassName='text-sm font-bold'
        detailTestId='kangur-primary-nav-subject-detail'
        icon={subjectVisual.icon}
        iconClassName='text-lg'
        iconTestId='kangur-primary-nav-subject-icon'
        label={subjectChoiceLabel}
      />
    ) : (
      <>
        <BookCheck aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
        <span className='truncate'>{subjectChoiceLabel}</span>
      </>
    ),
    docId: 'top_nav_subject_choice',
    onClick: () => setIsSubjectModalOpen(true),
    testId: 'kangur-primary-nav-subject',
    title: navTranslations('subject.currentTitle', { subject: subjectChoiceLabel }),
  };
  const ageGroupAction: KangurNavActionConfig = {
    ariaControls: ageGroupDialogId,
    ariaExpanded: isAgeGroupModalOpen,
    ariaHasPopup: 'dialog',
    ariaLabel: navTranslations('ageGroup.label'),
    className: amberPillActionClassName,
    content: isSixYearOld ? (
      <KangurVisualCueContent
        detail={ageGroupVisual.detail}
        detailClassName='text-sm font-bold'
        detailTestId='kangur-primary-nav-age-group-detail'
        icon={ageGroupVisual.icon}
        iconClassName='text-lg'
        iconTestId='kangur-primary-nav-age-group-icon'
        label={ageGroupChoiceLabel}
      />
    ) : (
      <>
        <Users aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
        <span className='truncate'>{ageGroupChoiceLabel}</span>
      </>
    ),
    docId: 'top_nav_age_group_choice',
    onClick: () => setIsAgeGroupModalOpen(true),
    testId: 'kangur-primary-nav-age-group',
    title: navTranslations('ageGroup.currentTitle', { group: ageGroupChoiceLabel }),
  };
  const duelsAction: KangurNavActionConfig = {
    active: accessibleCurrentPage === 'Duels',
    ariaLabel: navTranslations('duels'),
    className: mobileNavItemClassName,
    content: isSixYearOld ? (
      <KangurVisualCueContent
        icon={<Trophy aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />}
        iconTestId='kangur-primary-nav-duels-icon'
        label={navTranslations('duels')}
      />
    ) : (
      <>
        <Trophy aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
        <span className='truncate'>{navTranslations('duels')}</span>
      </>
    ),
    docId: 'top_nav_duels',
    href: duelsHref,
    prefetch: false,
    targetPageKey: 'Duels',
    testId: 'kangur-primary-nav-duels',
    transition: {
      active: isTransitionSourceActive({
        activeTransitionSourceId,
        transitionPhase,
        transitionSourceId: duelsTransitionSourceId,
      }),
      sourceId: duelsTransitionSourceId,
    },
  };
  const parentDashboardAction: KangurNavActionConfig | null = effectiveShowParentDashboard
    ? {
      active: accessibleCurrentPage === 'ParentDashboard',
      ariaLabel: navTranslations('parent'),
      content: (
        isSixYearOld ? (
          <KangurVisualCueContent
            icon={<LayoutGrid aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />}
            iconTestId='kangur-primary-nav-parent-dashboard-icon'
            label={navTranslations('parent')}
          />
        ) : (
          <>
            <LayoutGrid aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
            <span className='truncate'>{navTranslations('parent')}</span>
          </>
        )
      ),
      docId: 'top_nav_parent_dashboard',
      href: parentDashboardHref,
      targetPageKey: 'ParentDashboard',
      className: mobileNavItemClassName,
      testId: 'kangur-primary-nav-parent-dashboard',
      transition: {
        active: isTransitionSourceActive({
          activeTransitionSourceId,
          transitionPhase,
          transitionSourceId: parentDashboardTransitionSourceId,
        }),
        sourceId: parentDashboardTransitionSourceId,
      },
    }
    : null;
  const kangurAppearanceModes = useMemo(() => ['default', 'dawn', 'sunset', 'dark'] as const, []);
  const kangurAppearanceLabels = useMemo(() => ({
    default: 'Daily',
    dawn: 'Dawn',
    sunset: 'Sunset',
    dark: 'Nightly',
  }), []);
  const shouldRenderLanguageSwitcher =
    !isKangurEmbeddedBasePath(basePath) &&
    DEFAULT_SITE_I18N_CONFIG.locales.filter((entry) => entry.enabled).length > 1;
  const appearanceControls = storefrontAppearance ? (
    <CmsStorefrontAppearanceButtons
      tone={kangurAppearance.tone}
      className='max-sm:w-full max-sm:justify-start'
      label='Kangur appearance'
      testId='kangur-primary-nav-appearance-controls'
      modes={[...kangurAppearanceModes]}
      modeLabels={kangurAppearanceLabels}
    />
  ) : null;
  const appearanceControlsInline = storefrontAppearance ? (
    <CmsStorefrontAppearanceButtons
      tone={kangurAppearance.tone}
      className='justify-start'
      label='Kangur appearance'
      testId='kangur-primary-nav-appearance-controls-inline'
      modes={[...kangurAppearanceModes]}
      modeLabels={kangurAppearanceLabels}
    />
  ) : null;
  const renderPrimaryActions = (options?: {
    onActionClick?: () => void;
    wrapperClassName?: string;
    inlineAppearanceWithTutor?: boolean;
    leading?: React.ReactNode;
  }): React.ReactNode => {
    const { onActionClick, wrapperClassName, inlineAppearanceWithTutor, leading } = options ?? {};
    const tutorInlineClassName = [tutorToggleActionConfig.className, 'max-sm:!w-auto']
      .filter(Boolean)
      .join(' ');
    const tutorInlineAction = renderNavAction(
      buildActionWithClose(
        {
          ...tutorToggleActionConfig,
          className: tutorInlineClassName,
        },
        onActionClick
      )
    );
    const tutorDefaultAction = renderNavAction(
      buildActionWithClose(tutorToggleActionConfig, onActionClick)
    );
    const tutorRow =
      isTutorHidden
        ? null
        : inlineAppearanceWithTutor && appearanceControlsInline
          ? (
            <div className='flex w-full items-center justify-center gap-2'>
              {tutorInlineAction}
              <div className='flex shrink-0 items-center'>{appearanceControlsInline}</div>
            </div>
          )
          : tutorDefaultAction;
    return (
      <div
        className={
          wrapperClassName ??
          'grid w-full min-w-0 grid-cols-2 gap-2 max-[420px]:grid-cols-1 sm:flex sm:w-auto sm:flex-nowrap sm:items-center'
        }
        data-testid='kangur-primary-nav-primary-actions'
      >
        {leading}
        {renderNavAction(buildActionWithClose(homeAction, onActionClick))}
        {canAccessGamesLibrary
          ? renderNavAction(buildActionWithClose(gamesLibraryAction, onActionClick))
          : null}
        {renderNavAction(buildActionWithClose(lessonsAction, onActionClick))}
        {renderNavAction(buildActionWithClose(duelsAction, onActionClick))}
        {renderNavAction(buildActionWithClose(subjectAction, onActionClick))}
        {renderNavAction(buildActionWithClose(ageGroupAction, onActionClick))}
        {tutorRow}
      </div>
    );
  };

  const renderUtilityActions = (options?: {
    onActionClick?: () => void;
    wrapperClassName?: string;
    hideAppearanceControls?: boolean;
    hideLanguageSwitcher?: boolean;
    testId?: string;
  }): React.ReactNode => {
    const {
      onActionClick,
      wrapperClassName,
      hideAppearanceControls,
      hideLanguageSwitcher,
      testId = 'kangur-primary-nav-utility-actions',
    } =
      options ?? {};
    const authActions = renderAuthActions(onActionClick);
    const resolvedAppearanceControls = hideAppearanceControls ? null : appearanceControls;
    const resolvedShouldRenderLanguageSwitcher =
      shouldRenderLanguageSwitcher && !hideLanguageSwitcher;

    if (
      !resolvedShouldRenderLanguageSwitcher &&
      !resolvedAppearanceControls &&
      !rightAccessory &&
      !parentDashboardAction &&
      !shouldRenderElevatedUserMenu &&
      !shouldRenderProfileMenu &&
      !authActions
    ) {
      return null;
    }

    return (
      <div
        className={
          wrapperClassName ??
          `ml-auto ${KANGUR_TIGHT_ROW_CLASSNAME} items-stretch justify-end max-sm:ml-0 max-sm:justify-start sm:w-auto sm:flex-wrap sm:items-center`
        }
        data-testid={testId}
      >
        {resolvedShouldRenderLanguageSwitcher ? (
          <KangurLanguageSwitcher
            basePath={basePath}
            className={mobileNavItemClassName}
            currentPage={accessibleCurrentPage}
            forceFallbackPath={forceLanguageSwitcherFallbackPath}
          />
        ) : null}
        {resolvedAppearanceControls}
        {rightAccessory}
        {parentDashboardAction
          ? renderNavAction(buildActionWithClose(parentDashboardAction, onActionClick))
          : null}
        {shouldRenderElevatedUserMenu && elevatedSessionUser ? (
          <KangurElevatedUserMenu
            adminLabel={fallbackCopy.adminLabel}
            logoutLabel={fallbackCopy.logoutLabel}
            onLogout={onLogout}
            profile={
              !isParentAccount || hasActiveLearner
                ? {
                    href: profileHref,
                    label: profileLabel,
                  }
                : null
            }
            triggerAriaLabel={fallbackCopy.avatarLabel}
            triggerClassName={elevatedUserTriggerClassName}
            user={elevatedSessionUser}
          />
        ) : null}
        {shouldRenderProfileMenu ? (
          <KangurProfileMenu
            avatar={profileAvatar}
            label={profileLabel}
            profile={{ href: profileHref, isActive: learnerProfileIsActive }}
            transitionSourceId={profileTransitionSourceId}
            triggerClassName={mobileNavItemClassName}
          />
        ) : null}
        {authActions}
      </div>
    );
  };

  const mobileMenuLabel = isMobileMenuOpen
    ? navTranslations('mobileMenu.close')
    : navTranslations('mobileMenu.open');
  const mobileMenuId = 'kangur-mobile-menu';
  const mobileMenuTitleId = 'kangur-mobile-menu-title';
  const mobileMenuDescriptionId = 'kangur-mobile-menu-description';
  const mobileMenuCloseButton = (
    <KangurPanelCloseButton
      id='kangur-mobile-menu-close'
      aria-label={navTranslations('mobileMenu.close')}
      onClick={closeMobileMenu}
      variant='chat'
    />
  );
  const mobileNav = (
    <KangurTopNavGroup label={navigationLabel}>
      <KangurButton
        aria-label={mobileMenuLabel}
        aria-controls={mobileMenuId}
        aria-haspopup='dialog'
        aria-expanded={isMobileMenuOpen}
        className={isCoarsePointer ? 'min-h-12 px-4 py-3' : 'px-4 py-3'}
        data-testid='kangur-primary-nav-mobile-toggle'
        fullWidth
        onClick={toggleMobileMenu}
        size='md'
        type='button'
        variant='navigation'
      >
        {isMobileMenuOpen ? (
          <X aria-hidden='true' className={ICON_CLASSNAME} />
        ) : (
          <Menu aria-hidden='true' className={ICON_CLASSNAME} />
        )}
        <span className='sr-only'>{mobileMenuLabel}</span>
      </KangurButton>
    </KangurTopNavGroup>
  );
  const desktopNav = (
    <KangurTopNavGroup label={navigationLabel}>
      {renderPrimaryActions()}
      {renderUtilityActions()}
    </KangurTopNavGroup>
  );
  const leftContent = (
    <>
      <div aria-hidden={isMobileViewport} className='hidden w-full min-w-0 sm:block'>
        {desktopNav}
      </div>
      <div aria-hidden={!isMobileViewport} className='w-full min-w-0 sm:hidden'>
        {mobileNav}
      </div>
    </>
  );
  const shouldRenderMobileAppearanceHeader = Boolean(appearanceControlsInline);
  const shouldRenderMobileLanguageHeader = shouldRenderLanguageSwitcher;
  const shouldHideMobileAppearanceControls = shouldRenderMobileAppearanceHeader;
  const shouldHideMobileLanguageSwitcher = shouldRenderMobileLanguageHeader;
  const mobileMenuOverlay = isMobileViewport || isMobileMenuOpen ? (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-200 sm:hidden ${
        isMobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!isMobileMenuOpen}
    >
      <button
        type='button'
        aria-hidden='true'
        className='absolute inset-0 cursor-pointer border-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.4)_0%,rgba(15,23,42,0.72)_100%)] p-0 touch-manipulation active:opacity-95'
        onClick={closeMobileMenu}
        tabIndex={-1}
      />
      <div
        role='dialog'
        aria-modal='true'
        aria-describedby={mobileMenuDescriptionId}
        aria-labelledby={mobileMenuTitleId}
        id={mobileMenuId}
        className={`relative flex h-full w-full flex-col kangur-panel-gap overflow-y-auto px-4 pb-[calc(var(--kangur-mobile-bottom-clearance,env(safe-area-inset-bottom))+32px)] pt-[calc(env(safe-area-inset-top)+20px)] transition-transform duration-200 min-[420px]:px-5 ${
          isMobileMenuOpen ? 'translate-y-0' : 'translate-y-4'
        }`}
        style={{ backgroundColor: kangurAppearance.tone.background, color: kangurAppearance.tone.text }}
        onClick={(event) => event.stopPropagation()}
        ref={mobileMenuRef}
      >
        <h2 id={mobileMenuTitleId} className='sr-only'>
          {navTranslations('mobileMenu.title')}
        </h2>
        <p id={mobileMenuDescriptionId} className='sr-only'>
          {navTranslations('mobileMenu.description')}
        </p>
        <KangurTopNavGroup label={navigationLabel} className='w-full flex-col'>
          <div
            className='flex w-full items-center gap-2'
            data-testid='kangur-primary-nav-mobile-header'
          >
            {shouldRenderMobileLanguageHeader || shouldRenderMobileAppearanceHeader ? (
              <div
                className='flex min-w-0 items-center gap-2'
                data-testid='kangur-primary-nav-mobile-header-actions'
              >
                {shouldRenderMobileLanguageHeader ? (
                  <KangurLanguageSwitcher
                    basePath={basePath}
                    currentPage={accessibleCurrentPage}
                    forceFallbackPath={forceLanguageSwitcherFallbackPath}
                  />
                ) : null}
                {shouldRenderMobileAppearanceHeader ? (
                  <div className='flex shrink-0 items-center'>{appearanceControlsInline}</div>
                ) : null}
              </div>
            ) : null}
            <div className='ml-auto flex shrink-0 items-center'>{mobileMenuCloseButton}</div>
          </div>
          {renderPrimaryActions({
            onActionClick: closeMobileMenu,
            wrapperClassName: 'flex w-full flex-col gap-2',
            inlineAppearanceWithTutor: false,
          })}
          {renderUtilityActions({
            onActionClick: closeMobileMenu,
            wrapperClassName: 'flex w-full flex-col gap-2',
            hideAppearanceControls: shouldHideMobileAppearanceControls,
            hideLanguageSwitcher: shouldHideMobileLanguageSwitcher,
            testId: 'kangur-primary-nav-mobile-utility-actions',
          })}
        </KangurTopNavGroup>
      </div>
    </div>
  ) : null;
  const subjectModal = (
    <KangurChoiceDialog
      contentId={subjectDialogId}
      open={isSubjectModalOpen}
      onOpenChange={setIsSubjectModalOpen}
      header={
        <KangurDialogHeader
          title={navTranslations('subject.label')}
          description={navTranslations('subject.dialogDescription')}
        />
      }
      title={
        isSixYearOld ? (
          <KangurVisualCueContent
            detail='👆'
            detailClassName='text-sm'
            detailTestId='kangur-primary-nav-subject-modal-title-detail'
            icon='📚'
            iconClassName='text-lg'
            iconTestId='kangur-primary-nav-subject-modal-title-icon'
            label={navTranslations('subject.label')}
          />
        ) : (
          navTranslations('subject.label')
        )
      }
      defaultChoiceLabel={
        isSixYearOld ? (
          <KangurVisualCueContent
            detail={getKangurSixYearOldSubjectVisual(getKangurDefaultSubjectForAgeGroup(ageGroup)).detail}
            detailClassName='text-sm font-bold'
            detailTestId='kangur-primary-nav-subject-modal-default-detail'
            icon={getKangurSixYearOldSubjectVisual(getKangurDefaultSubjectForAgeGroup(ageGroup)).icon}
            iconClassName='text-lg'
            iconTestId='kangur-primary-nav-subject-modal-default-icon'
            label={defaultSubjectLabel}
          />
        ) : (
          defaultSubjectLabel
        )
      }
      currentChoiceLabel={
        isSixYearOld ? (
          <KangurVisualCueContent
            detail={subjectVisual.detail}
            detailClassName='text-sm font-bold'
            detailTestId='kangur-primary-nav-subject-modal-current-detail'
            icon={subjectVisual.icon}
            iconClassName='text-lg'
            iconTestId='kangur-primary-nav-subject-modal-current-icon'
            label={subjectChoiceLabel}
          />
        ) : (
          subjectChoiceLabel
        )
      }
      closeAriaLabel={navTranslations('subject.closeAriaLabel')}
      groupAriaLabel={navTranslations('subject.groupAriaLabel')}
      options={subjectOptions}
      doneAriaLabel='Gotowe'
      doneLabel={
        isSixYearOld ? (
          <KangurVisualCueContent
            icon='✅'
            iconClassName='text-lg'
            iconTestId='kangur-primary-nav-subject-modal-done-icon'
            label='Gotowe'
          />
        ) : undefined
      }
    />
  );
  const ageGroupModal = (
    <KangurChoiceDialog
      contentId={ageGroupDialogId}
      open={isAgeGroupModalOpen}
      onOpenChange={setIsAgeGroupModalOpen}
      header={
        <KangurDialogHeader
          title={navTranslations('ageGroup.label')}
          description={navTranslations('ageGroup.dialogDescription')}
        />
      }
      title={
        isSixYearOld ? (
          <KangurVisualCueContent
            detail='👆'
            detailClassName='text-sm'
            detailTestId='kangur-primary-nav-age-group-modal-title-detail'
            icon='👥'
            iconClassName='text-lg'
            iconTestId='kangur-primary-nav-age-group-modal-title-icon'
            label={navTranslations('ageGroup.label')}
          />
        ) : (
          navTranslations('ageGroup.label')
        )
      }
      defaultChoiceLabel={
        isSixYearOld ? (
          <KangurVisualCueContent
            detail={getKangurSixYearOldAgeGroupVisual(
              KANGUR_AGE_GROUPS.find((group) => group.default)?.id ?? DEFAULT_KANGUR_AGE_GROUP
            ).detail}
            detailClassName='text-sm font-bold'
            detailTestId='kangur-primary-nav-age-group-modal-default-detail'
            icon={getKangurSixYearOldAgeGroupVisual(
              KANGUR_AGE_GROUPS.find((group) => group.default)?.id ?? DEFAULT_KANGUR_AGE_GROUP
            ).icon}
            iconClassName='text-lg'
            iconTestId='kangur-primary-nav-age-group-modal-default-icon'
            label={defaultAgeGroupLabel}
          />
        ) : (
          defaultAgeGroupLabel
        )
      }
      currentChoiceLabel={
        isSixYearOld ? (
          <KangurVisualCueContent
            detail={ageGroupVisual.detail}
            detailClassName='text-sm font-bold'
            detailTestId='kangur-primary-nav-age-group-modal-current-detail'
            icon={ageGroupVisual.icon}
            iconClassName='text-lg'
            iconTestId='kangur-primary-nav-age-group-modal-current-icon'
            label={ageGroupChoiceLabel}
          />
        ) : (
          ageGroupChoiceLabel
        )
      }
      closeAriaLabel={navTranslations('ageGroup.closeAriaLabel')}
      groupAriaLabel={navTranslations('ageGroup.groupAriaLabel')}
      options={ageGroupOptions}
      doneAriaLabel='Gotowe'
      doneLabel={
        isSixYearOld ? (
          <KangurVisualCueContent
            icon='✅'
            iconClassName='text-lg'
            iconTestId='kangur-primary-nav-age-group-modal-done-icon'
            label='Gotowe'
          />
        ) : undefined
      }
    />
  );

  return (
    <>
      <KangurPageTopBar
        className={topBarClassName}
        contentClassName={topBarContentClassName}
        left={leftContent}
      />
      {mobileMenuOverlay}
      {subjectModal}
      {ageGroupModal}
    </>
  );
}
