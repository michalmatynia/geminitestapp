'use client';

import * as React from 'react';
import Link from 'next/link';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { LogIn, LogOut, UserRound } from 'lucide-react';

import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';

/**
 * Local UI primitives for Kangur to avoid importing from @/shared/ui (style isolation guardrail).
 */

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className: _className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className='z-50 min-w-[8rem] overflow-hidden rounded-md border border-border/50 bg-popover/90 p-1 text-popover-foreground shadow-md backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2'
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = 'DropdownMenuContent';

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(({ className: _className, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className='relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-foreground/10 focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
    {...props}
  />
));
DropdownMenuItem.displayName = 'DropdownMenuItem';

type KangurProfileMenuProps = {
  basePath: string;
  isAuthenticated: boolean;
  onLogout: () => void;
  onLogin?: () => void;
  triggerClassName?: string;
};

export function KangurProfileMenu({
  basePath,
  isAuthenticated,
  onLogout,
  onLogin,
  triggerClassName = 'inline-flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-700 font-semibold transition',
}: KangurProfileMenuProps): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type='button' className={triggerClassName}>
          <UserRound className='w-4 h-4' /> Profil
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-44'>
        <DropdownMenuItem asChild>
          <Link href={createPageUrl('LearnerProfile', basePath)}>Status</Link>
        </DropdownMenuItem>
        {isAuthenticated ? (
          <DropdownMenuItem onSelect={() => onLogout()}>
            <LogOut className='mr-2 h-4 w-4' />
            <span>Wyloguj</span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => onLogin?.()}>
            <LogIn className='mr-2 h-4 w-4' />
            <span>Zaloguj się</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
