'use client';

import { Menu, X } from 'lucide-react';
import React from 'react';

import {
  KangurButton,
  KangurPageTopBar,
  KangurTopNavGroup,
} from '@/features/kangur/ui/design/primitives';

import {
  resolveMobileMenuHeaderActions,
} from './KangurPrimaryNavigation.utility-runtime';
import {
  KangurPrimaryNavigationAuthActions,
  KangurPrimaryNavigationPrimaryActions,
  KangurPrimaryNavigationUtilityActions,
} from './KangurPrimaryNavigation.sections';
import {
  buildKangurPrimaryNavigationAgeGroupDialog,
  buildKangurPrimaryNavigationSubjectDialog,
  KangurPrimaryNavigationChoiceDialogs,
  KangurPrimaryNavigationMobileMenuOverlay,
} from './KangurPrimaryNavigation.overlays';
import {
  KangurPrimaryNavigationProvider,
  useKangurPrimaryNavigationContext,
  KANGUR_PRIMARY_NAV_DIALOG_IDS,
} from './KangurPrimaryNavigation.context';
import type { KangurPrimaryNavigationProps } from './KangurPrimaryNavigation.types';
export type { KangurPrimaryNavigationProps } from './KangurPrimaryNavigation.types';
import { ICON_CLASSNAME } from './KangurPrimaryNavigation.utils';

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
    isCoarsePointer,
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
    appearanceControls,
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
      <KangurPrimaryNavigationChoiceDialogs
        ageGroupDialog={buildKangurPrimaryNavigationAgeGroupDialog({
          ageGroupChoiceLabel,
          ageGroupVisual,
          defaultAgeGroupLabel,
          isSixYearOld,
          navTranslations,
          onOpenChange: setIsAgeGroupModalOpen,
          open: isAgeGroupModalOpen,
          options: ageGroupOptions,
        })}
        subjectDialog={buildKangurPrimaryNavigationSubjectDialog({
          ageGroup: ageGroup,
          defaultSubjectLabel,
          isSixYearOld,
          navTranslations,
          onOpenChange: setIsSubjectModalOpen,
          open: isSubjectModalOpen,
          options: subjectOptions,
          subjectChoiceLabel,
          subjectVisual,
        })}
      />
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
