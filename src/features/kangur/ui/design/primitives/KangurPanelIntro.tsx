import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';
import { KANGUR_STACK_COMPACT_CLASSNAME } from '@/features/kangur/ui/design/tokens';

import {
  KangurSectionEyebrow,
  type KANGUR_SECTION_EYEBROW_CLASSNAMES,
} from './KangurSectionEyebrow';

export type KangurPanelIntroProps = React.HTMLAttributes<HTMLDivElement> & {
  description?: React.ReactNode;
  descriptionClassName?: string;
  eyebrow?: React.ReactNode;
  eyebrowClassName?: string;
  eyebrowTone?: keyof typeof KANGUR_SECTION_EYEBROW_CLASSNAMES;
  title?: React.ReactNode;
  titleAs?: 'div' | 'h2' | 'h3' | 'p';
  titleClassName?: string;
};

export function KangurPanelIntro(props: KangurPanelIntroProps): React.JSX.Element {
  const {
    className,
    description,
    descriptionClassName,
    eyebrow,
    eyebrowClassName,
    eyebrowTone = 'muted',
    title,
    titleAs: TitleComp = 'div',
    titleClassName,
    ...restProps
  } = props;

  return (
    <div className={cn(KANGUR_STACK_COMPACT_CLASSNAME, className)} {...restProps}>
      {eyebrow ? (
        <KangurSectionEyebrow className={eyebrowClassName} tone={eyebrowTone}>
          {eyebrow}
        </KangurSectionEyebrow>
      ) : null}
      {title ? (
        <TitleComp
          className={cn(
            'break-words font-semibold [color:var(--kangur-page-text)]',
            titleClassName
          )}
        >
          {title}
        </TitleComp>
      ) : null}
      {description ? (
        <div
          className={cn(
            'break-words text-sm [color:var(--kangur-page-muted-text)]',
            descriptionClassName
          )}
        >
          {description}
        </div>
      ) : null}
    </div>
  );
}
