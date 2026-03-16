import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

import { KANGUR_TOP_NAV_GROUP_CLASSNAME } from '../tokens';

export type KangurTopNavGroupProps = React.HTMLAttributes<HTMLElement> & {
  label?: string;
};

export const KangurTopNavGroup = ({
  label = 'Główna nawigacja Kangur',
  className,
  children,
  ...props
}: KangurTopNavGroupProps): React.JSX.Element => (
  <nav aria-label={label} className={cn(KANGUR_TOP_NAV_GROUP_CLASSNAME, className)} {...props}>
    {children}
  </nav>
);
