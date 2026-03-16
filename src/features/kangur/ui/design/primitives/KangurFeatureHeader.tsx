import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

import { type KangurAccent } from '../tokens';
import { KangurSectionHeading, type KangurSectionHeadingProps } from './KangurSectionHeading';

export type KangurFeatureHeaderProps = Omit<KangurSectionHeadingProps, 'layout' | 'align'> & {
  accent?: KangurAccent;
};

export function KangurFeatureHeader(
  props: KangurFeatureHeaderProps
): React.JSX.Element {
  const { accent = 'slate', className, iconSize = 'xl', ...restProps } = props;

  return (
    <KangurSectionHeading
      accent={accent}
      align='center'
      className={cn('items-center text-center', className)}
      iconSize={iconSize}
      layout='stacked'
      {...restProps}
    />
  );
}
