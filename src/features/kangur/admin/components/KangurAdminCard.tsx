import type { ReactNode } from 'react';

import { Card, type CardProps } from '@/features/kangur/shared/ui';
import { cn } from '@/features/kangur/utils/cn';

export const KANGUR_ADMIN_CARD_CLASS_NAME = 'rounded-2xl border-border/60 bg-card/40 shadow-sm';
export const KANGUR_ADMIN_INSET_CARD_CLASS_NAME =
  'rounded-2xl border-border/60 bg-background/60 shadow-sm';

type KangurAdminCardHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
  descriptionClassName?: string;
  titleAs?: 'div' | 'h2' | 'h3';
  titleClassName?: string;
};

export function KangurAdminCard({
  className,
  padding = 'md',
  variant = 'subtle',
  ...props
}: CardProps): React.JSX.Element {
  return (
    <Card
      variant={variant}
      padding={padding}
      className={cn(KANGUR_ADMIN_CARD_CLASS_NAME, className)}
      {...props}
    />
  );
}

export function KangurAdminInsetCard({
  className,
  padding = 'md',
  variant = 'subtle',
  ...props
}: CardProps): React.JSX.Element {
  return (
    <Card
      variant={variant}
      padding={padding}
      className={cn(KANGUR_ADMIN_INSET_CARD_CLASS_NAME, className)}
      {...props}
    />
  );
}

export function KangurAdminCardHeader({
  title,
  description,
  badge,
  actions,
  className,
  contentClassName,
  descriptionClassName,
  titleAs = 'h3',
  titleClassName,
}: KangurAdminCardHeaderProps): React.JSX.Element {
  const TitleTag = titleAs;

  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className={cn('min-w-0 flex-1', contentClassName)}>
        <div className='flex flex-wrap items-center gap-2'>
          <TitleTag className={cn('text-sm font-semibold text-foreground', titleClassName)}>
            {title}
          </TitleTag>
          {badge}
        </div>
        {description ? (
          <p
            className={cn(
              'mt-1.5 text-sm leading-relaxed text-muted-foreground',
              descriptionClassName
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className='shrink-0'>{actions}</div> : null}
    </div>
  );
}
