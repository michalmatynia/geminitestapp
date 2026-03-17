import { type ReactNode, type ReactElement } from 'react';

import { Badge, Card } from '@/features/kangur/shared/ui';
import { cn } from '@/features/kangur/shared/utils';

type SettingsChoiceCardProps = {
  htmlFor: string;
  checked: boolean;
  title: string;
  description: string;
  children: ReactNode;
  hint?: string;
  className?: string;
};

export function SettingsChoiceCard({
  htmlFor,
  checked,
  title,
  description,
  children,
  hint,
  className,
}: SettingsChoiceCardProps): ReactElement {
  const cardSelectionClassName = checked
    ? 'border-primary/30 bg-card shadow-sm ring-1 ring-primary/15'
    : 'hover:border-border hover:bg-card/60';
  const selectionBadgeVariant = checked ? 'secondary' : 'outline';
  const cardClassName = cn(
    'h-full rounded-2xl border-border/60 bg-card/40 transition-all',
    cardSelectionClassName,
    className
  );

  return (
    <label htmlFor={htmlFor} className='block cursor-pointer'>
      <Card variant='subtle' padding='md' className={cardClassName}>
        <div className='flex items-start justify-between gap-4'>
          <div className='flex min-w-0 items-start gap-3'>
            <div className='mt-0.5 shrink-0'>{children}</div>
            <div className='min-w-0'>
              <div className='text-sm font-semibold text-foreground'>{title}</div>
              <p className='mt-1 text-sm text-muted-foreground'>{description}</p>
            </div>
          </div>
          <Badge variant={selectionBadgeVariant}>
            {checked ? 'Selected' : 'Option'}
          </Badge>
        </div>
        {hint ? <p className='mt-3 text-xs leading-relaxed text-muted-foreground'>{hint}</p> : null}
      </Card>
    </label>
  );
}
