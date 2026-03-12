import * as React from 'react';

import { cn } from '@/shared/utils';

import { KANGUR_ACCENT_STYLES, type KangurAccent } from '../tokens';

type KangurSectionEyebrowTone = 'muted' | KangurAccent;

const KANGUR_SECTION_EYEBROW_TONE_CLASSNAMES: Record<KangurSectionEyebrowTone, string> = {
  muted: '[color:var(--kangur-page-muted-text)]',
  slate: 'text-slate-500',
  amber: 'text-amber-900',
  indigo: KANGUR_ACCENT_STYLES.indigo.activeText,
  violet: KANGUR_ACCENT_STYLES.violet.activeText,
  emerald: KANGUR_ACCENT_STYLES.emerald.activeText,
  sky: KANGUR_ACCENT_STYLES.sky.activeText,
  rose: KANGUR_ACCENT_STYLES.rose.activeText,
  teal: KANGUR_ACCENT_STYLES.teal.activeText,
};

export type KangurSectionEyebrowProps = React.HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'p' | 'span';
  tone?: KangurSectionEyebrowTone;
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
        'text-[11px] font-bold uppercase tracking-[0.14em]',
        KANGUR_SECTION_EYEBROW_TONE_CLASSNAMES[tone],
        className
      )}
      {...props}
    />
  );
}
