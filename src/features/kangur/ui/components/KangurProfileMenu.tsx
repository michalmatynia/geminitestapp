import { User } from 'lucide-react';

import { KANGUR_BASE_PATH, getKangurPageHref } from '@/features/kangur/config/routing';
import { KangurNavAction } from '@/features/kangur/ui/components/KangurNavAction';
import { useOptionalKangurRouteTransitionState } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';

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
  transitionAcknowledgeMs?: number;
  transitionSourceId?: string | null;
  triggerClassName?: string;
};

const isTransitionSourceActive = ({
  activeTransitionSourceId,
  transitionPhase,
  transitionSourceId,
}: {
  activeTransitionSourceId?: string | null;
  transitionPhase?: string;
  transitionSourceId?: string;
}): boolean =>
  Boolean(
    transitionSourceId &&
      activeTransitionSourceId === transitionSourceId &&
      transitionPhase &&
      transitionPhase !== 'idle'
  );

export function KangurProfileMenu({
  label,
  avatar,
  profile,
  triggerClassName,
  basePath,
  isActive,
  transitionAcknowledgeMs,
  transitionSourceId,
}: KangurProfileMenuProps): React.JSX.Element {
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const isCoarsePointer = useKangurCoarsePointer();
  const resolvedHref =
    profile?.href ??
    getKangurPageHref('LearnerProfile', basePath ?? KANGUR_BASE_PATH);
  const navigationActive = isActive ?? profile?.isActive ?? false;
  const buttonClassName = [
    triggerClassName,
    isCoarsePointer ? 'min-h-12 px-4 touch-manipulation select-none active:scale-[0.985]' : null,
  ]
    .filter(Boolean)
    .join(' ');
  const transitionMs = transitionAcknowledgeMs;
  const transitionSource = transitionSourceId;
  const avatarSrc = avatar?.src?.trim() ?? '';
  const shouldRenderAvatar = avatarSrc.length > 0;

  const isTransitionActive = isTransitionSourceActive({
    activeTransitionSourceId: routeTransitionState?.activeTransitionSourceId,
    transitionPhase: routeTransitionState?.transitionPhase,
    transitionSourceId: transitionSourceId ?? undefined,
  });

  return (
    <KangurNavAction
      active={navigationActive}
      className={buttonClassName}
      docId='top_nav_profile'
      href={resolvedHref}
      size='md'
      targetPageKey='LearnerProfile'
      transition={{
        active: isTransitionActive,
        acknowledgeMs: transitionMs,
        sourceId: transitionSource ?? undefined,
      }}
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
        <User aria-hidden='true' className='h-[18px] w-[18px] sm:h-5 sm:w-5' strokeWidth={2.15} />
      )}
      <span className='truncate'>{label ?? 'Profil'}</span>
    </KangurNavAction>
  );
}
