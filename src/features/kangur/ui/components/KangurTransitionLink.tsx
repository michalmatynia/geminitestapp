'use client';

import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useOptionalKangurRouteTransition } from '@/features/kangur/ui/context/KangurRouteTransitionContext';

import type { MouseEvent } from 'react';

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
  scroll,
  target,
  targetPageKey,
  ...props
}: KangurTransitionLinkProps): React.JSX.Element {
  const router = useRouter();
  const routeTransition = useOptionalKangurRouteTransition();
  const managedLocalHref =
    typeof href === 'string' && href.startsWith('/') && target !== '_blank' ? href : null;
  const isManagedLocalHref = managedLocalHref !== null;
  const shouldUseManagedScroll = isManagedLocalHref;
  const resolvedScroll = scroll ?? (shouldUseManagedScroll ? false : undefined);

  useEffect(() => {
    if (!managedLocalHref || typeof router.prefetch !== 'function') {
      return;
    }

    router.prefetch(managedLocalHref);
  }, [managedLocalHref, router]);

  return (
    <NextLink
      href={href}
      scroll={resolvedScroll}
      target={target}
      onClick={(event) => {
        if (onClick) {
          onClick(event);
        }

        if (!routeTransition || !shouldStartTransition(event, href, target)) {
          return;
        }

        event.preventDefault();
        routeTransition.startRouteTransition({
          href,
          pageKey: targetPageKey ?? null,
        });
        router.push(href, { scroll: resolvedScroll ?? false });
      }}
      {...props}
    />
  );
}
