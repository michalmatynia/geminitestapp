'use client';

import { LayoutGrid, LogOut, User } from 'lucide-react';
import Link from 'next/link';

import type { ElevatedSessionUserSnapshot } from '@/shared/lib/auth/elevated-session-user';
import { cn } from '@/shared/utils';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui';

type KangurElevatedUserMenuProps = {
  adminHref?: string;
  adminLabel: string;
  logoutLabel: string;
  onLogout: () => void;
  profile?: {
    href: string;
    label: string;
  } | null;
  triggerAriaLabel: string;
  triggerClassName?: string;
  user: ElevatedSessionUserSnapshot;
};

const getElevatedUserInitial = (user: ElevatedSessionUserSnapshot): string => {
  const candidate = user.name?.trim() || user.email?.trim() || 'A';
  return candidate[0]?.toUpperCase() ?? 'A';
};

export function KangurElevatedUserMenu({
  adminHref = '/admin',
  adminLabel,
  logoutLabel,
  onLogout,
  profile,
  triggerAriaLabel,
  triggerClassName,
  user,
}: KangurElevatedUserMenuProps): React.JSX.Element {
  const displayName = user.name?.trim() || user.email?.trim() || adminLabel;
  const imageSrc = user.image?.trim() ?? '';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={triggerAriaLabel}
          className={cn(
            'relative z-[95] h-10 w-10 rounded-full opacity-60 transition-opacity hover:opacity-100',
            triggerClassName
          )}
          data-testid='kangur-elevated-user-menu-trigger'
          title={displayName}
          variant='ghost'
        >
          <Avatar className='h-10 w-10'>
            {imageSrc ? <AvatarImage alt={displayName} src={imageSrc} /> : null}
            <AvatarFallback>{getElevatedUserInitial(user)}</AvatarFallback>
          </Avatar>
        </Button>
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
        {profile ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={profile.href}>
                <User className='mr-2 h-4 w-4' />
                <span>{profile.label}</span>
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
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
