import * as React from 'react';

import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { cn } from '@/shared/utils';

import { KANGUR_PAGE_CONTAINER_CLASSNAME } from '../tokens';

export type KangurPageContainerProps = React.HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'main' | 'section';
};

export const KangurPageContainer = ({
  as: Comp = 'main',
  className,
  children,
  tabIndex,
  ...props
}: KangurPageContainerProps): React.JSX.Element => {
  const routing = useOptionalKangurRouting();
  const ResolvedComp = routing?.embedded && Comp === 'main' ? 'div' : Comp;

  return (
    <ResolvedComp
      className={cn(KANGUR_PAGE_CONTAINER_CLASSNAME, className)}
      data-kangur-route-main={Comp === 'main' ? 'true' : undefined}
      tabIndex={tabIndex ?? -1}
      {...props}
    >
      {children}
    </ResolvedComp>
  );
};
