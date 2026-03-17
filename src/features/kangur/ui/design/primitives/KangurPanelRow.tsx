import type * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

import { KANGUR_PANEL_ROW_CLASSNAME } from '../tokens';
import type { KangurPanelProps } from './KangurPanelTypes';

export function KangurPanelRow({
  className,
  ...props
}: KangurPanelProps): React.JSX.Element {
  return (
    <div
      className={cn('min-w-0', KANGUR_PANEL_ROW_CLASSNAME, className)}
      {...props}
    />
  );
}
