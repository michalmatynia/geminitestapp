import React from 'react';
import { BookOpen, Gamepad2 } from 'lucide-react';
import { type normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import { KangurNavAction } from '@/features/kangur/ui/components/KangurNavAction';
import KangurVisualCueContent from '@/features/kangur/ui/components/KangurVisualCueContent';
import type {
  KangurNavActionConfig,
  KangurPrimaryNavigationFallbackCopy,
} from './KangurPrimaryNavigation.types';

export const ICON_CLASSNAME = 'h-[18px] w-[18px] sm:h-5 sm:w-5';
export const PRIMARY_NAV_ROUTE_ACKNOWLEDGE_MS = 0;

export const getPrimaryNavigationFallbackCopy = (
  locale: ReturnType<typeof normalizeSiteLocale>
): KangurPrimaryNavigationFallbackCopy => {
  if (locale === 'uk') {
    return {
      adminLabel: 'Адмін',
      avatarLabel: 'Аватар адміністратора',
      enableTutorLabel: 'Увімкнути AI Tutor',
      disableTutorLabel: 'Вимкнути AI Tutor',
      guestPlayerNameLabel: 'Ім\'я гравця',
      guestPlayerNamePlaceholder: 'Введіть ім\'я гравця...',
      homeLabel: 'Головна',
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
      homeLabel: 'Startseite',
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
      homeLabel: 'Home page',
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
    homeLabel: 'Strona główna',
    loginLabel: 'Zaloguj się',
    logoutLabel: 'Wyloguj',
    logoutPendingLabel: 'Wylogowywanie...',
    navLabel: 'Główna nawigacja Kangur',
    profileLabel: 'Profil',
    profileLabelWithName: (name) => `Profil ${name}`,
  };
};

export const isTransitionSourceActive = ({
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

export const renderNavAction = (config: KangurNavActionConfig): React.JSX.Element => {
  const { content, ...action } = config;
  return <KangurNavAction action={action}>{content}</KangurNavAction>;
};

export const renderLessonsNavActionContent = ({
  isSixYearOld,
  label,
}: {
  isSixYearOld: boolean;
  label: string;
}): React.ReactNode =>
  isSixYearOld ? (
    <KangurVisualCueContent
      icon={<BookOpen aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />}
      iconTestId='kangur-primary-nav-lessons-icon'
      label={label}
    />
  ) : (
    <>
      <BookOpen aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
      <span className='truncate'>{label}</span>
    </>
  );

export const renderGamesLibraryNavActionContent = ({
  isSixYearOld,
  label,
}: {
  isSixYearOld: boolean;
  label: string;
}): React.ReactNode =>
  isSixYearOld ? (
    <KangurVisualCueContent
      icon={<Gamepad2 aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />}
      iconTestId='kangur-primary-nav-games-library-icon'
      label={label}
    />
  ) : (
    <>
      <Gamepad2 aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
      <span className='truncate'>{label}</span>
    </>
  );
