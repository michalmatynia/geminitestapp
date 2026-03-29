import { User } from 'lucide-react';
import { useLocale } from 'next-intl';

import { KANGUR_BASE_PATH, getKangurPageHref } from '@/features/kangur/config/routing';
import { KangurNavAction } from '@/features/kangur/ui/components/KangurNavAction';
import { useOptionalKangurRouteTransitionState } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

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

type KangurProfileMenuState = {
  avatarSrc: string;
  buttonClassName: string;
  isTransitionActive: boolean;
  navigationActive: boolean;
  resolvedHref: string;
  resolvedLabel: string;
  shouldRenderAvatar: boolean;
  transitionMs: number | undefined;
  transitionSource?: string;
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

const getProfileMenuFallbackLabel = (
  locale: ReturnType<typeof normalizeSiteLocale>
): string => {
  switch (locale) {
    case 'en':
      return 'Profile';
    case 'uk':
      return 'Профіль';
    case 'de':
    case 'pl':
    default:
      return 'Profil';
  }
};

const resolveKangurProfileMenuClassName = ({
  isCoarsePointer,
  triggerClassName,
}: {
  isCoarsePointer: boolean;
  triggerClassName: string | undefined;
}): string =>
  [
    triggerClassName,
    isCoarsePointer ? 'min-h-12 px-4 touch-manipulation select-none active:scale-[0.985]' : null,
  ]
    .filter(Boolean)
    .join(' ');

const resolveKangurProfileMenuTransitionState = ({
  routeTransitionState,
  transitionSource,
}: {
  routeTransitionState: ReturnType<typeof useOptionalKangurRouteTransitionState>;
  transitionSource: string | undefined;
}): boolean =>
  isTransitionSourceActive({
    activeTransitionSourceId: routeTransitionState?.activeTransitionSourceId,
    transitionPhase: routeTransitionState?.transitionPhase,
    transitionSourceId: transitionSource,
  });

const resolveKangurProfileMenuHref = ({
  basePath,
  profile,
}: {
  basePath: string | undefined;
  profile: KangurProfileMenuProps['profile'];
}): string => profile?.href ?? getKangurPageHref('LearnerProfile', basePath ?? KANGUR_BASE_PATH);

const resolveKangurProfileMenuNavigationActive = ({
  isActive,
  profile,
}: {
  isActive: boolean | undefined;
  profile: KangurProfileMenuProps['profile'];
}): boolean => isActive ?? profile?.isActive ?? false;

const resolveKangurProfileMenuLabel = ({
  label,
  locale,
}: {
  label: string | undefined;
  locale: ReturnType<typeof normalizeSiteLocale>;
}): string => label ?? getProfileMenuFallbackLabel(locale);

const resolveKangurProfileMenuState = ({
  avatar,
  basePath,
  isActive,
  isCoarsePointer,
  label,
  locale,
  profile,
  routeTransitionState,
  transitionAcknowledgeMs,
  transitionSourceId,
  triggerClassName,
}: KangurProfileMenuProps & {
  isCoarsePointer: boolean;
  locale: ReturnType<typeof normalizeSiteLocale>;
  routeTransitionState: ReturnType<typeof useOptionalKangurRouteTransitionState>;
}): KangurProfileMenuState => {
  const avatarSrc = avatar?.src?.trim() ?? '';
  const transitionSource = transitionSourceId ?? undefined;

  return {
    avatarSrc,
    buttonClassName: resolveKangurProfileMenuClassName({
      isCoarsePointer,
      triggerClassName,
    }),
    isTransitionActive: resolveKangurProfileMenuTransitionState({
      routeTransitionState,
      transitionSource,
    }),
    navigationActive: resolveKangurProfileMenuNavigationActive({
      isActive,
      profile,
    }),
    resolvedHref: resolveKangurProfileMenuHref({
      basePath,
      profile,
    }),
    resolvedLabel: resolveKangurProfileMenuLabel({
      label,
      locale,
    }),
    shouldRenderAvatar: avatarSrc.length > 0,
    transitionMs: transitionAcknowledgeMs,
    transitionSource,
  };
};

function KangurProfileMenuIcon({
  avatarSrc,
  shouldRenderAvatar,
}: {
  avatarSrc: string;
  shouldRenderAvatar: boolean;
}): React.JSX.Element {
  if (shouldRenderAvatar) {
    return (
      <span className='relative h-[18px] w-[18px] overflow-hidden rounded-full border border-white/80 bg-white/80 shadow-sm sm:h-5 sm:w-5'>
        <img
          src={avatarSrc}
          alt=''
          aria-hidden='true'
          className='h-full w-full object-cover'
        />
      </span>
    );
  }

  return <User aria-hidden='true' className='h-[18px] w-[18px] sm:h-5 sm:w-5' strokeWidth={2.15} />;
}

export function KangurProfileMenu(props: KangurProfileMenuProps): React.JSX.Element {
  const {
    avatar,
    basePath,
    isActive,
    label,
    profile,
    transitionAcknowledgeMs,
    transitionSourceId,
    triggerClassName,
  } = props;
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const isCoarsePointer = useKangurCoarsePointer();
  const locale = normalizeSiteLocale(useLocale());
  const state = resolveKangurProfileMenuState({
    avatar,
    basePath,
    isActive,
    isCoarsePointer,
    label,
    locale,
    profile,
    routeTransitionState,
    transitionAcknowledgeMs,
    transitionSourceId,
    triggerClassName,
  });

  return (
    <KangurNavAction
      active={state.navigationActive}
      className={state.buttonClassName}
      docId='top_nav_profile'
      href={state.resolvedHref}
      size='md'
      targetPageKey='LearnerProfile'
      transition={{
        active: state.isTransitionActive,
        acknowledgeMs: state.transitionMs,
        sourceId: state.transitionSource,
      }}
    >
      <KangurProfileMenuIcon
        avatarSrc={state.avatarSrc}
        shouldRenderAvatar={state.shouldRenderAvatar}
      />
      <span className='truncate'>{state.resolvedLabel}</span>
    </KangurNavAction>
  );
}
