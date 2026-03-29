'use client';

import NextLink from 'next/link';
import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

import { useOptionalFrontendPublicOwner } from '@/features/kangur/ui/FrontendPublicOwnerContext';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  canonicalizeKangurPublicAliasHref,
  localizeManagedKangurHref,
  resolveManagedKangurBasePath,
} from '@/features/kangur/ui/routing/managed-paths';
import { useKangurRouteAccess } from '@/features/kangur/ui/routing/useKangurRouteAccess';
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
  onFocus,
  onMouseEnter,
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
  const isCoarsePointer = useKangurCoarsePointer();
  const routing = useOptionalKangurRouting();
  const { resolveManagedTargetPageKey, resolveTransitionSkeletonVariant } = useKangurRouteAccess();
  const frontendPublicOwner = useOptionalFrontendPublicOwner();
  const locale = useLocale();
  const pathname = usePathname();
  const currentAccessiblePageKey = routing?.pageKey ?? 'Game';
  const managedLocalHref =
    typeof href === 'string' && href.startsWith('/') && target !== '_blank' ? href : null;
  const isManagedLocalHref = managedLocalHref !== null;
  const resolvedPrefetch = isManagedLocalHref ? (prefetch ?? false) : prefetch;
  const shouldUseManagedScroll = isManagedLocalHref;
  const resolvedScroll = scroll ?? (shouldUseManagedScroll ? false : undefined);
  const resolvedTabIndex = disabled ? -1 : tabIndex;
  const resolvedAriaDisabled = disabled ? 'true' : ariaDisabledProp;
  const hasIntentPrefetchedRef = useRef(false);
  const shouldManualPrefetchManagedHref =
    managedLocalHref !== null && prefetch !== false && !disabled && !isCoarsePointer;
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
  const prefetchManagedHrefOnIntent = useCallback((): void => {
    if (!shouldManualPrefetchManagedHref || hasIntentPrefetchedRef.current || managedLocalHref === null) {
      return;
    }

    hasIntentPrefetchedRef.current = true;
    routeNavigator.prefetch(managedLocalHref);
  }, [managedLocalHref, routeNavigator, shouldManualPrefetchManagedHref]);

  useEffect(() => {
    hasIntentPrefetchedRef.current = false;
  }, [disabled, href, isCoarsePointer, prefetch, renderedHref]);

  const publishPendingSnapshot = useCallback((): void => {
    if (managedLocalHref === null || typeof renderedHref !== 'string') {
      return;
    }

    const targetBasePath = resolveManagedKangurBasePath(renderedHref);
    const accessibleResolvedPageKey = resolveManagedTargetPageKey({
      basePath: targetBasePath,
      fallbackPageKey: currentAccessiblePageKey,
      href: renderedHref,
      pageKey: targetPageKey,
    });

    setKangurPendingRouteLoadingSnapshot({
      fromHref: pathname,
      href: renderedHref,
      pageKey: accessibleResolvedPageKey ?? null,
      skeletonVariant: resolveTransitionSkeletonVariant({
        basePath: targetBasePath,
        href: renderedHref,
        pageKey: accessibleResolvedPageKey ?? null,
      }),
      startedAt: Date.now(),
      topBarHeightCssValue: readKangurTopBarHeightCssValue(),
    });
  }, [
    currentAccessiblePageKey,
    managedLocalHref,
    pathname,
    renderedHref,
    targetPageKey,
    resolveManagedTargetPageKey,
    resolveTransitionSkeletonVariant,
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
      onFocus={(event) => {
        prefetchManagedHrefOnIntent();
        onFocus?.(event);
      }}
      onMouseEnter={(event) => {
        prefetchManagedHrefOnIntent();
        onMouseEnter?.(event);
      }}
      onPointerDownCapture={(event) => {
        if (event.button !== 0) {
          return;
        }

        prefetchManagedHrefOnIntent();
      }}
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
