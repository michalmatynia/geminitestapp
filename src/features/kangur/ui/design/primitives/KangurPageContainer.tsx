'use client';

import * as React from 'react';

import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { cn } from '@/features/kangur/shared/utils';

import { KANGUR_PAGE_CONTAINER_CLASSNAME } from '../tokens';

export type KangurPageContainerProps = React.HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'main' | 'section';
  'data-kangur-route-main'?: boolean | 'true' | 'false';
};

export const KANGUR_MAIN_CONTENT_ID = 'kangur-main-content';

const KangurMainRoleContext = React.createContext<boolean>(false);

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
  tabIndex,
  role,
  id,
  ...props
}: KangurPageContainerProps): React.JSX.Element => {
  const routing = useOptionalKangurRouting();
  const suppressMainRole = React.useContext(KangurMainRoleContext);
  const shouldSuppressMain = Boolean(routing?.embedded) || suppressMainRole;
  const shouldSuppressMainTag = shouldSuppressMain && Comp === 'main';
  const ResolvedComp = shouldSuppressMainTag ? 'div' : Comp;
  const explicitRouteMain =
    props['data-kangur-route-main'] === 'true' || props['data-kangur-route-main'] === true;
  const shouldMarkRouteMain = Comp === 'main' || explicitRouteMain;
  const shouldSetMainRole = (Comp === 'main' || explicitRouteMain) && !shouldSuppressMain;
  const resolvedRole =
    role ?? (shouldSetMainRole && ResolvedComp !== 'main' ? 'main' : undefined);
  const normalizedId = typeof id === 'string' && id.trim().length > 0 ? id : undefined;
  const resolvedId = normalizedId ?? (shouldMarkRouteMain ? KANGUR_MAIN_CONTENT_ID : undefined);

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
