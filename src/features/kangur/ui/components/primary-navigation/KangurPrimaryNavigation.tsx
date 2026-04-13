'use client';

import { Menu, X } from 'lucide-react';
import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

import {
  KangurButton,
  KangurPageTopBar,
  KangurTopNavGroup,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_TIGHT_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import {
  KangurDialogMeta
} from '@/features/kangur/ui/components/KangurDialogMeta';
import {
  KangurPanelCloseButton
} from '@/features/kangur/ui/components/KangurPanelCloseButton';
import KangurVisualCueContent from '@/features/kangur/ui/components/KangurVisualCueContent';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';

import {
  resolveMobileMenuHeaderActions,
  buildActionWithClose,
  buildPrimaryNavigationLogoutAction,
  resolveKangurPrimaryNavigationUtilityVisibility,
  resolveUtilityElevatedUserMenuNode,
  resolveUtilityLanguageSwitcherNode,
  resolveUtilityParentDashboardNode,
  resolveUtilityProfileMenuNode,
} from './KangurPrimaryNavigation.utility-runtime';
import {
  KangurPrimaryNavigationProvider,
  useKangurPrimaryNavigationContext,
  KANGUR_PRIMARY_NAV_DIALOG_IDS,
} from './KangurPrimaryNavigation.context';
import type { KangurPrimaryNavigationContextValue } from './KangurPrimaryNavigation.context';
import type { KangurPrimaryNavigationProps } from './KangurPrimaryNavigation.types';
export type { KangurPrimaryNavigationProps } from './KangurPrimaryNavigation.types';
import { ICON_CLASSNAME, renderNavAction } from './KangurPrimaryNavigation.utils';
import {
  getKangurSixYearOldAgeGroupVisual,
  getKangurSixYearOldSubjectVisual,
} from '@/features/kangur/ui/constants/six-year-old-visuals';
import {
  getKangurDefaultSubjectForAgeGroup,
} from '@/features/kangur/lessons/lesson-catalog-metadata';
import type { KangurChoiceDialogOption } from '@/features/kangur/ui/components/KangurChoiceDialog';
import type { KangurIntlTranslate } from '@/features/kangur/ui/types';
import type { KangurLessonAgeGroup } from '@/features/kangur/shared/contracts/kangur';

const KangurChoiceDialog = dynamic(() =>
  import('@/features/kangur/ui/components/KangurChoiceDialog').then((m) => ({
    default: function KangurChoiceDialogEntry(
      props: import('@/features/kangur/ui/components/KangurChoiceDialog').KangurChoiceDialogProps
    ) {
      return m.renderKangurChoiceDialog(props);
    },
  }))
);

// --- Internal Components (previously components.tsx) ---

function KangurPrimaryNavigationLoginAction({
  className,
  fallbackLabel,
  loginActionRef,
  onActionClick,
  onLogin,
}: {
  className?: string;
  fallbackLabel: string;
  loginActionRef: React.RefObject<HTMLButtonElement | null>;
  onActionClick?: () => void;
  onLogin: () => void;
}): React.JSX.Element {
  const { entry: loginActionContent } = useKangurPageContentEntry('shared-nav-login-action');
  const loginLabel = loginActionContent?.title?.trim() || fallbackLabel;
  const loginTitle = loginActionContent?.summary?.trim() || undefined;

  return renderNavAction(
    buildActionWithClose(
      {
        content: <span className='truncate'>{loginLabel}</span>,
        docId: 'auth_login',
        ariaLabel: loginLabel,
        onClick: onLogin,
        elementRef: loginActionRef,
        className,
        testId: 'kangur-primary-nav-login',
        title: loginTitle,
      },
      onActionClick
    )
  );
}

function KangurPrimaryNavigationGuestPlayerNameAction({
  commitGuestPlayerName,
  fallbackCopy,
  guestPlayerName,
  guestPlayerNameValue,
  guestPlayerPlaceholderText,
  handleGuestPlayerNameChange,
  hasGuestPlayerName,
  isEditingGuestPlayerName,
  setIsEditingGuestPlayerName,
}: {
  commitGuestPlayerName: () => void;
  fallbackCopy: KangurPrimaryNavigationContextValue['fallbackCopy'];
  guestPlayerName?: string;
  guestPlayerNameValue: string;
  guestPlayerPlaceholderText: string;
  handleGuestPlayerNameChange: (value: string) => void;
  hasGuestPlayerName: boolean;
  isEditingGuestPlayerName: boolean;
  setIsEditingGuestPlayerName: (value: boolean) => void;
}): React.JSX.Element {
  if (isEditingGuestPlayerName) {
    return (
      <form
        className='flex items-center gap-2'
        onSubmit={(e) => {
          e.preventDefault();
          commitGuestPlayerName();
        }}
      >
        <input
          aria-label={fallbackCopy.guestPlayerNameLabel}
          autoFocus
          className='h-9 w-32 rounded-lg border border-sky-200 bg-white/90 px-3 text-xs font-bold text-sky-900 placeholder:text-sky-300/70 focus:border-sky-400 focus:outline-none'
          onChange={(e) => handleGuestPlayerNameChange(e.target.value)}
          onBlur={() => setIsEditingGuestPlayerName(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsEditingGuestPlayerName(false);
              return;
            }

            if (e.key === 'Enter') {
              e.preventDefault();
              commitGuestPlayerName();
            }
          }}
          placeholder={guestPlayerPlaceholderText}
          type='text'
          value={guestPlayerNameValue}
        />
        <button
          aria-label={fallbackCopy.guestPlayerNameLabel}
          className='flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500 text-white shadow-sm transition hover:bg-sky-600 active:scale-95'
          type='submit'
        >
          <span className='text-sm'>OK</span>
        </button>
      </form>
    );
  }

  return (
    <button
      aria-label={hasGuestPlayerName ? guestPlayerName : fallbackCopy.guestPlayerNameLabel}
      className='flex h-10 items-center gap-2 rounded-xl border border-sky-100 bg-white/80 px-3 py-2 transition hover:bg-white active:scale-95 sm:h-11'
      onClick={() => setIsEditingGuestPlayerName(true)}
      type='button'
    >
      <span aria-hidden='true' className='text-lg'>👤</span>
      <span className='text-xs font-black uppercase tracking-wider text-sky-800'>
        {hasGuestPlayerName ? guestPlayerName : fallbackCopy.guestPlayerNameLabel}
      </span>
    </button>
  );
}

