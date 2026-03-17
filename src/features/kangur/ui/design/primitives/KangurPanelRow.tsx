import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

import { KANGUR_PANEL_GAP_CLASSNAME } from '../tokens';

export type KangurPanelRowProps = React.HTMLAttributes<HTMLDivElement>;

export function KangurPanelRow({
  className,
  ...props
}: KangurPanelRowProps): React.JSX.Element {
  return (
    <div
      className={cn('flex flex-col', KANGUR_PANEL_GAP_CLASSNAME, 'sm:flex-row', className)}
      {...props}
    />
  );
}
