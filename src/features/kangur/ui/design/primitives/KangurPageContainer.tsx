import * as React from 'react';

import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { cn } from '@/shared/utils';

import { KANGUR_PAGE_CONTAINER_CLASSNAME } from '../tokens';

export type KangurPageContainerProps = React.HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'main' | 'section';
  'data-kangur-route-main'?: boolean | 'true' | 'false';
};

export const KangurPageContainer = ({
  as: Comp = 'main',
  className,
  children,
  tabIndex,
  role,
  ...props
}: KangurPageContainerProps): React.JSX.Element => {
  const routing = useOptionalKangurRouting();
  const ResolvedComp = routing?.embedded && Comp === 'main' ? 'div' : Comp;
  const explicitRouteMain =
    props['data-kangur-route-main'] === 'true' || props['data-kangur-route-main'] === true;
  const shouldMarkMain = Comp === 'main' || explicitRouteMain;
  const resolvedRole =
    role ?? (shouldMarkMain && ResolvedComp !== 'main' ? 'main' : undefined);

  return (
    <ResolvedComp
      className={cn(KANGUR_PAGE_CONTAINER_CLASSNAME, className)}
      data-kangur-route-main={shouldMarkMain ? 'true' : undefined}
      tabIndex={tabIndex ?? -1}
      role={resolvedRole}
      {...props}
    >
      {children}
    </ResolvedComp>
  );
};