// --- Sections (previously sections.tsx) ---

function KangurPrimaryNavigationAuthActions({
  onActionClick,
}: {
  onActionClick?: () => void;
}): React.ReactNode {
  const {
    effectiveIsAuthenticated,
    fallbackCopy,
    isLoggingOut,
    loginActionRef,
    props,
    derived,
    commitGuestPlayerName,
    guestPlayerNameValue,
    guestPlayerPlaceholderText,
    handleGuestPlayerNameChange,
    hasGuestPlayerName,
    isEditingGuestPlayerName,
    setIsEditingGuestPlayerName,
    showGuestPlayerNameInput,
  } = useKangurPrimaryNavigationContext();

  const { mobileNavItemClassName } = derived;
  const { guestPlayerName, onLogin } = props;

  if (effectiveIsAuthenticated) {
    return renderNavAction(
      buildActionWithClose(
        buildPrimaryNavigationLogoutAction({
          fallbackCopy,
          isLoggingOut,
          mobileNavItemClassName,
          onLogout: props.onLogout,
        }),
        onActionClick
      )
    );
  }

  if (!onLogin && !showGuestPlayerNameInput) {
    return null;
  }

  return (
    <>
      {showGuestPlayerNameInput ? (
        <KangurPrimaryNavigationGuestPlayerNameAction
          commitGuestPlayerName={commitGuestPlayerName}
          fallbackCopy={fallbackCopy}
          guestPlayerName={guestPlayerName}
          guestPlayerNameValue={guestPlayerNameValue}
          guestPlayerPlaceholderText={guestPlayerPlaceholderText}
          handleGuestPlayerNameChange={handleGuestPlayerNameChange}
          hasGuestPlayerName={hasGuestPlayerName}
          isEditingGuestPlayerName={isEditingGuestPlayerName}
          setIsEditingGuestPlayerName={setIsEditingGuestPlayerName}
        />
      ) : null}
      {onLogin ? (
        <KangurPrimaryNavigationLoginAction
          className={mobileNavItemClassName}
          fallbackLabel={fallbackCopy.loginLabel}
          loginActionRef={loginActionRef}
          onActionClick={onActionClick}
          onLogin={onLogin}
        />
      ) : null}
    </>
  );
}

