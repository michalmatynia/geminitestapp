import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

import { KANGUR_ACCENT_THEME_VARS } from '../tokens';

const buildSurfaceAccentClassName = (
  accent: keyof typeof KANGUR_ACCENT_THEME_VARS,
  legacyBorderClassName: string
): string =>
  cn(
    legacyBorderClassName,
    `[--kangur-panel-surface-border:color-mix(in_srgb,var(--kangur-glass-panel-border)_56%,${KANGUR_ACCENT_THEME_VARS[accent].end})]`,
    '[color:var(--kangur-page-text)]'
  );

export const kangurSurfacePanelVariants = cva('glass-panel kangur-panel-soft rounded-[34px]', {
  variants: {
    accent: {
      indigo: buildSurfaceAccentClassName('indigo', 'border-indigo-200/70'),
      violet: buildSurfaceAccentClassName('violet', 'border-violet-200/80'),
      emerald: buildSurfaceAccentClassName('emerald', 'border-emerald-200/80'),
      sky: buildSurfaceAccentClassName('sky', 'border-sky-200/80'),
      amber: buildSurfaceAccentClassName('amber', 'border-amber-200/80'),
      rose: buildSurfaceAccentClassName('rose', 'border-rose-200/80'),
      teal: buildSurfaceAccentClassName('teal', 'border-teal-200/80'),
      slate: 'border-slate-200/85 [--kangur-panel-surface-border:var(--kangur-soft-card-border)] [color:var(--kangur-page-text)]',
    },
    padding: {
      md: 'kangur-panel-padding-md',
      lg: 'kangur-panel-padding-lg',
      xl: 'kangur-panel-padding-xl',
    },
    fillHeight: {
      true: 'flex h-full flex-col',
      false: '',
    },
  },
  defaultVariants: {
    accent: 'slate',
    padding: 'lg',
    fillHeight: false,
  },
});

export type KangurSurfacePanelProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof kangurSurfacePanelVariants>;

export const KangurSurfacePanel = React.forwardRef<HTMLDivElement, KangurSurfacePanelProps>(
  ({ accent, className, fillHeight, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        kangurSurfacePanelVariants({ accent, fillHeight, padding }),
        'kangur-panel-shell',
        className
      )}
      {...props}
    />
  )
);
KangurSurfacePanel.displayName = 'KangurSurfacePanel';
