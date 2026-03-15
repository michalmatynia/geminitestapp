import * as React from 'react';

import { cn } from '@/features/kangur/utils/cn';

export const KANGUR_SECTION_EYEBROW_CLASSNAMES = {
  muted: '[color:var(--kangur-page-muted-text)]',
  slate: '[color:var(--kangur-page-muted-text)]',
} as const;

export type KangurSectionEyebrowProps = React.HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'p' | 'span';
  tone?: keyof typeof KANGUR_SECTION_EYEBROW_CLASSNAMES;
};

export function KangurSectionEyebrow({
  as: Comp = 'div',
  className,
  tone = 'muted',
  ...props
}: KangurSectionEyebrowProps): React.JSX.Element {
  return (
    <Comp
      className={cn(
        'break-words text-[11px] font-bold uppercase tracking-[0.22em]',
        KANGUR_SECTION_EYEBROW_CLASSNAMES[tone],
        className
      )}
      {...props}
    />
  );
}