function KangurPrimaryNavigationPrimaryActions({
  onActionClick,
  wrapperClassName,
}: {
  onActionClick?: () => void;
  wrapperClassName?: string;
}): React.JSX.Element {
  const { isTutorHidden, derived } = useKangurPrimaryNavigationContext();
  const {
    homeAction,
    canAccessGamesLibrary,
    gamesLibraryAction,
    lessonsAction,
    duelsAction,
    subjectAction,
    ageGroupAction,
    tutorToggleAction,
    inlineAppearanceWithTutor,
    appearanceControlsInline,
  } = derived;

  const tutorInlineClassName = [tutorToggleAction.className, 'max-sm:!w-auto']
    .filter(Boolean)
    .join(' ');
  const tutorInlineAction = renderNavAction(
    buildActionWithClose(
      {
        ...tutorToggleAction,
        className: tutorInlineClassName,
      },
      onActionClick
    )
  );
  const tutorDefaultAction = renderNavAction(
    buildActionWithClose(tutorToggleAction, onActionClick)
  );
  const tutorRow = isTutorHidden
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
}

function KangurPrimaryNavigationUtilityActions({
  authActions,
  rightAccessory,
  onActionClick,
  testId = 'kangur-primary-nav-utility-actions',
  wrapperClassName,
  hideAppearanceControls,
  hideLanguageSwitcher,
}: {
  authActions: React.ReactNode;
  rightAccessory: React.ReactNode;
  onActionClick?: () => void;
  testId?: string;
  wrapperClassName?: string;
  hideAppearanceControls?: boolean;
  hideLanguageSwitcher?: boolean;
}): React.ReactNode {
  const {
    elevatedSessionUser,
    fallbackCopy,
    isCoarsePointer,
    profileAvatar,
    shouldRenderElevatedUserMenu,
    shouldRenderProfileMenu,
    props,
    derived,
  } = useKangurPrimaryNavigationContext();

  const {
    appearanceControls,
    shouldRenderLanguageSwitcher,
    basePath,
    mobileNavItemClassName,
    parentDashboardAction,
    profileHref,
    profileLabel,
    profileTransitionSourceId,
  } = derived;

  const accessibleCurrentPage = props.currentPage;
  const forceLanguageSwitcherFallbackPath =
    props.forceLanguageSwitcherFallbackPath ?? false;
  const learnerProfileIsActive = accessibleCurrentPage === 'LearnerProfile';

  const resolvedAppearanceControls = hideAppearanceControls ? null : appearanceControls;
  const resolvedShouldRenderLanguageSwitcher =
    shouldRenderLanguageSwitcher && !hideLanguageSwitcher;

  if (
    !resolveKangurPrimaryNavigationUtilityVisibility({
      authActions,
      parentDashboardAction,
      resolvedAppearanceControls,
      resolvedShouldRenderLanguageSwitcher,
      rightAccessory,
      shouldRenderElevatedUserMenu,
      shouldRenderProfileMenu,
    })
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
      {resolveUtilityLanguageSwitcherNode({
        accessibleCurrentPage,
        basePath,
        forceLanguageSwitcherFallbackPath,
        mobileNavItemClassName,
        resolvedShouldRenderLanguageSwitcher,
      })}
      {resolvedAppearanceControls}
      {rightAccessory}
      {resolveUtilityParentDashboardNode({ onActionClick, parentDashboardAction })}
      {resolveUtilityElevatedUserMenuNode({
        elevatedSessionUser,
        fallbackCopy,
        isCoarsePointer,
        onLogout: props.onLogout,
        shouldRenderElevatedUserMenu,
      })}
      {resolveUtilityProfileMenuNode({
        learnerProfileIsActive,
        mobileNavItemClassName,
        profileAvatar,
        profileHref,
        profileLabel,
        profileTransitionSourceId,
        shouldRenderProfileMenu,
      })}
      {authActions}
    </div>
  );
}

