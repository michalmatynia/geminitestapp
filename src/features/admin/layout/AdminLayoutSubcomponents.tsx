'use client';

import React from 'react';
import { ChevronLeftIcon, Menu as MenuIcon, X as CloseIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import Menu from '@/features/admin/components/Menu';
import { Button } from '@/shared/ui/primitives.public';
import { QueryErrorBoundary } from '@/shared/ui/QueryErrorBoundary';
import { NoteSettingsProvider } from '@/shared/providers/NoteSettingsProvider';

const UserNav = dynamic(
  () => import('@/features/admin/components/UserNav').then((mod) => mod.UserNav),
  { ssr: false }
);

export function getSidebarClassName(
  isMenuHidden: boolean,
  isOverlayMenu: boolean,
  isMenuCollapsed: boolean
): string {
  if (isMenuHidden) return 'w-0 p-0 opacity-0 pointer-events-none overflow-hidden';
  if (isOverlayMenu) return 'w-[min(85vw,20rem)] p-3 md:w-[22rem] md:p-4';
  if (isMenuCollapsed) return 'w-16 p-2 sm:w-20 sm:p-4';
  return 'w-56 p-3 xl:w-64 xl:p-4';
}

export function getContentClassName(
  isMenuHidden: boolean,
  isOverlayMenu: boolean,
  isMenuCollapsed: boolean
): string {
  if (isMenuHidden || isOverlayMenu) return 'pl-0';
  if (isMenuCollapsed) return 'pl-16 sm:pl-20';
  return 'pl-56 xl:pl-64';
}

function isProductsListRoute(pathname: string): boolean {
  return (
    pathname === '/admin/products' ||
    pathname === '/admin/validator' ||
    pathname === '/admin/validator/lists' ||
    pathname === '/admin/ai-paths/queue' ||
    pathname === '/admin/system/logs'
  );
}

function isEmbeddedKangurRoute(pathname: string): boolean {
  return (
    pathname === '/admin/kangur' ||
    (pathname.startsWith('/admin/kangur/') && !pathname.startsWith('/admin/kangur/lessons-manager'))
  );
}

export function getMainPaddingClassName(pathname: string): string {
  if (isProductsListRoute(pathname)) return 'p-6';
  if (isEmbeddedKangurRoute(pathname)) return 'pt-6';
  return 'p-4 pt-16';
}

export function AdminSidebar({
  focusTrapRef,
  isMenuHidden,
  isMenuCollapsed,
  sidebarClassName,
  handleToggleCollapse,
}: {
  focusTrapRef: React.RefObject<HTMLElement | null>;
  isMenuHidden: boolean;
  isMenuCollapsed: boolean;
  sidebarClassName: string;
  handleToggleCollapse: () => void;
}): React.ReactNode {
  return (
    <aside
      ref={focusTrapRef}
      id='admin-sidebar'
      aria-label='Admin sidebar'
      className={`fixed inset-y-0 left-0 z-30 flex flex-col overflow-x-hidden border-r border-border/70 bg-slate-900/95 backdrop-blur transition-all duration-300 ${sidebarClassName}`}
      aria-hidden={isMenuHidden}
      data-scroll-focus-ignore='true'
    >
      {!isMenuHidden ? (
        <>
          <div
            className={`flex items-center mb-4 ${isMenuCollapsed ? 'justify-center' : 'justify-end'}`}
          >
            <Button
              variant='ghost'
              onClick={handleToggleCollapse}
              className='p-2 rounded-full hover:bg-muted/40'
              aria-controls='admin-sidebar'
              aria-expanded={!isMenuCollapsed}
              aria-label={isMenuCollapsed ? 'Expand admin sidebar' : 'Collapse admin sidebar'}
              title={isMenuCollapsed ? 'Expand admin sidebar' : 'Collapse admin sidebar'}
            >
              <ChevronLeftIcon
                className={`transition-transform duration-300 ${
                  isMenuCollapsed ? 'rotate-180' : ''
                }`}
                aria-hidden='true'
              />
            </Button>
          </div>
          <div className='flex-1 overflow-y-auto pr-1' data-scroll-focus-ignore='true'>
            <Menu />
          </div>
        </>
      ) : null}
    </aside>
  );
}

export function MobileMenuToggle({
  isMenuHidden,
  isOverlayMenu,
  overlayMenuToggleButtonRef,
  setIsMenuHidden,
}: {
  isMenuHidden: boolean;
  isOverlayMenu: boolean;
  overlayMenuToggleButtonRef: React.RefObject<HTMLButtonElement | null>;
  setIsMenuHidden: (hidden: boolean) => void;
}): React.ReactNode {
  if (!isOverlayMenu) return null;

  const label = isMenuHidden ? 'Open admin menu' : 'Close admin menu';
  return (
    <Button
      ref={overlayMenuToggleButtonRef}
      variant='ghost'
      onClick={() => setIsMenuHidden(!isMenuHidden)}
      className='h-9 w-9 rounded-full border border-border/60 bg-muted/40 hover:bg-muted/60'
      aria-controls='admin-sidebar'
      aria-expanded={!isMenuHidden}
      aria-label={label}
      title={label}
    >
      {isMenuHidden ? <MenuIcon className='h-4 w-4' /> : <CloseIcon className='h-4 w-4' />}
    </Button>
  );
}

export function AdminToolbar({
  mobileMenuToggle,
}: {
  mobileMenuToggle: React.ReactNode;
}): React.ReactNode {
  return (
    <header
      className='absolute top-0 right-0 z-[90] flex h-14 items-center px-6 pointer-events-none'
      aria-label='Admin toolbar'
    >
      <div className='pointer-events-auto'>
        <div className='flex items-center gap-2'>
          <div id='ai-paths-header-actions' className='flex items-center gap-2' />
          {mobileMenuToggle}
          <UserNav />
        </div>
      </div>
    </header>
  );
}

export function AdminMainContent({
  pathname,
  mainClassName,
  children,
}: {
  pathname: string;
  mainClassName: string;
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <main
      id='kangur-main-content'
      tabIndex={-1}
      className={`${mainClassName} focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
      data-scroll-focus-ignore='true'
    >
      <QueryErrorBoundary>
        <div className='min-w-0 max-w-full'>
          {pathname.startsWith('/admin/notes') ? (
            <NoteSettingsProvider>{children}</NoteSettingsProvider>
          ) : (
            children
          )}
        </div>
      </QueryErrorBoundary>
    </main>
  );
}
