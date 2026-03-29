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

type KangurTransitionLinkState = {
  managedLocalHref: string | null;
  renderedHref: React.ComponentProps<typeof NextLink>['href'];
  resolvedPrefetch: React.ComponentProps<typeof NextLink>['prefetch'];
  resolvedScroll: React.ComponentProps<typeof NextLink>['scroll'];
  resolvedTabIndex: number | undefined;
  resolvedAriaDisabled: React.AriaAttributes['aria-disabled'];
  shouldManualPrefetchManagedHref: boolean;
};

const hasBlockedTransitionModifiers = (event: MouseEvent<HTMLAnchorElement>): boolean =>
  event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

const isManagedTransitionHref = (
  href: React.ComponentProps<typeof NextLink>['href']
): href is string => typeof href === 'string' && href.startsWith('/') && !href.startsWith('#');

const shouldStartTransition = (
  event: MouseEvent<HTMLAnchorElement>,
  href: React.ComponentProps<typeof NextLink>['href'],
  target?: string
): href is string => {
  if (event.defaultPrevented) {
    return false;
  }

  if (hasBlockedTransitionModifiers(event)) {
    return false;
  }

  if (target === '_blank') {
    return false;
  }

  return isManagedTransitionHref(href);
};

const resolveManagedLocalHref = (
  href: React.ComponentProps<typeof NextLink>['href'],
  target: string | undefined
): string | null => (isManagedTransitionHref(href) && target !== '_blank' ? href : null);

const resolveRenderedTransitionHref = ({
  frontendPublicOwner,
  href,
  locale,
  pathname,
}: {
  frontendPublicOwner: ReturnType<typeof useOptionalFrontendPublicOwner>;
  href: string;
  locale: string;
  pathname: string;
}): React.ComponentProps<typeof NextLink>['href'] => {
  const localizedHref = localizeManagedKangurHref({
    href,
    locale,
    pathname,
  });

  return frontendPublicOwner?.publicOwner === 'kangur'
    ? canonicalizeKangurPublicAliasHref(localizedHref)
    : localizedHref;
};

const resolveTransitionLinkRenderedHref = ({
  frontendPublicOwner,
  href,
  locale,
  managedLocalHref,
  pathname,
}: {
  frontendPublicOwner: ReturnType<typeof useOptionalFrontendPublicOwner>;
  href: React.ComponentProps<typeof NextLink>['href'];
  locale: string;
  managedLocalHref: string | null;
  pathname: string;
}): React.ComponentProps<typeof NextLink>['href'] => {
  if (managedLocalHref === null) {
    return href;
  }

  return resolveRenderedTransitionHref({
    frontendPublicOwner,
    href: managedLocalHref,
    locale,
    pathname,
  });
};

const resolveTransitionLinkPrefetch = ({
  managedLocalHref,
  prefetch,
}: {
  managedLocalHref: string | null;
  prefetch: React.ComponentProps<typeof NextLink>['prefetch'];
}): React.ComponentProps<typeof NextLink>['prefetch'] =>
  managedLocalHref !== null ? (prefetch ?? false) : prefetch;

const resolveTransitionLinkScroll = ({
  managedLocalHref,
  scroll,
}: {
  managedLocalHref: string | null;
  scroll: React.ComponentProps<typeof NextLink>['scroll'];
}): React.ComponentProps<typeof NextLink>['scroll'] =>
  scroll ?? (managedLocalHref !== null ? false : undefined);

const resolveTransitionLinkTabIndex = ({
  disabled,
  tabIndex,
}: {
  disabled: boolean;
  tabIndex: number | undefined;
}): number | undefined => (disabled ? -1 : tabIndex);

const resolveTransitionLinkAriaDisabled = ({
  ariaDisabledProp,
  disabled,
}: {
  ariaDisabledProp: React.AriaAttributes['aria-disabled'];
  disabled: boolean;
}): React.AriaAttributes['aria-disabled'] => (disabled ? 'true' : ariaDisabledProp);