// --- Overlays (previously overlays.tsx) ---

type KangurChoiceDialogConfig = {
  closeAriaLabel: string;
  contentId: string;
  currentChoiceLabel: React.ReactNode;
  defaultChoiceLabel: React.ReactNode;
  description: string;
  doneAriaLabel: string;
  doneLabel?: React.ReactNode;
  groupAriaLabel: string;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: KangurChoiceDialogOption[];
  title: React.ReactNode;
};

function renderKangurPrimaryNavigationVisualChoiceLabel({
  detailTestId,
  iconTestId,
  isSixYearOld,
  label,
  visual,
}: {
  detailTestId: string;
  iconTestId: string;
  isSixYearOld: boolean;
  label: string;
  visual: { detail: string; icon: React.ReactNode };
}): React.ReactNode {
  if (!isSixYearOld) {
    return label;
  }

  return (
    <KangurVisualCueContent
      detail={visual.detail}
      detailClassName='text-sm font-bold'
      detailTestId={detailTestId}
      icon={visual.icon}
      iconClassName='text-lg'
      iconTestId={iconTestId}
      label={label}
    />
  );
}

function resolveKangurPrimaryNavigationDoneLabel(
  isSixYearOld: boolean,
  iconTestId: string
): React.ReactNode | undefined {
  if (!isSixYearOld) {
    return undefined;
  }

  return (
    <KangurVisualCueContent
      icon='✅'
      iconClassName='text-lg'
      iconTestId={iconTestId}
      label='Gotowe'
    />
  );
}

function resolveKangurPrimaryNavigationDialogTitle({
  detail,
  detailTestId,
  icon,
  iconTestId,
  isSixYearOld,
  label,
}: {
  detail: string;
  detailTestId: string;
  icon: React.ReactNode;
  iconTestId: string;
  isSixYearOld: boolean;
  label: string;
}): React.ReactNode {
  if (!isSixYearOld) {
    return label;
  }

  return (
    <KangurVisualCueContent
      detail={detail}
      detailClassName='text-sm'
      detailTestId={detailTestId}
      icon={icon}
      iconClassName='text-lg'
      iconTestId={iconTestId}
      label={label}
    />
  );
}

