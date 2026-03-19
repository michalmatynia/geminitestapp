import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

import { KANGUR_ACCENT_THEME_VARS } from '../tokens';

const buildSurfaceAccentClassName = (accent: keyof typeof KANGUR_ACCENT_THEME_VARS): string =>
  cn(
    `[--kangur-panel-surface-border:color-mix(in_srgb,var(--kangur-glass-panel-border)_56%,${KANGUR_ACCENT_THEME_VARS[accent].end})]`,
    '[color:var(--kangur-page-text)]'
  );

export const kangurSurfacePanelVariants = cva('glass-panel kangur-panel-soft rounded-[34px]', {
  variants: {
    accent: {
      indigo: buildSurfaceAccentClassName('indigo'),
      violet: buildSurfaceAccentClassName('violet'),
      emerald: buildSurfaceAccentClassName('emerald'),
      sky: buildSurfaceAccentClassName('sky'),
      amber: buildSurfaceAccentClassName('amber'),
      rose: buildSurfaceAccentClassName('rose'),
      teal: buildSurfaceAccentClassName('teal'),
      slate: '[--kangur-panel-surface-border:var(--kangur-soft-card-border)] [color:var(--kangur-page-text)]',
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
