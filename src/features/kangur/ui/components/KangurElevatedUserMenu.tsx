'use client';

import { LayoutGrid, LogOut } from 'lucide-react';
import Link from 'next/link';

import { KangurButton } from '@/features/kangur/ui/design/primitives';
import type { ElevatedSessionUserSnapshot } from '@/shared/lib/auth/elevated-session-user';
import { cn } from '@/shared/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

type KangurElevatedUserMenuProps = {
  adminHref?: string;
  adminLabel: string;
  logoutLabel: string;
  onLogout: () => void;
  triggerAriaLabel: string;
  triggerClassName?: string;
  user: ElevatedSessionUserSnapshot;
};

const getElevatedUserInitial = (user: ElevatedSessionUserSnapshot): string => {
  const candidate = user.name?.trim() || user.email?.trim() || 'A';
  return candidate[0]?.toUpperCase() ?? 'A';
};

type KangurElevatedUserMenuModel = {
  displayName: string;
  imageSrc: string;
  initial: string;
};

const ElevatedUserAvatar = ({
  imageSrc,
  initial,
}: {
  imageSrc: string;
  initial: string;
}): React.JSX.Element => (
  <span className='flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/75 bg-white/85 text-sm font-black text-[var(--kangur-page-text)] shadow-sm'>
    {imageSrc ? (
      <img
        alt=''
        aria-hidden='true'
        className='h-full w-full object-cover'
        src={imageSrc}
      />
    ) : (
      <span aria-hidden='true'>{initial}</span>
    )}
  </span>
);

export function KangurElevatedUserMenu({
  adminHref = '/admin',
  adminLabel,
  logoutLabel,
  onLogout,
  triggerAriaLabel,
  triggerClassName,
  user,
}: KangurElevatedUserMenuProps): React.JSX.Element {
  const model = resolveKangurElevatedUserMenuModel(user, adminLabel);
  return renderKangurElevatedUserMenu(
    {
      adminHref,
      adminLabel,
      logoutLabel,
      onLogout,
      triggerAriaLabel,
      triggerClassName,
      user,
    },
    model
  );
}

function resolveKangurElevatedUserMenuModel(
  user: ElevatedSessionUserSnapshot,
  adminLabel: string
): KangurElevatedUserMenuModel {
  const displayName = user.name?.trim() || user.email?.trim() || adminLabel;
  const imageSrc = user.image?.trim() ?? '';
  const initial = getElevatedUserInitial(user);

  return {
    displayName,
    imageSrc,
    initial,
  };
}

function renderKangurElevatedUserMenu(
  {
    adminHref,
    adminLabel,
    logoutLabel,
    onLogout,
    triggerAriaLabel,
    triggerClassName,
    user,
  }: KangurElevatedUserMenuProps & { adminHref: string },
  { displayName, imageSrc, initial }: KangurElevatedUserMenuModel
): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <KangurButton
          aria-label={triggerAriaLabel}
          className={cn(
            'relative z-[95] h-10 w-10 rounded-full opacity-60 transition-opacity hover:opacity-100',
            triggerClassName
          )}
          data-testid='kangur-elevated-user-menu-trigger'
          size='md'
          title={displayName}
          variant='ghost'
          type='button'
        >
          <ElevatedUserAvatar imageSrc={imageSrc} initial={initial} />
        </KangurButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='z-[95] w-56' sideOffset={8}>
        <DropdownMenuLabel className='font-normal'>
          <div className='flex flex-col space-y-1'>
            <p className='text-sm font-medium leading-none'>{displayName}</p>
            {user.email ? (
              <p className='text-xs leading-none text-muted-foreground'>{user.email}</p>
            ) : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={adminHref}>
            <LayoutGrid className='mr-2 h-4 w-4' />
            <span>{adminLabel}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            onLogout();
          }}
        >
          <LogOut className='mr-2 h-4 w-4' />
          <span>{logoutLabel}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
