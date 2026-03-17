import type * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

import { KANGUR_PANEL_GAP_CLASSNAME } from '../tokens';
import type { KangurPanelProps } from './KangurPanelTypes';

export function KangurPanelStack({
  className,
  ...props
}: KangurPanelProps): React.JSX.Element {
  return (
    <div
      className={cn('flex min-w-0 flex-col', KANGUR_PANEL_GAP_CLASSNAME, className)}
      {...props}
    />
  );
}
