import React from 'react';

import { Button } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

type ButtonComponentProps = React.ComponentProps<typeof Button>;

export interface StudioActionButtonConfig {
  key: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  size?: ButtonComponentProps['size'];
  variant?: ButtonComponentProps['variant'];
  type?: ButtonComponentProps['type'];
  className?: string;
  title?: string;
  ariaLabel?: string;
  icon?: React.ReactNode;
}

interface StudioActionButtonRowProps {
  actions: StudioActionButtonConfig[];
  className?: string;
}

export function StudioActionButtonRow({
  actions,
  className,
}: StudioActionButtonRowProps): React.JSX.Element {
  return (
    <div className={cn('flex flex-wrap items-center justify-end gap-2', className)}>
      {actions.map((action) => (
        <Button
          key={action.key}
          type={action.type ?? 'button'}
          size={action.size ?? 'sm'}
          variant={action.variant ?? 'outline'}
          onClick={action.onClick}
          disabled={action.disabled}
          loading={action.loading}
          loadingText={action.loadingText ?? action.label}
          className={action.className}
          title={action.title}
          aria-label={action.ariaLabel}
        >
          {action.icon !== undefined && action.icon !== null ? (
            <span className='mr-2'>{action.icon}</span>
          ) : null}
          {action.label}
        </Button>
      ))}
    </div>
  );
}
