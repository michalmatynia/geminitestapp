'use client';

import NextLink from 'next/link';
import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useCallback } from 'react';

import { KANGUR_BASE_PATH } from '@/features/kangur/config/routing';
import { useOptionalFrontendPublicOwner } from '@/features/kangur/ui/FrontendPublicOwnerContext';
import { useOptionalNextAuthSession } from '@/features/kangur/ui/hooks/useOptionalNextAuthSession';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  canonicalizeKangurPublicAliasHref,
  localizeManagedKangurHref,
  resolveAccessibleManagedKangurTargetPageKey,
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
  disabled?: boolean;
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
  disabled = false,
  onClick,
  prefetch,
  scroll,
  tabIndex,
  target,
  targetPageKey,
  transitionAcknowledgeMs,
  transitionSourceId,
  'aria-disabled': ariaDisabledProp,
  ...props
}: KangurTransitionLinkProps): React.JSX.Element {
  const routeNavigator = useKangurRouteNavigator();
  const routing = useOptionalKangurRouting();
  const { data: session } = useOptionalNextAuthSession();
  const frontendPublicOwner = useOptionalFrontendPublicOwner();
  const locale = useLocale();
  const pathname = usePathname();
  const basePath = routing?.basePath ?? KANGUR_BASE_PATH;
  const currentAccessiblePageKey = routing?.pageKey ?? 'Game';
  const effectivePageKeyBasePath = frontendPublicOwner?.publicOwner === 'kangur' ? '/' : basePath;
  const managedLocalHref =
    typeof href === 'string' && href.startsWith('/') && target !== '_blank' ? href : null;
  const isManagedLocalHref = managedLocalHref !== null;
  const resolvedPrefetch = isManagedLocalHref ? (prefetch ?? false) : prefetch;
  const shouldUseManagedScroll = isManagedLocalHref;
  const resolvedScroll = scroll ?? (shouldUseManagedScroll ? false : undefined);
  const resolvedTabIndex = disabled ? -1 : tabIndex;
  const resolvedAriaDisabled = disabled ? 'true' : ariaDisabledProp;
  const renderedHref =
    managedLocalHref === null
      ? href
      : (() => {
        const localizedHref = localizeManagedKangurHref({
          href: managedLocalHref,
          locale,
          pathname,
        });

        return frontendPublicOwner?.publicOwner === 'kangur'
          ? canonicalizeKangurPublicAliasHref(localizedHref)
          : localizedHref;
      })();
  const publishPendingSnapshot = useCallback((): void => {
    if (managedLocalHref === null || typeof renderedHref !== 'string') {
      return;
    }

    const accessibleResolvedPageKey = resolveAccessibleManagedKangurTargetPageKey({
      basePath: effectivePageKeyBasePath,
      fallbackPageKey: currentAccessiblePageKey,
      href: renderedHref,
      pageKey: targetPageKey,
      session,
    });

    setKangurPendingRouteLoadingSnapshot({
      fromHref: pathname,
      href: renderedHref,
      pageKey: accessibleResolvedPageKey ?? null,
      skeletonVariant: resolveKangurRouteTransitionSkeletonVariant({
        basePath: effectivePageKeyBasePath,
        href: renderedHref,
        pageKey: accessibleResolvedPageKey ?? null,
      }),
      startedAt: Date.now(),
      topBarHeightCssValue: readKangurTopBarHeightCssValue(),
    });
  }, [
    currentAccessiblePageKey,
    effectivePageKeyBasePath,
    managedLocalHref,
    pathname,
    renderedHref,
    session,
    targetPageKey,
  ]);

  return (
    <NextLink
      href={renderedHref}
      aria-disabled={resolvedAriaDisabled}
      className={cn(
        'touch-manipulation select-none',
        disabled && 'pointer-events-none cursor-not-allowed opacity-40',
        className
      )}
      prefetch={resolvedPrefetch}
      scroll={resolvedScroll}
      tabIndex={resolvedTabIndex}
      target={target}
      onClickCapture={(event) => {
        if (disabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

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
        if (disabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

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
