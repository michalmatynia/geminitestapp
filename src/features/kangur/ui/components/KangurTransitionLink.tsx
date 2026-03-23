'use client';

import NextLink from 'next/link';
import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { localizeManagedKangurHref } from '@/features/kangur/ui/routing/managed-paths';
import { cn } from '@/features/kangur/shared/utils';

import type { MouseEvent } from 'react';

type KangurTransitionLinkProps = React.ComponentProps<typeof NextLink> & {
  targetPageKey?: string | null;
  transitionAcknowledgeMs?: number;
  transitionSourceId?: string | null;
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
  className,
  onClick,
  prefetch,
  scroll,
  target,
  targetPageKey,
  transitionAcknowledgeMs,
  transitionSourceId,
  ...props
}: KangurTransitionLinkProps): React.JSX.Element {
  const routeNavigator = useKangurRouteNavigator();
  const locale = useLocale();
  const pathname = usePathname();
  const managedLocalHref =
    typeof href === 'string' && href.startsWith('/') && target !== '_blank' ? href : null;
  const isManagedLocalHref = managedLocalHref !== null;
  const shouldPrefetch = prefetch !== false;
  const shouldUseManagedScroll = isManagedLocalHref;
  const resolvedScroll = scroll ?? (shouldUseManagedScroll ? false : undefined);
  const renderedHref =
    managedLocalHref === null
      ? href
      : localizeManagedKangurHref({
        href: managedLocalHref,
        locale,
        pathname,
      });

  useEffect(() => {
    if (!managedLocalHref || !shouldPrefetch) {
      return;
    }

    routeNavigator.prefetch(managedLocalHref);
  }, [managedLocalHref, routeNavigator, shouldPrefetch]);

  return (
    <NextLink
      href={renderedHref}
      className={cn('touch-manipulation select-none', className)}
      prefetch={prefetch}
      scroll={resolvedScroll}
      target={target}
      onClick={(event) => {
        if (onClick) {
          onClick(event);
        }

        if (!shouldStartTransition(event, href, target)) {
          return;
        }

        event.preventDefault();
        routeNavigator.push(href, {
          ...(typeof transitionAcknowledgeMs === 'number' ? { acknowledgeMs: transitionAcknowledgeMs } : {}),
          pageKey: targetPageKey ?? null,
          scroll: resolvedScroll ?? false,
          ...(transitionSourceId ? { sourceId: transitionSourceId } : {}),
        });
      }}
      {...props}
    />
  );
}
