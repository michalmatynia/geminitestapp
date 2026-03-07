'use client';

import Link from 'next/link';
import { User } from 'lucide-react';

import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import { KangurButton } from '@/features/kangur/ui/design/primitives';

type KangurProfileMenuProps = {
  basePath: string;
  isActive?: boolean;
  triggerClassName?: string;
};

export function KangurProfileMenu({
  basePath,
  isActive = false,
  triggerClassName,
}: KangurProfileMenuProps): React.JSX.Element {
  return (
    <KangurButton
      asChild
      aria-current={isActive ? 'page' : undefined}
      className={triggerClassName}
      data-doc-id='top_nav_profile'
      size='md'
      variant={isActive ? 'navigationActive' : 'navigation'}
    >
      <Link href={createPageUrl('LearnerProfile', basePath)}>
        <User className='h-[18px] w-[18px] sm:h-5 sm:w-5' strokeWidth={2.15} />
        <span>Profil</span>
      </Link>
    </KangurButton>
  );
}
