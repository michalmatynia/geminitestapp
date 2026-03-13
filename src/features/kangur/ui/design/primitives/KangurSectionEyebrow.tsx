import * as React from 'react';

import { cn } from '@/shared/utils';

export const KANGUR_SECTION_EYEBROW_CLASSNAMES = {
  muted: '[color:var(--kangur-page-muted-text)]',
  slate: 'text-slate-500',
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
        'text-[11px] font-bold uppercase tracking-[0.22em]',
        KANGUR_SECTION_EYEBROW_CLASSNAMES[tone],
        className
      )}
      {...props}
    />
  );
}
