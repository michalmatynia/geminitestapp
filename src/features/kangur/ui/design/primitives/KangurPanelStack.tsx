import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

import { KANGUR_PANEL_GAP_CLASSNAME } from '../tokens';

export type KangurPanelStackProps = React.HTMLAttributes<HTMLDivElement>;

export function KangurPanelStack({
  className,
  ...props
}: KangurPanelStackProps): React.JSX.Element {
  return (
    <div
      className={cn('flex min-w-0 flex-col', KANGUR_PANEL_GAP_CLASSNAME, className)}
      {...props}
    />
  );
}
