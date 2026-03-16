import { User } from 'lucide-react';

import { KANGUR_BASE_PATH, getKangurPageHref } from '@/features/kangur/config/routing';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { KangurButton } from '@/features/kangur/ui/design/primitives';

type KangurProfileMenuProps = {
  label?: string;
  avatar?: {
    label: string;
    src: string;
  } | null;
  profile?: {
    href: string;
    isActive?: boolean;
  };
  basePath?: string;
  isActive?: boolean;
  isTransitionActive?: boolean;
  transitionAcknowledgeMs?: number;
  transitionSourceId?: string | null;
  triggerClassName?: string;
};

export function KangurProfileMenu({
  label,
  avatar,
  profile,
  triggerClassName,
  basePath,
  isActive,
  isTransitionActive = false,
  transitionAcknowledgeMs,
  transitionSourceId,
}: KangurProfileMenuProps): React.JSX.Element {
  const resolvedHref =
    profile?.href ??
    getKangurPageHref('LearnerProfile', basePath ?? KANGUR_BASE_PATH);
  const navigationActive = isActive ?? profile?.isActive ?? false;
  const buttonClassName = triggerClassName;
  const transitionMs = transitionAcknowledgeMs;
  const transitionSource = transitionSourceId;
  const navState = isTransitionActive ? 'transitioning' : 'idle';
  const shouldRenderActiveState = navigationActive || isTransitionActive;
  const avatarSrc = avatar?.src?.trim() ?? '';
  const shouldRenderAvatar = avatarSrc.length > 0;

  return (
    <KangurButton
      asChild
      aria-current={navigationActive ? 'page' : undefined}
      className={buttonClassName}
      data-doc-id='top_nav_profile'
      data-nav-state={navState}
      size='md'
      variant={shouldRenderActiveState ? 'navigationActive' : 'navigation'}
    >
      <Link
        href={resolvedHref}
        targetPageKey='LearnerProfile'
        transitionAcknowledgeMs={transitionMs}
        transitionSourceId={transitionSource}
      >
        {shouldRenderAvatar ? (
          <span className='relative h-[18px] w-[18px] overflow-hidden rounded-full border border-white/80 bg-white/80 shadow-sm sm:h-5 sm:w-5'>
            <img
              src={avatarSrc}
              alt=''
              aria-hidden='true'
              className='h-full w-full object-cover'
            />
          </span>
        ) : (
          <User className='h-[18px] w-[18px] sm:h-5 sm:w-5' strokeWidth={2.15} />
        )}
        <span className='truncate'>{label ?? 'Profil'}</span>
      </Link>
    </KangurButton>
  );
}