function buildKangurPrimaryNavigationSubjectDialog(input: {
  ageGroup: KangurLessonAgeGroup;
  defaultSubjectLabel: string;
  isSixYearOld: boolean;
  navTranslations: KangurIntlTranslate;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  options: KangurChoiceDialogOption[];
  subjectChoiceLabel: string;
  subjectVisual: KangurPrimaryNavigationContextValue['derived']['subjectVisual'];
}): KangurChoiceDialogConfig {
  const subjectLabel = input.navTranslations('subject.label');
  const defaultSubjectVisual = getKangurSixYearOldSubjectVisual(
    getKangurDefaultSubjectForAgeGroup(input.ageGroup)
  );

  return {
    closeAriaLabel: input.navTranslations('subject.closeAriaLabel'),
    contentId: 'kangur-primary-nav-subject-dialog',
    currentChoiceLabel: renderKangurPrimaryNavigationVisualChoiceLabel({
      detailTestId: 'kangur-primary-nav-subject-modal-current-detail',
      iconTestId: 'kangur-primary-nav-subject-modal-current-icon',
      isSixYearOld: input.isSixYearOld,
      label: input.subjectChoiceLabel,
      visual: input.subjectVisual,
    }),
    defaultChoiceLabel: renderKangurPrimaryNavigationVisualChoiceLabel({
      detailTestId: 'kangur-primary-nav-subject-modal-default-detail',
      iconTestId: 'kangur-primary-nav-subject-modal-default-icon',
      isSixYearOld: input.isSixYearOld,
      label: input.defaultSubjectLabel,
      visual: defaultSubjectVisual,
    }),
    description: input.navTranslations('subject.dialogDescription'),
    doneAriaLabel: 'Gotowe',
    doneLabel: resolveKangurPrimaryNavigationDoneLabel(
      input.isSixYearOld,
      'kangur-primary-nav-subject-modal-done-icon'
    ),
    groupAriaLabel: input.navTranslations('subject.groupAriaLabel'),
    label: subjectLabel,
    onOpenChange: input.onOpenChange,
    open: input.open,
    options: input.options,
    title: resolveKangurPrimaryNavigationDialogTitle({
      detail: '👆',
      detailTestId: 'kangur-primary-nav-subject-modal-title-detail',
      icon: '📚',
      iconTestId: 'kangur-primary-nav-subject-modal-title-icon',
      isSixYearOld: input.isSixYearOld,
      label: subjectLabel,
    }),
  };
}

function buildKangurPrimaryNavigationAgeGroupDialog(input: {
  ageGroupChoiceLabel: string;
  defaultAgeGroupLabel: string;
  isSixYearOld: boolean;
  navTranslations: KangurIntlTranslate;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  options: KangurChoiceDialogOption[];
  ageGroupVisual: KangurPrimaryNavigationContextValue['derived']['ageGroupVisual'];
}): KangurChoiceDialogConfig {
  const ageGroupLabel = input.navTranslations('ageGroup.label');
  const defaultAgeGroupVisual = getKangurSixYearOldAgeGroupVisual('ten_year_old');

  return {
    closeAriaLabel: input.navTranslations('ageGroup.closeAriaLabel'),
    contentId: 'kangur-primary-nav-age-group-dialog',
    currentChoiceLabel: renderKangurPrimaryNavigationVisualChoiceLabel({
      detailTestId: 'kangur-primary-nav-age-group-modal-current-detail',
      iconTestId: 'kangur-primary-nav-age-group-modal-current-icon',
      isSixYearOld: input.isSixYearOld,
      label: input.ageGroupChoiceLabel,
      visual: input.ageGroupVisual,
    }),
    defaultChoiceLabel: renderKangurPrimaryNavigationVisualChoiceLabel({
      detailTestId: 'kangur-primary-nav-age-group-modal-default-detail',
      iconTestId: 'kangur-primary-nav-age-group-modal-default-icon',
      isSixYearOld: input.isSixYearOld,
      label: input.defaultAgeGroupLabel,
      visual: defaultAgeGroupVisual,
    }),
    description: input.navTranslations('ageGroup.dialogDescription'),
    doneAriaLabel: 'Gotowe',
    doneLabel: resolveKangurPrimaryNavigationDoneLabel(
      input.isSixYearOld,
      'kangur-primary-nav-age-group-modal-done-icon'
    ),
    groupAriaLabel: input.navTranslations('ageGroup.groupAriaLabel'),
    label: ageGroupLabel,
    onOpenChange: input.onOpenChange,
    open: input.open,
    options: input.options,
    title: resolveKangurPrimaryNavigationDialogTitle({
      detail: '👆',
      detailTestId: 'kangur-primary-nav-age-group-modal-title-detail',
      icon: '👥',
      iconTestId: 'kangur-primary-nav-age-group-modal-title-icon',
      isSixYearOld: input.isSixYearOld,
      label: ageGroupLabel,
    }),
  };
}