const resolveKangurTransitionLinkState = ({
  ariaDisabledProp,
  disabled,
  frontendPublicOwner,
  href,
  isCoarsePointer,
  locale,
  pathname,
  prefetch,
  scroll,
  tabIndex,
  target,
}: {
  ariaDisabledProp: React.AriaAttributes['aria-disabled'];
  disabled: boolean;
  frontendPublicOwner: ReturnType<typeof useOptionalFrontendPublicOwner>;
  href: React.ComponentProps<typeof NextLink>['href'];
  isCoarsePointer: boolean;
  locale: string;
  pathname: string;
  prefetch: React.ComponentProps<typeof NextLink>['prefetch'];
  scroll: React.ComponentProps<typeof NextLink>['scroll'];
  tabIndex: number | undefined;
  target: string | undefined;
}): KangurTransitionLinkState => {
  const managedLocalHref = resolveManagedLocalHref(href, target);
  const isManagedLocalHref = managedLocalHref !== null;
  const shouldManualPrefetchManagedHref =
    isManagedLocalHref && prefetch !== false && !disabled && !isCoarsePointer;

  return {
    managedLocalHref,
    renderedHref: resolveTransitionLinkRenderedHref({
      frontendPublicOwner,
      href,
      locale,
      managedLocalHref,
      pathname,
    }),
    resolvedPrefetch: resolveTransitionLinkPrefetch({
      managedLocalHref,
      prefetch,
    }),
    resolvedScroll: resolveTransitionLinkScroll({
      managedLocalHref,
      scroll,
    }),
    resolvedTabIndex: resolveTransitionLinkTabIndex({
      disabled,
      tabIndex,
    }),
    resolvedAriaDisabled: resolveTransitionLinkAriaDisabled({
      ariaDisabledProp,
      disabled,
    }),
    shouldManualPrefetchManagedHref,
  };
};

const resolveTransitionPushOptions = ({
  resolvedScroll,
  targetPageKey,
  transitionAcknowledgeMs,
  transitionSourceId,
}: {
  resolvedScroll: React.ComponentProps<typeof NextLink>['scroll'];
  targetPageKey: string | null | undefined;
  transitionAcknowledgeMs: number | undefined;
  transitionSourceId: string | null | undefined;
}): Parameters<ReturnType<typeof useKangurRouteNavigator>['push']>[1] => ({
  ...(typeof transitionAcknowledgeMs === 'number' ? { acknowledgeMs: transitionAcknowledgeMs } : {}),
  pageKey: targetPageKey ?? null,
  scroll: resolvedScroll ?? false,
  ...(transitionSourceId ? { sourceId: transitionSourceId } : {}),
});

const stopDisabledLinkInteraction = (event: MouseEvent<HTMLAnchorElement>): void => {
  event.preventDefault();
  event.stopPropagation();
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
  const hasIntentPrefetchedRef = useRef(false);
  const {
    managedLocalHref,
    renderedHref,
    resolvedPrefetch,
    resolvedScroll,
    resolvedTabIndex,
    resolvedAriaDisabled,
    shouldManualPrefetchManagedHref,
  } = resolveKangurTransitionLinkState({
    ariaDisabledProp,
    disabled,
    frontendPublicOwner,
    href,
    isCoarsePointer,
    locale,
    pathname,
    prefetch,
    scroll,
    tabIndex,
    target,
  });

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

  const handleFocus = useCallback(
    (event: React.FocusEvent<HTMLAnchorElement>): void => {
      prefetchManagedHrefOnIntent();
      onFocus?.(event);
    },
    [onFocus, prefetchManagedHrefOnIntent]
  );

  const handleMouseEnter = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>): void => {
      prefetchManagedHrefOnIntent();
      onMouseEnter?.(event);
    },
    [onMouseEnter, prefetchManagedHrefOnIntent]
  );

  const handlePointerDownCapture = useCallback(
    (event: React.PointerEvent<HTMLAnchorElement>): void => {
      if (event.button !== 0) {
        return;
      }

      prefetchManagedHrefOnIntent();
    },
    [prefetchManagedHrefOnIntent]
  );

  const handleClickCapture = useCallback(
    (event: MouseEvent<HTMLAnchorElement>): void => {
      if (disabled) {
        stopDisabledLinkInteraction(event);
        return;
      }

      if (!shouldStartTransition(event, href, target)) {
        return;
      }

      publishPendingSnapshot();
      event.preventDefault();
      routeNavigator.push(
        href,
        resolveTransitionPushOptions({
          resolvedScroll,
          targetPageKey,
          transitionAcknowledgeMs,
          transitionSourceId,
        })
      );
    },
    [
      disabled,
      href,
      publishPendingSnapshot,
      resolvedScroll,
      routeNavigator,
      target,
      targetPageKey,
      transitionAcknowledgeMs,
      transitionSourceId,
    ]
  );

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>): void => {
      if (disabled) {
        stopDisabledLinkInteraction(event);
        return;
      }

      onClick?.(event);

      if (!shouldStartTransition(event, href, target)) {
        return;
      }
    },
    [disabled, href, onClick, target]
  );

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
      onFocus={handleFocus}
      onMouseEnter={handleMouseEnter}
      onPointerDownCapture={handlePointerDownCapture}
      onClickCapture={handleClickCapture}
      onClick={handleClick}
      {...props}
    />
  );
}
