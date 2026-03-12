import * as React from 'react';

import { cn } from '@/shared/utils';

import { type KangurAccent } from '../tokens';
import { KangurSectionHeading, type KangurSectionHeadingProps } from './KangurSectionHeading';

export type KangurFeatureHeaderProps = Omit<KangurSectionHeadingProps, 'layout' | 'align'> & {
  accent?: KangurAccent;
};

export function KangurFeatureHeader({
  accent = 'slate',
  className,
  iconSize = 'xl',
  ...props
}: KangurFeatureHeaderProps): React.JSX.Element {
  return (
    <KangurSectionHeading
      accent={accent}
      align='center'
      className={cn('items-center text-center', className)}
      iconSize={iconSize}
      layout='stacked'
      {...props}
    />
  );
}
