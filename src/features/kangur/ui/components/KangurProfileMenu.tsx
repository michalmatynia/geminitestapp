'use client';

import { User } from 'lucide-react';

import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { KANGUR_BASE_PATH, getKangurPageHref } from '@/features/kangur/config/routing';

type KangurProfileMenuProps = {
  profile?: {
    href: string;
    isActive?: boolean;
  };
  basePath?: string;
  isActive?: boolean;
  triggerClassName?: string;
};

export function KangurProfileMenu({
  profile,
  triggerClassName,
  basePath,
  isActive,
}: KangurProfileMenuProps): React.JSX.Element {
  const resolvedHref =
    profile?.href ??
    getKangurPageHref('LearnerProfile', basePath ?? KANGUR_BASE_PATH);
  const navigationActive = isActive ?? profile?.isActive ?? false;
  const buttonClassName = triggerClassName;

  return (
    <KangurButton
      asChild
      aria-current={navigationActive ? 'page' : undefined}
      className={buttonClassName}
      data-doc-id='top_nav_profile'
      size='md'
      variant={navigationActive ? 'navigationActive' : 'navigation'}
    >
      <Link href={resolvedHref} targetPageKey='LearnerProfile'>
        <User className='h-[18px] w-[18px] sm:h-5 sm:w-5' strokeWidth={2.15} />
        <span>Profil</span>
      </Link>
    </KangurButton>
  );
}
