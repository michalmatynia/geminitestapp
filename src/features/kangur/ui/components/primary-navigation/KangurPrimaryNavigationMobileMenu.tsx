'use client';

import React, { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

import { KangurLanguageSwitcher } from '@/features/kangur/ui/components/KangurLanguageSwitcher';
import { KangurTopNavGroup } from '@/features/kangur/ui/design/primitives';
import { KangurPanelCloseButton } from '@/features/kangur/ui/components/KangurPanelCloseButton';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';

import {
  KANGUR_PRIMARY_NAV_DIALOG_IDS,
  useKangurPrimaryNavigationContext,
} from './KangurPrimaryNavigation.context';
import {
  KangurPrimaryNavigationAuthActions,
  KangurPrimaryNavigationPrimaryActions,
  KangurPrimaryNavigationUtilityActions,
} from './KangurPrimaryNavigation.action-sections';
import {
  KangurPrimaryNavigationAppearanceControls,
  useKangurPrimaryNavigationHasAppearanceControls,
} from './KangurPrimaryNavigation.appearance-controls';
import type { KangurPrimaryNavigationProps } from './KangurPrimaryNavigation.types';

function renderMobileMenuHeaderActions({
  basePath,
  currentPage,
  forceLanguageSwitcherFallbackPath,
  kangurAppearanceTone,
  shouldRenderAppearanceControlsInline,
  shouldRenderLanguageSwitcher,
}: {
  basePath: string;
  currentPage: KangurPrimaryNavigationProps['currentPage'];
  forceLanguageSwitcherFallbackPath: boolean;
  kangurAppearanceTone: ReturnType<typeof useKangurStorefrontAppearance>['tone'];
  shouldRenderAppearanceControlsInline: boolean;
  shouldRenderLanguageSwitcher: boolean;
}): React.ReactNode {
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
        <div className='flex shrink-0 items-center'>
          <KangurPrimaryNavigationAppearanceControls
            inline
            tone={kangurAppearanceTone}
          />
        </div>
      ) : null}
    </>
  );
}

export function KangurPrimaryNavigationMobileMenu(): React.ReactNode {
  const {
    closeMobileMenu,
    fallbackCopy,
    props,
    derived,
  } = useKangurPrimaryNavigationContext();
  const kangurAppearance = useKangurStorefrontAppearance();
  const mobileMenuTranslations = useTranslations('KangurNavigation.mobileMenu');
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuPreviousFocusRef = useRef<HTMLElement | null>(null);

  const { rightAccessory } = props;
  const { basePath, shouldRenderLanguageSwitcher } = derived;
  const navigationLabel = props.navLabel ?? fallbackCopy.navLabel;
  const hasAppearanceControlsInline =
    useKangurPrimaryNavigationHasAppearanceControls();

  const menuId = KANGUR_PRIMARY_NAV_DIALOG_IDS.mobileMenu;
  const mobileMenuTitleId = `${menuId}-title`;
  const mobileMenuDescriptionId = `${menuId}-description`;

  const headerActions = renderMobileMenuHeaderActions({
    basePath,
    currentPage: props.currentPage,
    forceLanguageSwitcherFallbackPath: props.forceLanguageSwitcherFallbackPath ?? false,
    kangurAppearanceTone: kangurAppearance.tone,
    shouldRenderAppearanceControlsInline: hasAppearanceControlsInline,
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
      hideAppearanceControls={hasAppearanceControlsInline}
      hideLanguageSwitcher={shouldRenderLanguageSwitcher}
    />
  );
  const shouldRenderHeaderActions =
    headerActions !== null && headerActions !== undefined && headerActions !== false;

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    mobileMenuPreviousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return (): void => {
      document.body.style.overflow = previousOverflow;
      mobileMenuPreviousFocusRef.current?.focus();
      mobileMenuPreviousFocusRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const closeButton = document.getElementById('kangur-mobile-menu-close');
    if (closeButton instanceof HTMLElement) {
      closeButton.focus();
    }
  }, []);

  useEffect(() => {
    const menu = mobileMenuRef.current;
    if (!menu || typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

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
    const handleWindowKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        closeMobileMenu();
      }
    };
    const handleMenuKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') {
        return;
      }

      const focusable = getFocusable();
      const first = focusable.at(0);
      const last = focusable.at(-1);

      if (!first || !last) {
        return;
      }

      const activeElement = document.activeElement;
      if (event.shiftKey) {
        if (activeElement === first || activeElement === menu) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    menu.addEventListener('keydown', handleMenuKeyDown);

    return (): void => {
      window.removeEventListener('keydown', handleWindowKeyDown);
      menu.removeEventListener('keydown', handleMenuKeyDown);
    };
  }, [closeMobileMenu]);

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
          {mobileMenuTranslations('title')}
        </h2>
        <p className='sr-only' id={mobileMenuDescriptionId}>
          {mobileMenuTranslations('description')}
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
                aria-label={mobileMenuTranslations('close')}
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
