import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

import { KANGUR_WIDGET_TITLE_CLASSNAME } from '../tokens';
import { KangurPanelIntro, type KangurPanelIntroProps } from './KangurPanelIntro';

export type KangurWidgetIntroProps = Omit<KangurPanelIntroProps, 'titleClassName'> & {
  titleClassName?: string;
};

export function KangurWidgetIntro({
  titleAs = 'h2',
  titleClassName,
  ...props
}: KangurWidgetIntroProps): React.JSX.Element {
  return (
    <KangurPanelIntro
      titleAs={titleAs}
      titleClassName={cn(KANGUR_WIDGET_TITLE_CLASSNAME, titleClassName)}
      {...props}
    />
  );
}
