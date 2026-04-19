'use client';

import React from 'react';

import { KangurLanguageSwitcher } from '@/features/kangur/ui/components/KangurLanguageSwitcher';
import { KangurTopNavGroup } from '@/features/kangur/ui/design/primitives';
import { KangurPanelCloseButton } from '@/features/kangur/ui/components/KangurPanelCloseButton';

import {
  KANGUR_PRIMARY_NAV_DIALOG_IDS,
  useKangurPrimaryNavigationContext,
} from './KangurPrimaryNavigation.context';
import {
  KangurPrimaryNavigationAuthActions,
  KangurPrimaryNavigationPrimaryActions,
  KangurPrimaryNavigationUtilityActions,
} from './KangurPrimaryNavigation.action-sections';
import type { KangurPrimaryNavigationProps } from './KangurPrimaryNavigation.types';

function renderMobileMenuHeaderActions({
  appearanceControlsInline,
  basePath,
  currentPage,
  forceLanguageSwitcherFallbackPath,
  shouldRenderLanguageSwitcher,
}: {
  appearanceControlsInline: React.ReactNode;
  basePath: string;
  currentPage: KangurPrimaryNavigationProps['currentPage'];
  forceLanguageSwitcherFallbackPath: boolean;
  shouldRenderLanguageSwitcher: boolean;
}): React.ReactNode {
  const shouldRenderAppearanceControlsInline =
    appearanceControlsInline !== null &&
    appearanceControlsInline !== undefined &&
    appearanceControlsInline !== false;

  if (!shouldRenderLanguageSwitcher && !shouldRenderAppearanceControlsInline) {
    return null;
  }

  return (
    <>
      {shouldRenderLanguageSwitcher ? (
        <KangurLanguageSwitcher
          basePath={basePath}
          currentPage={currentPage}
          forceFallbackPath={forceLanguageSwitcherFallbackPath}
        />
      ) : null}
      {shouldRenderAppearanceControlsInline ? (
        <div className='flex shrink-0 items-center'>{appearanceControlsInline}</div>
      ) : null}
    </>
  );
}

export function KangurPrimaryNavigationMobileMenu(): React.ReactNode {
  const {
    closeMobileMenu,
    kangurAppearance,
    navTranslations,
    navigationLabel,
    mobileMenuRef,
    props,
    derived,
  } = useKangurPrimaryNavigationContext();

  const { rightAccessory } = props;
  const {
    appearanceControlsInline,
    basePath,
    shouldRenderLanguageSwitcher,
  } = derived;

  const menuId = KANGUR_PRIMARY_NAV_DIALOG_IDS.mobileMenu;
  const mobileMenuTitleId = `${menuId}-title`;
  const mobileMenuDescriptionId = `${menuId}-description`;

  const headerActions = renderMobileMenuHeaderActions({
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
  const shouldRenderHeaderActions =
    headerActions !== null && headerActions !== undefined && headerActions !== false;

  return (
    <div className='fixed inset-0 z-50 opacity-100 transition-opacity duration-200 sm:hidden'>
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
        className='relative flex h-full w-full translate-y-0 flex-col kangur-panel-gap overflow-y-auto px-4 pb-[calc(var(--kangur-mobile-bottom-clearance,env(safe-area-inset-bottom))+32px)] pt-[calc(env(safe-area-inset-top)+20px)] transition-transform duration-200 min-[420px]:px-5'
        id={menuId}
        onClick={(event) => event.stopPropagation()}
        ref={mobileMenuRef}
        role='dialog'
        style={{
          backgroundColor: kangurAppearance.tone.background,
          color: kangurAppearance.tone.text,
        }}
      >
        <h2 className='sr-only' id={mobileMenuTitleId}>
          {navTranslations('mobileMenu.title')}
        </h2>
        <p className='sr-only' id={mobileMenuDescriptionId}>
          {navTranslations('mobileMenu.description')}
        </p>
        <KangurTopNavGroup className='w-full flex-col' label={navigationLabel}>
          <div className='flex w-full items-center gap-2' data-testid='kangur-primary-nav-mobile-header'>
            {shouldRenderHeaderActions ? (
              <div
                className='flex min-w-0 items-center gap-2'
                data-testid='kangur-primary-nav-mobile-header-actions'
              >
                {headerActions}
              </div>
            ) : null}
            <div className='ml-auto flex shrink-0 items-center'>
              <KangurPanelCloseButton
                aria-label={navTranslations('mobileMenu.close')}
                id='kangur-mobile-menu-close'
                onClick={closeMobileMenu}
                variant='chat'
              />
            </div>
          </div>
          {mobilePrimaryActions}
          {mobileUtilityActions}
        </KangurTopNavGroup>
      </div>
    </div>
  );
}