function KangurPrimaryNavigationMobileMenuOverlay({
  closeMobileMenu,
  closeMobileMenuLabel,
  headerActions,
  isMobileMenuOpen,
  isMobileViewport,
  menuDescription,
  menuId,
  menuRef,
  menuTitle,
  navigationLabel,
  primaryActions,
  textColor,
  toneBackground,
  utilityActions,
}: {
  closeMobileMenu: () => void;
  closeMobileMenuLabel: string;
  headerActions: React.ReactNode;
  isMobileMenuOpen: boolean;
  isMobileViewport: boolean;
  menuDescription: string;
  menuId: string;
  menuRef: React.RefObject<HTMLDivElement | null>;
  menuTitle: string;
  navigationLabel: string;
  primaryActions: React.ReactNode;
  textColor: string;
  toneBackground: string;
  utilityActions: React.ReactNode;
}): React.ReactNode {
  if (!isMobileViewport && !isMobileMenuOpen) {
    return null;
  }

  const mobileMenuTitleId = `${menuId}-title`;
  const mobileMenuDescriptionId = `${menuId}-description`;

  return (
    <div
      aria-hidden={!isMobileMenuOpen}
      className={`fixed inset-0 z-50 transition-opacity duration-200 sm:hidden ${
        isMobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <button
        aria-hidden='true'
        className='absolute inset-0 cursor-pointer border-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.4)_0%,rgba(15,23,42,0.72)_100%)] p-0 touch-manipulation active:opacity-95'
        onClick={closeMobileMenu}
        tabIndex={-1}
        type='button'
      />
      <div
        aria-describedby={mobileMenuDescriptionId}
        aria-labelledby={mobileMenuTitleId}
        aria-modal='true'
        className={`relative flex h-full w-full flex-col kangur-panel-gap overflow-y-auto px-4 pb-[calc(var(--kangur-mobile-bottom-clearance,env(safe-area-inset-bottom))+32px)] pt-[calc(env(safe-area-inset-top)+20px)] transition-transform duration-200 min-[420px]:px-5 ${
          isMobileMenuOpen ? 'translate-y-0' : 'translate-y-4'
        }`}
        id={menuId}
        onClick={(event) => event.stopPropagation()}
        ref={menuRef}
        role='dialog'
        style={{
          backgroundColor: toneBackground,
          color: textColor,
        }}
      >
        <h2 className='sr-only' id={mobileMenuTitleId}>
          {menuTitle}
        </h2>
        <p className='sr-only' id={mobileMenuDescriptionId}>
          {menuDescription}
        </p>
        <KangurTopNavGroup className='w-full flex-col' label={navigationLabel}>
          <div className='flex w-full items-center gap-2' data-testid='kangur-primary-nav-mobile-header'>
            {headerActions ? (
              <div
                className='flex min-w-0 items-center gap-2'
                data-testid='kangur-primary-nav-mobile-header-actions'
              >
                {headerActions}
              </div>
            ) : null}
            <div className='ml-auto flex shrink-0 items-center'>
              <KangurPanelCloseButton
                aria-label={closeMobileMenuLabel}
                id='kangur-mobile-menu-close'
                onClick={closeMobileMenu}
                variant='chat'
              />
            </div>
          </div>
          {primaryActions}
          {utilityActions}
        </KangurTopNavGroup>
      </div>
    </div>
  );
}

function KangurPrimaryNavigationChoiceDialogs(): React.ReactNode {
  const {
    ageGroup,
    isAgeGroupModalOpen,
    isSubjectModalOpen,
    navTranslations,
    setIsAgeGroupModalOpen,
    setIsSubjectModalOpen,
    derived,
  } = useKangurPrimaryNavigationContext();

  const {
    ageGroupChoiceLabel,
    ageGroupOptions,
    ageGroupVisual,
    defaultAgeGroupLabel,
    defaultSubjectLabel,
    isSixYearOld,
    subjectChoiceLabel,
    subjectOptions,
    subjectVisual,
  } = derived;

  const subjectDialog = buildKangurPrimaryNavigationSubjectDialog({
    ageGroup: ageGroup,
    defaultSubjectLabel,
    isSixYearOld,
    navTranslations,
    onOpenChange: setIsSubjectModalOpen,
    open: isSubjectModalOpen,
    options: subjectOptions,
    subjectChoiceLabel,
    subjectVisual,
  });

  const ageGroupDialog = buildKangurPrimaryNavigationAgeGroupDialog({
    ageGroupChoiceLabel,
    ageGroupVisual,
    defaultAgeGroupLabel,
    isSixYearOld,
    navTranslations,
    onOpenChange: setIsAgeGroupModalOpen,
    open: isAgeGroupModalOpen,
    options: ageGroupOptions,
  });

  return (
    <Suspense fallback={null}>
      {subjectDialog.open ? (
        <KangurChoiceDialog
          closeAriaLabel={subjectDialog.closeAriaLabel}
          contentId={subjectDialog.contentId}
          currentChoiceLabel={subjectDialog.currentChoiceLabel}
          defaultChoiceLabel={subjectDialog.defaultChoiceLabel}
          doneAriaLabel={subjectDialog.doneAriaLabel}
          doneLabel={subjectDialog.doneLabel}
          groupAriaLabel={subjectDialog.groupAriaLabel}
          header={
            <KangurDialogMeta
              description={subjectDialog.description}
              title={subjectDialog.label}
            />
          }
          onOpenChange={subjectDialog.onOpenChange}
          open={subjectDialog.open}
          options={subjectDialog.options}
          title={subjectDialog.title}
        />
      ) : null}
      {ageGroupDialog.open ? (
        <KangurChoiceDialog
          closeAriaLabel={ageGroupDialog.closeAriaLabel}
          contentId={ageGroupDialog.contentId}
          currentChoiceLabel={ageGroupDialog.currentChoiceLabel}
          defaultChoiceLabel={ageGroupDialog.defaultChoiceLabel}
          doneAriaLabel={ageGroupDialog.doneAriaLabel}
          doneLabel={ageGroupDialog.doneLabel}
          groupAriaLabel={ageGroupDialog.groupAriaLabel}
          header={
            <KangurDialogMeta
              description={ageGroupDialog.description}
              title={ageGroupDialog.label}
            />
          }
          onOpenChange={ageGroupDialog.onOpenChange}
          open={ageGroupDialog.open}
          options={ageGroupDialog.options}
          title={ageGroupDialog.title}
        />
      ) : null}
    </Suspense>
  );
}

// --- Main Container Logic ---

function KangurPrimaryNavigationTopBarContent({
  primaryActions,
  utilityActions,
}: {
  primaryActions: React.ReactNode;
  utilityActions: React.ReactNode;
}): React.JSX.Element {
  const {
    isCoarsePointer,
    isMobileMenuOpen,
    isMobileViewport,
    navTranslations,
    navigationLabel,
    toggleMobileMenu,
  } = useKangurPrimaryNavigationContext();

  const mobileMenuLabel = isMobileMenuOpen
    ? navTranslations('mobileMenu.close')
    : navTranslations('mobileMenu.open');

  return (
    <>
      <div aria-hidden={isMobileViewport} className='hidden w-full min-w-0 sm:block'>
        <KangurTopNavGroup label={navigationLabel}>
          {primaryActions}
          {utilityActions}
        </KangurTopNavGroup>
      </div>
      <div aria-hidden={!isMobileViewport} className='w-full min-w-0 sm:hidden'>
        <KangurTopNavGroup label={navigationLabel}>
          <KangurButton
            aria-controls={KANGUR_PRIMARY_NAV_DIALOG_IDS.mobileMenu}
            aria-expanded={isMobileMenuOpen}
            aria-haspopup='dialog'
            aria-label={mobileMenuLabel}
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
      </div>
    </>
  );
}

function KangurPrimaryNavigationContent(): React.JSX.Element {
  const {
    ageGroup,
    closeMobileMenu,
    isAgeGroupModalOpen,
    isMobileMenuOpen,
    isMobileViewport,
    isSubjectModalOpen,
    kangurAppearance,
    navTranslations,
    navigationLabel,
    setIsAgeGroupModalOpen,
    setIsSubjectModalOpen,
    mobileMenuRef,
    props,
    derived,
  } = useKangurPrimaryNavigationContext();

  const { className, contentClassName, rightAccessory } = props;
  const {
    ageGroupChoiceLabel,
    ageGroupOptions,
    ageGroupVisual,
    defaultAgeGroupLabel,
    defaultSubjectLabel,
    isSixYearOld,
    subjectChoiceLabel,
    subjectOptions,
    subjectVisual,
    appearanceControlsInline,
    basePath,
    shouldRenderLanguageSwitcher,
  } = derived;

  const authActions = <KangurPrimaryNavigationAuthActions />;
  const primaryActions = <KangurPrimaryNavigationPrimaryActions />;
  const utilityActions = (
    <KangurPrimaryNavigationUtilityActions
      authActions={authActions}
      rightAccessory={rightAccessory}
    />
  );

  const mobileMenuHeaderActions = resolveMobileMenuHeaderActions({
    appearanceControlsInline,
    basePath,
    currentPage: props.currentPage,
    forceLanguageSwitcherFallbackPath: props.forceLanguageSwitcherFallbackPath ?? false,
    shouldRenderLanguageSwitcher,
  });

  const mobileAuthActions = (
    <KangurPrimaryNavigationAuthActions onActionClick={closeMobileMenu} />
  );
  const mobilePrimaryActions = (
    <KangurPrimaryNavigationPrimaryActions
      onActionClick={closeMobileMenu}
      wrapperClassName='flex w-full flex-col gap-2'
    />
  );
  const mobileUtilityActions = (
    <KangurPrimaryNavigationUtilityActions
      authActions={mobileAuthActions}
      onActionClick={closeMobileMenu}
      rightAccessory={rightAccessory}
      testId='kangur-primary-nav-mobile-utility-actions'
      wrapperClassName='flex w-full flex-col gap-2'
      hideAppearanceControls={Boolean(appearanceControlsInline)}
      hideLanguageSwitcher={shouldRenderLanguageSwitcher}
    />
  );

  return (
    <>
      <KangurPageTopBar
        className={className}
        contentClassName={contentClassName}
        left={
          <KangurPrimaryNavigationTopBarContent
            primaryActions={primaryActions}
            utilityActions={utilityActions}
          />
        }
      />
      <KangurPrimaryNavigationMobileMenuOverlay
        closeMobileMenu={closeMobileMenu}
        closeMobileMenuLabel={navTranslations('mobileMenu.close')}
        headerActions={mobileMenuHeaderActions}
        isMobileMenuOpen={isMobileMenuOpen}
        isMobileViewport={isMobileViewport}
        menuDescription={navTranslations('mobileMenu.description')}
        menuId={KANGUR_PRIMARY_NAV_DIALOG_IDS.mobileMenu}
        menuRef={mobileMenuRef}
        menuTitle={navTranslations('mobileMenu.title')}
        navigationLabel={navigationLabel}
        primaryActions={mobilePrimaryActions}
        textColor={kangurAppearance.tone.text}
        toneBackground={kangurAppearance.tone.background}
        utilityActions={mobileUtilityActions}
      />
      <KangurPrimaryNavigationChoiceDialogs />
    </>
  );
}

export function KangurPrimaryNavigation(props: KangurPrimaryNavigationProps): React.JSX.Element {
  return (
    <KangurPrimaryNavigationProvider {...props}>
      <KangurPrimaryNavigationContent />
    </KangurPrimaryNavigationProvider>
  );
}

export default KangurPrimaryNavigation;
