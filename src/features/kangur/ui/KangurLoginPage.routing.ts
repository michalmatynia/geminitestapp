import {
  getKangurHomeHref,
} from '@/features/kangur/config/routing';
import {
  resolveRouteAwareManagedKangurHref,
} from '@/features/kangur/ui/routing/managed-paths';
import {
  parseKangurAuthMode,
} from '@/features/kangur/shared/contracts/kangur-auth';
import {
  KANGUR_PARENT_AUTH_MODE_PARAM,
} from '@/features/kangur/ui/login-page/login-constants';
import type { KangurLoginPageProps } from '@/features/kangur/ui/login-page/login-context';

export type KangurLoginPageComponentProps = Omit<
  KangurLoginPageProps,
  'defaultCallbackUrl'
> & {
  defaultCallbackUrl?: string;
};

type KangurLoginPageSearchParamsLike = Pick<URLSearchParams, 'get'> | null;

type KangurLoginPageRouting = {
  basePath?: string | null | undefined;
} | null | undefined;

type KangurLoginPageSanitizeManagedHref = (input: {
  href: string | null | undefined;
  pathname: string | null;
  currentOrigin: string | null;
  basePath: string | null | undefined;
  fallbackHref: string;
}) => string | null | undefined;

const resolveKangurLoginPageCurrentOrigin = (): string | null =>
  typeof window === 'undefined' ? null : window.location.origin;

const resolveKangurLoginPageBasePath = (
  routing: KangurLoginPageRouting
): string | undefined => routing?.basePath ?? undefined;

export const resolveKangurLoginPageRouteAwareDefaultCallbackUrl = ({
  canonicalizePublicAlias,
  pathname,
  routing,
}: {
  canonicalizePublicAlias: boolean;
  pathname: string | null;
  routing: KangurLoginPageRouting;
}): string =>
  resolveRouteAwareManagedKangurHref({
    href: getKangurHomeHref(resolveKangurLoginPageBasePath(routing)),
    pathname,
    currentOrigin: resolveKangurLoginPageCurrentOrigin(),
    canonicalizePublicAlias,
  }) ?? getKangurHomeHref(resolveKangurLoginPageBasePath(routing));

const resolveKangurLoginPageDefaultCallbackUrl = ({
  pathname,
  props,
  routeAwareDefaultCallbackUrl,
  routing,
  sanitizeManagedHref,
}: {
  pathname: string | null;
  props: KangurLoginPageComponentProps;
  routeAwareDefaultCallbackUrl: string;
  routing: KangurLoginPageRouting;
  sanitizeManagedHref: KangurLoginPageSanitizeManagedHref;
}): string =>
  sanitizeManagedHref({
    href: props.defaultCallbackUrl ?? routeAwareDefaultCallbackUrl,
    pathname,
    currentOrigin: null,
    basePath: resolveKangurLoginPageBasePath(routing),
    fallbackHref: routeAwareDefaultCallbackUrl,
  }) ?? routeAwareDefaultCallbackUrl;

const resolveKangurLoginPageCallbackUrl = ({
  props,
  searchParams,
}: {
  props: KangurLoginPageComponentProps;
  searchParams: KangurLoginPageSearchParamsLike;
}): string | undefined => props.callbackUrl ?? searchParams?.get('callbackUrl') ?? undefined;

const resolveKangurLoginPageParentAuthMode = ({
  props,
  searchParams,
}: {
  props: KangurLoginPageComponentProps;
  searchParams: KangurLoginPageSearchParamsLike;
}): KangurLoginPageProps['parentAuthMode'] =>
  props.parentAuthMode ??
  parseKangurAuthMode(searchParams?.get(KANGUR_PARENT_AUTH_MODE_PARAM), 'sign-in');

export const resolveKangurLoginPageContextValue = ({
  pathname,
  props,
  routeAwareDefaultCallbackUrl,
  routing,
  sanitizeManagedHref,
  searchParams,
}: {
  pathname: string | null;
  props: KangurLoginPageComponentProps;
  routeAwareDefaultCallbackUrl: string;
  routing: KangurLoginPageRouting;
  sanitizeManagedHref: KangurLoginPageSanitizeManagedHref;
  searchParams: KangurLoginPageSearchParamsLike;
}) => {
  const defaultCallbackUrl = resolveKangurLoginPageDefaultCallbackUrl({
    pathname,
    props,
    routeAwareDefaultCallbackUrl,
    routing,
    sanitizeManagedHref,
  });
  const callbackUrl = resolveKangurLoginPageCallbackUrl({ props, searchParams });
  const parentAuthMode = resolveKangurLoginPageParentAuthMode({
    props,
    searchParams,
  });

  return {
    defaultCallbackUrl,
    callbackUrl,
    onClose: props.onClose,
    parentAuthMode,
    showParentAuthModeTabs: props.showParentAuthModeTabs,
  };
};
