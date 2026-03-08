'use client';

import NextLink from 'next/link';
import type { MouseEvent } from 'react';

import { useOptionalKangurRouteTransition } from '@/features/kangur/ui/context/KangurRouteTransitionContext';

type KangurTransitionLinkProps = React.ComponentProps<typeof NextLink> & {
  targetPageKey?: string | null;
};

const shouldStartTransition = (
  event: MouseEvent<HTMLAnchorElement>,
  href: React.ComponentProps<typeof NextLink>['href'],
  target?: string
): href is string => {
  if (event.defaultPrevented) {
    return false;
  }

  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }

  if (target === '_blank') {
    return false;
  }

  if (typeof href !== 'string' || href.startsWith('#')) {
    return false;
  }

  return href.startsWith('/');
};

export function KangurTransitionLink({
  href,
  onClick,
  target,
  targetPageKey,
  ...props
}: KangurTransitionLinkProps): React.JSX.Element {
  const routeTransition = useOptionalKangurRouteTransition();

  return (
    <NextLink
      href={href}
      target={target}
      onClick={(event) => {
        onClick?.(event);

        if (!routeTransition || !shouldStartTransition(event, href, target)) {
          return;
        }

        routeTransition.startRouteTransition({
          href,
          pageKey: targetPageKey ?? null,
        });
      }}
      {...props}
    />
  );
}

