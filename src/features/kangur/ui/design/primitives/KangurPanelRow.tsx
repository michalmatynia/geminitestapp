import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

import { KANGUR_PANEL_ROW_CLASSNAME } from '../tokens';

export type KangurPanelRowProps = React.HTMLAttributes<HTMLDivElement>;

export function KangurPanelRow({
  className,
  ...props
}: KangurPanelRowProps): React.JSX.Element {
  return (
    <div
      className={cn('min-w-0', KANGUR_PANEL_ROW_CLASSNAME, className)}
      {...props}
    />
  );
}
