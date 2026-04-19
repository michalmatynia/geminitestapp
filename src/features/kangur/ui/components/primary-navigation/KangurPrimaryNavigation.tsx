'use client';

import { Menu, X } from 'lucide-react';
import React from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

import {
  KangurButton,
  KangurPageTopBar,
  KangurTopNavGroup,
} from '@/features/kangur/ui/design/primitives';
import {
  KangurPrimaryNavigationProvider,
  useKangurPrimaryNavigationContext,
  KANGUR_PRIMARY_NAV_DIALOG_IDS,
} from './KangurPrimaryNavigation.context';
import type { KangurPrimaryNavigationProps } from './KangurPrimaryNavigation.types';
export type { KangurPrimaryNavigationProps } from './KangurPrimaryNavigation.types';
import { ICON_CLASSNAME } from './KangurPrimaryNavigation.utils';
import {
  KangurPrimaryNavigationAuthActions,
  KangurPrimaryNavigationPrimaryActions,
  KangurPrimaryNavigationUtilityActions,
} from './KangurPrimaryNavigation.action-sections';

const KangurPrimaryNavigationChoiceDialogsClient = dynamic(() =>
  import('./KangurPrimaryNavigationChoiceDialogs').then((m) => ({
    default: m.KangurPrimaryNavigationChoiceDialogsClient,
  }))
);
const KangurPrimaryNavigationMobileMenuClient = dynamic(() =>
  import('./KangurPrimaryNavigationMobileMenu').then((m) => ({
    default: m.KangurPrimaryNavigationMobileMenu,
  }))
);

function KangurPrimaryNavigationMobileMenuMount(): React.ReactNode {
  const { isMobileMenuOpen } = useKangurPrimaryNavigationContext();

  if (!isMobileMenuOpen) {
    return null;
  }

  return <KangurPrimaryNavigationMobileMenuClient />;
}

function KangurPrimaryNavigationChoiceDialogsMount(): React.ReactNode {
  const {
    isAgeGroupModalOpen,
    isSubjectModalOpen,
  } = useKangurPrimaryNavigationContext();

  if (!isAgeGroupModalOpen && !isSubjectModalOpen) {
    return null;
  }

  return <KangurPrimaryNavigationChoiceDialogsClient />;
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
    fallbackCopy,
    isCoarsePointer,
    isMobileMenuOpen,
    isMobileViewport,
    props,
    toggleMobileMenu,
  } = useKangurPrimaryNavigationContext();
  const navTranslations = useTranslations('KangurNavigation');
  const navigationLabel = props.navLabel ?? fallbackCopy.navLabel;

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
    props,
  } = useKangurPrimaryNavigationContext();

  const { className, contentClassName, rightAccessory } = props;

  const authActions = <KangurPrimaryNavigationAuthActions />;
  const primaryActions = <KangurPrimaryNavigationPrimaryActions />;
  const utilityActions = (
    <KangurPrimaryNavigationUtilityActions
      authActions={authActions}
      rightAccessory={rightAccessory}
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
      <KangurPrimaryNavigationMobileMenuMount />
      <KangurPrimaryNavigationChoiceDialogsMount />
    </>
  );
}

// KangurPrimaryNavigation is the top-level navigation bar for the StudiQ
// learner shell. It wraps KangurPrimaryNavigationContent in the navigation
// context provider so all sub-components can access shared nav state without
// prop drilling.
export function KangurPrimaryNavigation(props: KangurPrimaryNavigationProps): React.JSX.Element {
  return (
    <KangurPrimaryNavigationProvider {...props}>
      <KangurPrimaryNavigationContent />
    </KangurPrimaryNavigationProvider>
  );
}

export default KangurPrimaryNavigation;
