'use client';

import * as React from 'react';

import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { cn } from '@/features/kangur/shared/utils';

import { KANGUR_PAGE_CONTAINER_CLASSNAME } from '../tokens';

export type KangurPageContainerProps = React.HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'main' | 'section';
  embeddedOverride?: boolean | null;
  'data-kangur-route-main'?: boolean | 'true' | 'false';
};

export const KANGUR_MAIN_CONTENT_ID = 'kangur-main-content';

const KangurMainRoleContext = React.createContext<boolean>(false);

type KangurPageContainerElement = NonNullable<KangurPageContainerProps['as']>;

const resolveKangurPageContainerEmbedded = ({
  embeddedOverride,
  routingEmbedded,
}: {
  embeddedOverride?: boolean | null;
  routingEmbedded?: boolean;
}): boolean => embeddedOverride ?? routingEmbedded ?? false;

const resolveKangurPageContainerRouteMain = ({
  as,
  dataKangurRouteMain,
}: {
  as: KangurPageContainerElement;
  dataKangurRouteMain?: KangurPageContainerProps['data-kangur-route-main'];
}): boolean => as === 'main' || dataKangurRouteMain === true || dataKangurRouteMain === 'true';

const resolveKangurPageContainerComponent = ({
  as,
  suppressMainRole,
}: {
  as: KangurPageContainerElement;
  suppressMainRole: boolean;
}): KangurPageContainerElement => (suppressMainRole && as === 'main' ? 'div' : as);

const resolveKangurPageContainerRole = ({
  explicitRole,
  resolvedComponent,
  shouldMarkRouteMain,
  suppressMainRole,
}: {
  explicitRole?: string;
  resolvedComponent: KangurPageContainerElement;
  shouldMarkRouteMain: boolean;
  suppressMainRole: boolean;
}): string | undefined => {
  if (explicitRole) {
    return explicitRole;
  }

  return shouldMarkRouteMain && !suppressMainRole && resolvedComponent !== 'main' ? 'main' : undefined;
};

const resolveKangurPageContainerId = ({
  id,
  shouldMarkRouteMain,
}: {
  id?: string;
  shouldMarkRouteMain: boolean;
}): string | undefined => {
  const normalizedId = typeof id === 'string' && id.trim().length > 0 ? id : undefined;

  return normalizedId ?? (shouldMarkRouteMain ? KANGUR_MAIN_CONTENT_ID : undefined);
};

export const KangurMainRoleProvider = ({
  suppressMainRole = false,
  children,
}: {
  suppressMainRole?: boolean;
  children: React.ReactNode;
}): React.JSX.Element => (
  <KangurMainRoleContext.Provider value={suppressMainRole}>
    {children}
  </KangurMainRoleContext.Provider>
);

export const KangurPageContainer = ({
  as: Comp = 'main',
  className,
  children,
  embeddedOverride,
  tabIndex,
  role,
  id,
  ...props
}: KangurPageContainerProps): React.JSX.Element => {
  const routing = useOptionalKangurRouting();
  const suppressMainRole = React.useContext(KangurMainRoleContext);
  const effectiveEmbedded = resolveKangurPageContainerEmbedded({
    embeddedOverride,
    routingEmbedded: routing?.embedded,
  });
  const shouldSuppressMain = effectiveEmbedded || suppressMainRole;
  const shouldMarkRouteMain = resolveKangurPageContainerRouteMain({
    as: Comp,
    dataKangurRouteMain: props['data-kangur-route-main'],
  });
  const ResolvedComp = resolveKangurPageContainerComponent({
    as: Comp,
    suppressMainRole: shouldSuppressMain,
  });
  const resolvedRole = resolveKangurPageContainerRole({
    explicitRole: role,
    resolvedComponent: ResolvedComp,
    shouldMarkRouteMain,
    suppressMainRole: shouldSuppressMain,
  });
  const resolvedId = resolveKangurPageContainerId({
    id,
    shouldMarkRouteMain,
  });

  return (
    <ResolvedComp
      className={cn(KANGUR_PAGE_CONTAINER_CLASSNAME, className)}
      data-kangur-route-main={shouldMarkRouteMain ? 'true' : undefined}
      tabIndex={tabIndex ?? -1}
      role={resolvedRole}
      id={resolvedId}
      {...props}
    >
      {children}
    </ResolvedComp>
  );
};
