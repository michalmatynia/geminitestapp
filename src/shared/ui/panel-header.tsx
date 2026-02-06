import { cn } from '@/shared/utils';

import type { ReactNode } from 'react';

export type PanelHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  actionsClassName?: string;
};

export function PanelHeader({
  title,
  subtitle,
  actions,
  className,
  titleClassName,
  subtitleClassName,
  actionsClassName,
}: PanelHeaderProps): React.JSX.Element {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <div className="min-w-0">
        <div className={cn('text-sm font-semibold text-white', titleClassName)}>{title}</div>
        {subtitle ? (
          <div className={cn('text-xs text-gray-400', subtitleClassName)}>{subtitle}</div>
        ) : null}
      </div>
      {actions ? (
        <div className={cn('flex items-center gap-2', actionsClassName)}>{actions}</div>
      ) : null}
    </div>
  );
}
