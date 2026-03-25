'use client';

import NextLink from 'next/link';
import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect } from 'react';

import { KANGUR_BASE_PATH } from '@/features/kangur/config/routing';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  localizeManagedKangurHref,
  resolveManagedKangurPageKeyFromHref,
} from '@/features/kangur/ui/routing/managed-paths';
import {
  resolveKangurRouteTransitionSkeletonVariant,
} from '@/features/kangur/ui/routing/route-transition-skeletons';
import {
  setKangurPendingRouteLoadingSnapshot,
} from '@/features/kangur/ui/routing/pending-route-loading-snapshot';
import { readKangurTopBarHeightCssValue } from '@/features/kangur/ui/utils/readKangurTopBarHeightCssValue';
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
  const routing = useOptionalKangurRouting();
  const locale = useLocale();
  const pathname = usePathname();
  const basePath = routing?.basePath ?? KANGUR_BASE_PATH;
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
  const publishPendingSnapshot = useCallback((): void => {
    if (managedLocalHref === null || typeof renderedHref !== 'string') {
      return;
    }

    const resolvedPageKey =
      targetPageKey ?? resolveManagedKangurPageKeyFromHref(renderedHref, basePath);

    setKangurPendingRouteLoadingSnapshot({
      fromHref: pathname,
      href: renderedHref,
      pageKey: resolvedPageKey ?? null,
      skeletonVariant: resolveKangurRouteTransitionSkeletonVariant({
        basePath,
        href: renderedHref,
        pageKey: resolvedPageKey ?? null,
      }),
      startedAt: Date.now(),
      topBarHeightCssValue: readKangurTopBarHeightCssValue(),
    });
  }, [basePath, managedLocalHref, renderedHref, targetPageKey]);

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
      onClickCapture={(event) => {
        if (!shouldStartTransition(event, href, target)) {
          return;
        }

        publishPendingSnapshot();
        event.preventDefault();
        routeNavigator.push(href, {
          ...(typeof transitionAcknowledgeMs === 'number' ? { acknowledgeMs: transitionAcknowledgeMs } : {}),
          pageKey: targetPageKey ?? null,
          scroll: resolvedScroll ?? false,
          ...(transitionSourceId ? { sourceId: transitionSourceId } : {}),
        });
      }}
      onClick={(event) => {
        if (onClick) {
          onClick(event);
        }

        if (!shouldStartTransition(event, href, target)) {
          return;
        }
      }}
      {...props}
    />
  );
}
