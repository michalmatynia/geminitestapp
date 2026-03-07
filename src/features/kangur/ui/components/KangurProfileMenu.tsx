'use client';

import * as React from 'react';
import Link from 'next/link';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { LogIn, LogOut, User } from 'lucide-react';

import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import {
  KangurGlassPanel,
  KangurMenuItem,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_TOP_NAV_ITEM_ACTIVE_CLASSNAME,
  KANGUR_TOP_NAV_ITEM_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { cn } from '@/shared/utils';

/**
 * Local UI primitives for Kangur to avoid importing from @/shared/ui (style isolation guardrail).
 */

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ children, className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content asChild ref={ref} sideOffset={sideOffset} {...props}>
      <KangurGlassPanel
        className={cn(
          'z-50 min-w-[11rem] overflow-hidden rounded-[22px] p-2 text-slate-700 backdrop-blur-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          className
        )}
        data-testid='kangur-profile-menu-shell'
        surface='solid'
        variant='soft'
      >
        {children}
      </KangurGlassPanel>
    </DropdownMenuPrimitive.Content>
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = 'DropdownMenuContent';

type KangurProfileMenuProps = {
  basePath: string;
  isAuthenticated: boolean;
  onLogout: () => void;
  onLogin?: () => void;
  triggerClassName?: string;
  isActive?: boolean;
};

export function KangurProfileMenu({
  basePath,
  isAuthenticated,
  onLogout,
  onLogin,
  triggerClassName,
  isActive = false,
}: KangurProfileMenuProps): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type='button'
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            KANGUR_TOP_NAV_ITEM_CLASSNAME,
            isActive ? KANGUR_TOP_NAV_ITEM_ACTIVE_CLASSNAME : null,
            triggerClassName
          )}
          data-doc-id='top_nav_profile'
        >
          <User className='h-[22px] w-[22px]' strokeWidth={2.1} /> Profil
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-44'>
        <DropdownMenuPrimitive.Item asChild>
          <KangurMenuItem asChild data-doc-id='profile_status_link'>
            <Link href={createPageUrl('LearnerProfile', basePath)}>Status</Link>
          </KangurMenuItem>
        </DropdownMenuPrimitive.Item>
        {isAuthenticated ? (
          <DropdownMenuPrimitive.Item asChild onSelect={() => onLogout()}>
            <KangurMenuItem data-doc-id='profile_logout'>
              <LogOut className='mr-2 h-4 w-4' />
              <span>Wyloguj</span>
            </KangurMenuItem>
          </DropdownMenuPrimitive.Item>
        ) : (
          <DropdownMenuPrimitive.Item asChild onSelect={() => onLogin?.()}>
            <KangurMenuItem data-doc-id='profile_login'>
              <LogIn className='mr-2 h-4 w-4' />
              <span>Zaloguj się</span>
            </KangurMenuItem>
          </DropdownMenuPrimitive.Item>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
